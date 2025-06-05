/**********************************************************************
 *  ToolOrchestrator
 *  -------------------------------------------------------------------
 *  1.  toolsRegistry’den (hazır instance) araçları alır.
 *  2.  initialize()  ➜  Her tool varsa async initialize() çağırır.
 *  3.  executeIntents()
 *      3.1 Intent sıralama  (priority ► confidence)
 *      3.2 Her intent için:
 *          • ana tool
 *          • retryTool   (isteğe bağlı)
 *          • fallback    (low‑conf)
 *          • koşullu tools[]   (conditions[])
 *          • nextTool    (isteğe bağlı)
 *      3.3 Sonuçları toplar, tekilleştirir, özet mesaj üretir.
 *********************************************************************/
const { v4: uuidv4 } = require("uuid");
const toolsRegistry = require("../tools");         // hazır instance’lar

class ToolOrchestrator {
    /* ----------------------------------------------------------------- */
    constructor(toolsConfig = {}) {
        /* 0)  ENABLE / DISABLE filtrele  */
        this.tools = Object.fromEntries(
            Object.entries(toolsRegistry)
                .filter(([name]) => toolsConfig[name]?.enabled !== false)
        );
        this.context_id = null;

        /* 1)  Araçları başlat (senkron constructor içinde) */
        this.initialize(toolsConfig)
            .catch(err => {             // Fatal init hatası → süreç durur
                console.error("[Orchestrator] Tool init failed:", err.message);
                throw err;
            });
    }

    /* ----------------------------------------------------------------- */
    async initialize(cfg = {}) {
        console.log("[Orchestrator] Initializing tools …");
        await Promise.all(Object.entries(this.tools).map(async ([name, tool]) => {
            if (typeof tool.initialize === "function") {
                await tool.initialize(cfg[name] || {});
                console.log(`  • ${name} initialized`);
            }
        }));
        console.log("[Orchestrator] All tools ready.");
    }

    /* ----------------------------------------------------------------- */
    async executeIntents(intents = [], ctx = {}) {
        console.log("[Orchestrator] === EXECUTION START ===");
        this.context_id = ctx.context_id || uuidv4();

        const sorted = (intents || [])
            .filter((i) => i && i.confidence >= 0.15)
            .sort((a, b) => (a.priority - b.priority) || (b.confidence - a.confidence));

        if (!sorted.length) {
            console.log("[Orchestrator] No valid intents – fallback to chat.");
            return this._emptyResponse("Üzgünüm, tam anlayamadım.");
        }

        const results = [];
        for (const intent of sorted) {
            console.log(`→ Intent: ${intent.intent} | tool: ${intent.tool}`);

            let res = await this._runIntentFlow(intent, ctx);
            if (res) results.push(res);

            if (intent.conditions?.length && res) {
                const condOut = await this._runConditions(intent, res, ctx);
                results.push(...condOut.filter(Boolean));
            }

            if (intent.nextTool && this._conditionSatisfied(intent.nextTool.condition, res)) {
                const nextRes = await this._execTool(intent.nextTool.tool, intent.nextTool.query, intent, ctx);
                if (nextRes) results.push(nextRes);
            }
        }

        const primary = results[0] || null;
        const response = this._composeResponse(results, primary); // Doğru metod: _composeResponse
        console.log("[Orchestrator] === EXECUTION END ===");
        return response;
    }

    /* =================================================================
       =============          Ö Z E L   Y A R D I M C I L A R      ======
       ================================================================= */

    /* ana tool  +  retry + fallback */
    async _runIntentFlow(intent, ctx) {
        /* ana tool */
        let out = await this._execTool(intent.tool, intent.query, intent, ctx);

        /* retryTool döngüsü */
        if ((!out || out.error) && intent.retryTool) {
            console.log(`  ↻ retryTool: ${intent.retryTool.tool}`);
            for (let n = 0; n < intent.retryTool.maxRetries; n++) {
                out = await this._execTool(intent.retryTool.tool,
                    intent.retryTool.query, intent, ctx);
                if (out && !out.error) break;
            }
        }

        /* fallback */
        if ((!out || out.error) && intent.confidence < 0.4 && intent.fallback?.tool) {
            console.log(`  ↘ fallback: ${intent.fallback.tool}`);
            out = await this._execTool(intent.fallback.tool,
                intent.fallback.query, intent, ctx);
        }

        return out;
    }

    /* koşullu paralel çağrılar */
    async _runConditions(intent, baseResult, ctx) {
        return Promise.all(
            intent.conditions
                .filter(c => this._conditionSatisfied(c.condition, baseResult))
                .map(c => this._execTool(c.tool, c.query, intent, { ...ctx, params: c.params }))
        );
    }

    /* simple rule‑engine – güncelle */
    _conditionSatisfied(cond, res) {
        switch (cond) {
            case "no_product":
                return !(res?.products?.length);
            case "price_exceeds":
                return res?.products?.some((p) => p.price > 1000);
            case "no_supplier":
                return !(res?.suppliers?.length);
            case "proposal_needed":
                return res?.suppliers?.length > 0;
            case "suppliers_found":
                return res?.suppliers?.length > 0;
            default:
                return false;
        }
    }

    /* Tool çağrısı  */
    async _execTool(name, query, intent, ctx) {
        if (!name) {
            console.log(`  • Skipping execution for null tool (intent: ${intent.intent})`);
            return { message: "Genel sohbet için araç gerekmiyor.", products: [], services: [] };
        }
        const tool = this.tools[name];
        if (!tool) {
            console.warn(`  ⚠ Tool missing: ${name}`);
            return null;
        }
        try {
            console.log(`  • exec ${name}`);
            return await tool.execute({
                query: query || "",
                related_id: intent.related_id || null,
                intent,
                context: ctx,
            });
        } catch (e) {
            console.error(`  ✖ ${name} error:`, e.message);
            return { error: true };
        }
    }

    /* Yanıt birleştirici  */
    _composeResponse(results, primary) {
        const resp = {
            version: "1.0",
            context_id: this.context_id,
            messages: [],
            action: "respond",
            products: [],
            system_message: ""
        };

        if (primary?.message) {
            resp.messages.push({
                role: "assistant", content: primary.message,
                timestamp: new Date().toISOString()
            });
        }
        for (const r of results) {
            if (r?.products) resp.products.push(...r.products);
        }
        /* benzersiz + limit (5) */
        resp.products = [...new Map(resp.products.map(p => [p.id, p])).values()].slice(0, 5);

        if (!resp.messages.length) {
            resp.messages.push({
                role: "assistant",
                content: resp.products.length
                    ? `${resp.products.length} ürün buldum.`
                    : "Size nasıl yardımcı olabilirim?",
                timestamp: new Date().toISOString()
            });
        }
        return resp;
    }

    /* Boş fallback yanıtı */
    _emptyResponse(text) {
        return {
            version: "1.0",
            context_id: this.context_id,
            messages: [{
                role: "assistant", content: text, timestamp: new Date().toISOString()
            }],
            action: "respond",
            products: [],
            services: [],
            system_message: ""
        };
    }
}

module.exports = { ToolOrchestrator };
