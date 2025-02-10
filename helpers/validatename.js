// helpers/validateFolderPath.js

/**
 * Kullanıcı tarafından sağlanan klasör yolunun güvenli olup olmadığını kontrol eder.
 * @param {string} name - Kullanıcı tarafından sağlanan klasör yolu.
 * @returns {boolean} - Güvenli ise true, değilse false.
 */
const validateFolderPath = (name) => {
    // İzin verilen karakterler: a-z, A-Z, 0-9, /, -, _
    const regex = /^[a-zA-Z0-9-_\/]+\/$/;
    return regex.test(name);
};
/**
 * Kullanıcı tarafından sağlanan dosya isminin güvenli olup olmadığını kontrol eder.
 * @param {string} name - Kullanıcı tarafından sağlanan klasör yolu.
 * @returns {boolean} - Güvenli ise true, değilse false.
 */
const validateNamePath = (name) => {
    // İzin verilen karakterler: a-z, A-Z, 0-9, /, -, _
    const regex = /^[a-z0-9-_]+$/;
    return regex.test(name);
};
/**
 * Kullanıcı tarafından sağlanan klasör yolunun güvenli olup olmadığını kontrol eder.
 * @param {string} name - Kullanıcı tarafından sağlanan klasör yolu.
 * @returns {boolean} - Güvenli ise true, değilse false.
 */
const validateEmailPath = (email) => {
    // İzin verilen karakterler: a-z, A-Z, 0-9, /, -, _
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
};
module.exports = { validateFolderPath, validateNamePath, validateEmailPath };
