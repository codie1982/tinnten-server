const pdf = require("pdf-parse");
const csvParser = require("csv-parser");
const mammoth = require("mammoth");
const xlsx = require("xlsx");
const { Readable } = require("stream");

class FileParser {
  static async parse(buffer, mimeType) {
    switch (mimeType) {
      case 'application/pdf':
        return await this.parsePDF(buffer);

      case 'text/plain':
        return this.parseTXT(buffer);

      case 'application/vnd.ms-excel': // .xls
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': // .xlsx
        return this.parseExcel(buffer);

      case 'application/msword': // .doc
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
        return await this.parseDOCX(buffer);

      case 'text/csv':
        return await this.parseCSV(buffer);

      default:
        throw new Error(`Desteklenmeyen MIME türü: ${mimeType}`);
    }
  }

  static async parsePDF(buffer) {
    const data = await pdf(buffer);
    return data.text;
  }

  static parseTXT(buffer) {
    return buffer.toString("utf-8");
  }

  static async parseCSV(buffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      Readable.from(buffer.toString("utf-8"))
        .pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(JSON.stringify(results, null, 2)))
        .on("error", reject);
    });
  }

  static async parseDOCX(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  static parseExcel(buffer) {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    let text = "";
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      text += json.map(row => row.join("\t")).join("\n") + "\n";
    });
    return text;
  }
}

module.exports = FileParser;