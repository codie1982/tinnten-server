class BaseDB {
    async create(data) {
        throw new Error("create() metodu implement edilmelidir.");
    }

    async read(query) {
        throw new Error("read() metodu implement edilmelidir.");
    }

    async update(query, updateData) {
        throw new Error("update() metodu implement edilmelidir.");
    }

    async delete(query) {
        throw new Error("delete() metodu implement edilmelidir.");
    }
    async recover(query) {
        throw new Error("recover() metodu implement edilmelidir.");
    }
}

module.exports = BaseDB;