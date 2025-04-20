class BaseTool {
    constructor(name) {
        this.name = name;          // "ProductDetailTool" vb.
    }

    /** Intent bu tool’a ait mi? */
    shouldHandle(/* intent */) {
        return false;              // alt sınıfta override edilir
    }

    /** Ana işlev (override) */
    async execute(/* intent, ctx */) {
        throw new Error("execute() implement edilmedi");
    }

    log(...args) {
        console.log(`[${this.name}]`, ...args);
    }
    error(...args) {
        console.error(`[${this.name}]`, ...args);
    }
}

module.exports = BaseTool;