
class ApiResponse {
    constructor() {}

    /**
     * Başarılı yanıt oluşturur.
     * @param {number} code - HTTP durum kodu.
     * @param {string} message - Yanıt mesajı.
     * @param {any} data - Yanıt verisi.
     * @returns {object} - Düzenlenmiş yanıt nesnesi.
     */
    success(code, message, data = null) {
        return {
            status: {
                code: code,
                description: 'Success'
            },
            message: message,
            data: data
        };
    }

    /**
     * Hatalı yanıt oluşturur.
     * @param {number} code - HTTP durum kodu.
     * @param {string} message - Hata mesajı.
     * @param {any} data - Hata verisi.
     * @returns {object} - Düzenlenmiş hata yanıt nesnesi.
     */
    error(code, message, data = null) {
        return {
            status: {
                code: code,
                description: 'Error'
            },
            message: message,
            data: data
        };
    }
}

module.exports = new ApiResponse();