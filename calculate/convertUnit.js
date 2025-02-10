const convertUnit = async (value, unit, requnit) => {
    return new Promise((resolve, reject) => {
        let _b = 0; // Byte'a indirgeme
        switch (unit) {
            case "b":
                _b = value;
                break;
            case "kb":
                _b = value * 1024;
                break;
            case "mb":
                _b = value * 1024 * 1024;
                break;
            case "gb":
                _b = value * 1024 * 1024 * 1024;
                break;
            default:
                return reject("Geçersiz giriş birimi.");
        }

        let result;
        switch (requnit) {
            case "b":
                result = _b;
                break;
            case "kb":
                result = _b / 1024;
                break;
            case "mb":
                result = _b / (1024 * 1024);
                break;
            case "gb":
                result = _b / (1024 * 1024 * 1024);
                break;
            default:
                return reject("Geçersiz çıkış birimi.");
        }

        resolve(result);
    });
};

module.exports = { convertUnit }