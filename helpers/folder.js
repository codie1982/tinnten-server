
/**
 * Dosya adından klasör yolunu belirler.
 * Örneğin, "Artist1 - Song1.mp3" dosya adı için "music/Artist1/" klasörünü döndürür.
 * @param {string} fileName - Yüklenen dosyanın adı.
 * @returns {string} - Klasör yolu.
 */
const SONG = "song"
const IMAGE = "image"
const VIDEO = "video"
const getFolderPath = (type, userid, filename) => {
    let folder;
    if (type == SONG) {
        folder = `${SONG}/${userid}/`;
    } else if (type == IMAGE) {
        folder = `${IMAGE}/${userid}/`;
    } else if (type == VIDEO) {
        folder = `${VIDEO}/${userid}/`;
    } else {
        folder = `others/${userid}/`;
    }
    return folder; // Belirlenemezse başka bir klasör kullan
};
const sanitizeFileName = (name) => {
    return name.replace(/[^a-zA-Z0-9-_\.]/g, '');
};
module.exports = { getFolderPath, sanitizeFileName, SONG, IMAGE, VIDEO };

