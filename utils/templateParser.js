const fs = require('fs');
const path = require('path');

function parseTemplate(templateName, content = {}) {
  return new Promise((resolve, reject) => {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.flt`);
    try {
      let template = fs.readFileSync(templatePath, 'utf8');
      /* Object.keys(content).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, content[key]);
      }); */
      
      // 🔹 İçeriği değiştir, ancak olmayan anahtarları dokunmadan bırak
      template = template.replace(/{{(\w+)}}/g, (match, key) => {
        return content.hasOwnProperty(key) ? content[key] : match; // 🔹 Eğer content içinde varsa değiştir, yoksa bırak
      });
      resolve(template.trim());
    } catch (error) {
      console.error(`❌ Şablon dosyası okunamadı: ${templateName}`, error);
      reject(error)
    }
  })
}

module.exports = { parseTemplate };