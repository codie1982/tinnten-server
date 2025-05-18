// helpers/allowedVideoMimeTypes.js

module.exports = [
    'application/pdf',                   // .pdf
    'application/msword',               // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',         // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',    // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx

    'text/plain',                       // .txt
    'application/rtf',                 // .rtf
    
    'application/vnd.oasis.opendocument.text',            // .odt
    'application/vnd.oasis.opendocument.spreadsheet',     // .ods
    'application/vnd.oasis.opendocument.presentation',    // .odp

    'application/epub+zip',            // .epub
    'application/x-iwork-keynote-sffkey',  // .key
    'application/x-iwork-numbers-sffnumbers' // .numbers
];


/**
 * Evet, bu listedeki dosyaların birçoğu programatik olarak açılabilir ve içeriği okunabilir — ancak nasıl okunduğu, dosyanın formatına ve kullanılan kütüphaneye bağlıdır. Aşağıda detaylı olarak açıklıyorum:

⸻

✅ OKUNABİLİR DOSYALAR VE OKUMA YÖNTEMLERİ

Dosya Türü	MIME Type	İçeriği Okunabilir mi?	Notlar / Node.js Kütüphaneleri
PDF	application/pdf	✅ Evet	pdf-parse, pdf-lib
DOC	application/msword	⚠️ Kısmen	mammoth, textract, officeparser
DOCX	application/vnd.openxmlformats-officedocument.wordprocessingml.document	✅ Evet	mammoth, docx4js, unzipper + xml parser
XLS/XLSX	application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	✅ Evet	xlsx, exceljs, sheetjs
PPT/PPTX	PowerPoint türleri	⚠️ Kısmen	pptx-parser, textract
TXT	text/plain	✅ Evet	fs.readFile, UTF-8 ile direkt okunabilir
RTF	application/rtf	✅ Evet	rtf-parser, textract
ODT / ODS / ODP	OpenDocument türleri	✅ Evet	unzipper + xml parser, odf
EPUB	application/epub+zip	✅ Evet	epub, epub-parser
PAGES / KEY / NUMBERS	Apple iWork dosyaları	⚠️ Zor / Mac OS gerekir	.pages dosyaları özel, genelde macOS gerekir



⸻

📦 Örnek: PDF İçeriğini Okuma (Node.js)

const fs = require('fs');
const pdfParse = require('pdf-parse');

const buffer = fs.readFileSync('example.pdf');

pdfParse(buffer).then(data => {
  console.log(data.text); // PDF içeriği buradadır
});



⸻

📄 DOCX İçeriğini Okuma (Mammoth)

const mammoth = require('mammoth');
const fs = require('fs');

const buffer = fs.readFileSync('example.docx');

mammoth.extractRawText({ buffer: buffer })
  .then(result => console.log(result.value))
  .catch(err => console.error(err));



⸻

❗ Dikkat Edilmesi Gerekenler
    •	Binary dosyalar (örneğin .doc) genellikle daha zordur; .docx gibi XML tabanlı formatlar daha kolay işlenir.
    •	Gizlilik ve güvenlik: Dosya içerikleri kullanıcı verisi taşıyabilir; analiz öncesi virüs taraması önerilir.
    •	Sunucu performansı: Büyük dosyaların işlenmesi kaynak tüketebilir, işlem süreleri loglanmalı ve async yapılmalı.

⸻

Eğer istersen, bu dosyaları upload ettikten sonra otomatik olarak içeriğini çıkaran bir servis de yazabiliriz (örneğin: “yüklenen her PDF içinden metni çıkar, arama motoruna ekle”).

İlgini çeker mi?
 */
