require("dotenv").config();
const { connectRabbitWithRetry } = require("../config/rabbitConnection");
const { connectDB } = require("../config/db");

const { ExtendTitlesAgent } = require("../agents/ExtendTitlesAgent");
// İleride başka agentlar da eklenecekse buraya tanımlayabilirsin

async function startAgentWorker() {
  connectDB();
  connectRabbitWithRetry().then(async (connection) => {
    const channel = await connection.createChannel();
    const queue = "agent_queue";
    await channel.assertQueue(queue, { durable: true });
    console.log(`🤖 Agent kuyruğu dinleniyor: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      const message = JSON.parse(msg.content.toString());
      console.log("📥 Agent mesajı geldi:", message);

      if (!message?.type || !message?.userid) {
        console.warn("❗️Eksik parametreler.");
        return channel.ack(msg);
      }

      try {
        switch (message.type) {
          case "extend_titles": {
            const agent = new ExtendTitlesAgent();
            await agent.start(message.model || "gpt-4", message.temperature || 0.4);

            const titles = await agent.find(message.user, message.content);

            // MongoDB’ye yaz (örnek: agent_results koleksiyonu)
            const AgentResult = require("../mongoModels/agentResultModel");
            await new AgentResult({
              userid: message.userid,
              type: "extend_titles",
              input: message.content,
              result: titles,
              createdAt: new Date(),
            }).save();

            console.log("✅ Agent çıktısı kaydedildi:", titles);
            break;
          }

          // 🎯 Yeni agentlar için yeni case'ler eklenebilir

          default:
            console.warn("🚫 Bilinmeyen agent türü:", message.type);
            break;
        }

        channel.ack(msg);
      } catch (error) {
        console.error("❌ Agent çalışırken hata:", error);
        channel.nack(msg, false, true);
      }
    });
  });
}

startAgentWorker();