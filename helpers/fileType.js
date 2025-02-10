const allowedSongsMimeTypes = require("../helpers/mimes/songmimes")
const allowedImageMimeTypes = require("../helpers/mimes/imagesmimes")
const allowedVideoMimeTypes = require("../helpers/mimes/videomimes")
const { SONG, IMAGE, VIDEO } = require('../helpers/folder'); // Klasör yolunu belirleme fonksiyonunu içe aktarın

const getFileType = (mimetype) => {
    if (allowedSongsMimeTypes.includes(mimetype)) {
        return SONG
    } else if (allowedVideoMimeTypes.includes(mimetype)) {
        return VIDEO
    } else if (allowedImageMimeTypes.includes(mimetype)) {
        return IMAGE
    } else {
        return null
    }
};

module.exports = { getFileType }