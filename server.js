require("dotenv").config()
require("colors")
const path = require('path');
const compression = require('compression');
const express = require("express")
const fileUpload = require('express-fileupload');
const { ObjectId } = require("mongodb");

const { connectDB } = require("./config/db")
const cookieParser = require('cookie-parser');

const { errorHandler } = require("./middleware/errorHandler")
const { keycloak, memoryStore } = require('./helpers/keycloak-config');

const { sendEmail } = require("./services/mailServices")


const authRouters = require("./routes/authRouters")
const usersRoutes = require("./routes/userRoutes")
const profilRoutes = require("./routes/profilRoutes")
const companyRouters = require("./routes/companyRouters")
const conversationRoutes = require("./routes/conversationsRouters")
const uploadRoutes = require("./routes/uploadRouters")
const systemPackagesRoutes = require("./routes/systemPackagesRoutes")
const productRouters = require("./routes/productRouters")
const servicesRouters = require("./routes/servicesRouters")
const bidRequestRouters = require("./routes/bidRequestRouters")
const bidResponseRouters = require("./routes/bidResponseRouters")
const favoriteRouters = require("./routes/favoriteRouters")
const crawlerRouters = require("./routes/crawlerRouters")

const cors = require('cors');
const { SitemapStream, streamToPromise } = require('sitemap');


const fs = require('fs');

const csv = require('csv-parser');

const ProductModel = require("./mongoModels/productsModel")
const PriceModel = require("./mongoModels/priceModel")
const GalleryModel = require("./mongoModels/galleryModel")
const ImageModel = require("./mongoModels/imagesModel")
//const App = require('../frontend/src/index.js'); // React uygulamanızı bu şekilde import edin

const bodyParser = require("body-parser");
const { default: axios } = require("axios");
const { exists } = require("./mongoModels/messageModel");
const PORT = process.env.PORT || 3000;
connectDB()
const app = express()
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true, // if you need to allow cookies or other credentials
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true })); // Form-data verisini almak için
app.use(express.static(path.join(__dirname, 'public')));
// GZIP sıkıştırmasını etkinleştir
app.use(compression());
app.use(cookieParser()); // ✅ Bu satır önemli
// Middleware
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 5 GB aws sunucusunun bir kerede max upload miktarı.
}));
app.use(keycloak.middleware());
// Session middleware'i ayarlama

//user
app.use("/api/v10/auth", authRouters)

app.use("/api/v10/users", usersRoutes)

app.use("/api/v10/profile", profilRoutes)

app.use("/api/v10/products", productRouters)

app.use("/api/v10/services", servicesRouters)

app.use("/api/v10/company", companyRouters)

app.use("/api/v10/system-packages", systemPackagesRoutes)

app.use("/api/v10/conversation", conversationRoutes)

//teklif isteme
app.use("/api/v10/bid-request", bidRequestRouters)

//teklif verme
app.use("/api/v10/bid-response", bidResponseRouters)

app.use("/api/v10/favorite", favoriteRouters)

app.use("/api/v10/upload", uploadRoutes)

app.use("/api/crawler/", crawlerRouters)

/* app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');

  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');

  const sitemap = new SitemapStream({ hostname: 'https://www.tinnten.com' });
  const pipeline = sitemap.pipe(createGzip());

  // Sitemap'e eklemek istediğiniz URL'leri buraya dinamik olarak ekleyebilirsiniz
  sitemap.write({ url: '/', changefreq: 'monthly', priority: 1.0 });
  sitemap.write({ url: '/about', changefreq: 'monthly', priority: 0.8 });
  sitemap.write({ url: '/contact', changefreq: 'monthly', priority: 0.5 });

  // Eğer veritabanından dinamik içeriklerinizi çekiyorsanız, onları da sitemap'e ekleyin.
  // Örneğin:
  /*
  const pages = await getPagesFromDatabase();
  pages.forEach(page => {
    sitemap.write({ url: page.url, changefreq: 'monthly', priority: 0.7 });
  });
  sitemap.end();
  streamToPromise(pipeline).then(sm => res.send(sm)).catch(console.error);
}); */

app.get('/images/cover', (req, res) => {
  const imagePath = path.join(__dirname, 'public/images', "cover.jpg");
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Resim gönderilirken hata oluştu:', err);
      res.status(404).send('Resim bulunamadı.');
    }
  });
});

app.post('/addproducts', async (req, res) => {
  try {


    const csvFilePath = path.join(__dirname, 'assets', 'production_info.csv');
    const results = [];
    const maxRows = 200; // İşlenecek maksimum satır sayısı (örnek için)
    const skippedRows = []; // Atlanan satırları tutmak için dizi
    const insertedProducts = []; // Eklenen ürünleri saklamak için

    const readStream = fs.createReadStream(csvFilePath);
    readStream
      .pipe(csv({ separator: ',', quote: '"' }))
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', async () => {
        console.log('CSV dosyası başarıyla işlendi.');

        // Her satırı sıralı olarak işle
        for (let i = 0; i < results.length && i < maxRows == 0 ? results.length : maxRows; i++) {
          const row = results[i];

          // Gerekli alanlar listesi
          const requiredFields = [
            "Ürün İsmi",
            "Ürün Fiyatı",
            "Ürün Resmi",
            "Meta Bilgisi",
            "Ürün Marka",
            "Ürün Açıklaması",
            "URL"
          ];

          // Eksik alanları kontrol et
          let missingFields = [];
          requiredFields.forEach(field => {
            if (!row[field] || !row[field].toString().trim()) {
              missingFields.push(field);
            }
          });
          if (missingFields.length > 0) {
            console.warn(`Satır ${i} eksik alanlara sahip: ${missingFields.join(", ")}. Atlanıyor.`);
            skippedRows.push({
              row,
              error: `Eksik alanlar: ${missingFields.join(", ")}`
            });
            continue;
          }

          const title = row["Ürün İsmi"] ? row["Ürün İsmi"].trim() : "";
          if (!title) continue;

          // Aynı başlığa sahip ürün var mı kontrolü
          /* const existingProduct = await ProductModel.findOne({ title: title });
          if (existingProduct) {
            console.log(`Duplicate product found for title "${title}". Skipping.`);
            continue;
          }
 */
          try {
            // Vektör metnini oluştur
            const vectorText = `${row["Meta Bilgisi"]} - ${row["Ürün İsmi"]} - ${row["Ürün Marka"]} - ${row["Ürün Açıklaması"]} - ${row["URL"]}`;
            const vectorResponse = await axios.post(
              process.env.EMBEDDING_URL + "/api/v10/llm/vector",
              { text: vectorText }
            );
            console.log("vectorResponse", vectorResponse.data)


            /*   // Fiyat dönüşümü
              let priceString = row["Ürün Fiyatı"] || "";
              priceString = priceString.replace(/"/g, '');
              priceString = priceString.replace('TL', '').trim().replace(',', '.');
              const originalPrice = parseFloat(priceString);
  
              if (isNaN(originalPrice)) {
                console.error(`Fiyat dönüştürülemedi: Orijinal: ${row["Ürün Fiyatı"]}, temizlenmiş: ${priceString}`);
                skippedRows.push({
                  row,
                  error: `Fiyat değeri NaN. Orijinal: ${row["Ürün Fiyatı"]}, temizlenmiş: ${priceString}`
                });
                continue;
              }
  
              // İlgili modellerden dokümanlar oluşturma
              const priceDoc = await PriceModel.create({
                originalPrice: originalPrice,
                currency: "TL"
              });
  
              const imageDoc = await ImageModel.create({
                type: 'external',
                path: row["Ürün Resmi"]
              });
  
              const galleryDoc = await GalleryModel.create({
                title: row["Ürün İsmi"],
                description: row["Ürün Açıklaması"],
                images: [imageDoc._id]
              });
  
              const productDoc = {
                title: row["Ürün İsmi"],
                meta: row["Meta Bilgisi"],
                description: row["Ürün Açıklaması"],
                categories: [],
                basePrice: [priceDoc._id],
                variants: [],
                gallery: galleryDoc._id,
                redirectUrl: [row["URL"]],
                vector: vectorResponse.data.vector
              };
  
              // Ürünü veritabanına ekle
              const newProduct = await ProductModel.create(productDoc);
              insertedProducts.push(newProduct);
              console.log(`Ürün eklendi: ${title}`); */
          } catch (err) {
            console.error(`Satır işlenirken hata oluştu (Title: ${title}):`, err.message);
            skippedRows.push({
              row,
              error: err.message
            });
          }
        }

        // Atlanan satırları dosyaya kaydet
        const skippedRowsPath = path.join(__dirname, 'skipped_rows.json');
        fs.writeFileSync(skippedRowsPath, JSON.stringify(skippedRows, null, 2));

        if (insertedProducts.length) {
          res.status(200).json({ message: 'Products added successfully', data: insertedProducts });
        } else {
          res.status(500).json({ message: 'No products were added.' });
        }
      })
      .on('error', (err) => {
        console.error('CSV dosyası işlenirken hata oluştu:', err);
        res.status(500).json({ message: 'CSV dosyası işlenirken hata oluştu' });
      });


  } catch (error) {
    console.error('Error fetching data from local network:', error);
    res.status(500).send('Error fetching data from local network');
  }


});
app.get("/fix-vectors", async (req, res) => {
  try {
    // MongoDB'den tüm dokümanları al
    const documents = await ProductModel.find();
    let exsit = documents.length;
    if (!documents.length) {
      console.log("Düzeltilecek vektör bulunamadı.");
      return res.status(404).json({ message: "Düzeltilecek vektör bulunamadı." });
    }

    for (let doc of documents) {
      let startTime = Date.now();
      console.log("Mevcut Doküman:", doc._id);

      // Eğer `vector` alanı yoksa veya array değilse, atla
      if (!doc.vector || !Array.isArray(doc.vector)) {
        console.log(`Hata: ${doc._id} dokümanında vector alanı eksik veya hatalı.`);
        continue; // Bu dokümanı atla, diğerlerini güncelle
      }
      // Vektör metnini oluştur
      const vectorText = `${doc["meta"]} - ${doc["title"]} - ${doc["description"]} - ${doc["redirectUrl"][0]}`;
      console.log("vectorText", vectorText);
      const vectorResponse = await axios.post(
        process.env.EMBEDDING_URL + "/api/v10/llm/vector",
        { text: vectorText }
      );
      let _vector = vectorResponse.data.vector;

      // MongoDB'de güncelleme yap
      const upt = await ProductModel.updateOne(
        { _id: doc._id },
        {
          $set: { vector: _vector } // Güncellenmiş düz vector
        }
      );

      if (upt.modifiedCount > 0) {
        console.log(`Başarıyla Güncellendi: ${doc._id}`);
      } else {
        console.log(`Güncelleme Yapılmadı: ${doc._id}`);
      }

      let finishTime = Date.now() - startTime;
      exsit -= 1;
      let remaindTime = finishTime * exsit;
      console.log(exsit, " adet kaldı", " - ", remaindTime, " - ", " Süre kaldı");
    }

    res.status(200).json({ message: "Düzeltme işlemi tamamlandı." });

  } catch (error) {
    console.error("Error fetching data from local network:", error);
    res.status(500).send("Error fetching data from local network");
  }
});
app.post("/test-mail", async (req, res) => {
  try {

    const send = await sendEmail("standart", "granitjeofizik@gmail.com", "Konu", { data: "mesaj" })
      .catch(() => {
        res.status(400).json({ message: "test mail gönderilmedi." });
      });

    if (send) {
      res.status(200).json({ message: "test mail gönderildi" });
    }




  } catch (error) {
    console.error("Error fetching data from local network:", error);
    res.status(500).send("Error fetching data from local network");
  }
});
// İç içe geçmiş array'leri manuel düzleştirme fonksiyonu (recursive)
function flattenArray(arr) {
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    if (Array.isArray(arr[i])) {
      // Eğer iç içe array varsa, içindeki değerleri ekle
      for (let j = 0; j < arr[i].length; j++) {
        result.push(arr[i][j]);
      }
    } else {
      // Eğer array değilse, direkt ekle
      result.push(arr[i]);
    }
  }
  return result;
}

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")))
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "../", "frontend", "build", "index.html"))
  })
} else {
  app.get("/", (req, res) => {
    res.send("Please set a production mode")
  })
  app.get("/api", (req, res) => {
    res.send("api works successfully")
  })
}

app.use(errorHandler)
app.listen(PORT, () => { console.log(`Started on Port : ${PORT}`) })