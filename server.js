require("dotenv").config()
require("colors")
const path = require('path');
const compression = require('compression');
const express = require("express")
const fileUpload = require('express-fileupload');
const { ObjectId } = require("mongodb");
const http = require('http');
const { connectDB } = require("./config/db")
const cookieParser = require('cookie-parser');



const { errorHandler } = require("./middleware/errorHandler")
const { keycloak, memoryStore } = require('./helpers/keycloak-config');
const Keycloak = require("./lib/Keycloak.js");
const { sendEmail } = require("./services/mailServices")
const { initSocket } = require('./lib/WSSocket');
const socketManager = require("./lib/SocketManager.js");

const cors = require('cors');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const fs = require('fs');
const csv = require('csv-parser');
const User = require("./mongoModels/userModel.js")


//const App = require('../frontend/src/index.js'); // React uygulamanızı bu şekilde import edin

const { default: axios } = require("axios");
const PORT = process.env.PORT || 3000;
connectDB()
const app = express()
const server = http.createServer(app);

const wss = initSocket(server);
if (!wss) {
  console.error("[server.js] WebSocket server başlatılamadı!");
  process.exit(1);
}

wss.on("connection", async (ws, req) => {
  console.log("[server.js] Yeni WebSocket bağlantısı:");
  const access_token = new URLSearchParams(req.url.split("?")[1]).get("token");

  if (!access_token) {
    console.error("[server.js] Token bulunamadı");
    ws.send(JSON.stringify({ event: "error", data: { message: "Token eksik" } }));
    ws.close(1008, "Token eksik");
    return;
  }

  try {
    const userkey = await Keycloak.getUserInfo(access_token);
    console.log("[server.js] Keycloak doğrulama başarılı:", userkey.sub);
    const user = await User.findOne({ keyid: userkey.sub });

    if (!user) {
      console.error("[server.js] Kullanıcı bulunamadı");
      ws.send(JSON.stringify({ event: "error", data: { message: "Kullanıcı bulunamadı" } }));
      ws.close(1008, "Kullanıcı bulunamadı");
      return;
    }

    const userid = user._id.toString();
    ws.userid = userid;
    ws.isAuthenticated = false;

    await socketManager.setUserSocket(userid, ws);

    console.log(`[server.js] Kullanıcı bağlandı: ${userid}`);

    ws.on("message", async (message) => {
      try {
        const { event, data: payload } = JSON.parse(message);
        console.log("[server.js] Mesaj alındı:", { event, payload, userid });

        if (event === "identify") {
          const receivedUserid = payload.userid;
          if (receivedUserid && receivedUserid === ws.userid) {
            await socketManager.updateUserAuth(userid, true);
            console.log(`[server.js] Kullanıcı doğrulandı: ${userid}`);
            ws.send(JSON.stringify({ event: "identify_success", data: { message: "Doğrulama başarılı" } }));
          } else {
            console.error("[server.js] Geçersiz userid:", { received: payload.userid, expected: ws.userid });
            ws.send(JSON.stringify({ event: "error", data: { message: "Geçersiz userid" } }));
            ws.close(1008, "Geçersiz userid");
          }
        } else if (event === "ping") {
          ws.send(JSON.stringify({ event: "pong" }));
          console.log("[server.js] Pong gönderildi:", userid);
        } else {
          console.warn("[server.js] Bilinmeyen mesaj:", event, "from:", userid);
        }
      } catch (error) {
        console.error("[server.js] Mesaj işleme hatası:", error.message, "from:", userid);
        ws.send(JSON.stringify({ event: "error", data: { message: "Mesaj işlenemedi" } }));
      }
    });

    ws.on("close", async (code) => {
      console.log(`[server.js] Kullanıcı ayrıldı: ${userid}, Kod: ${code}`);
      await socketManager.deleteUserSocket(userid);
    });

    ws.on("error", async (error) => {
      console.error("[server.js] WebSocket hatası:", error.message, "from:", userid);
      await socketManager.deleteUserSocket(userid);
    });
  } catch (error) {
    console.error("[server.js] Token doğrulama hatası:", error.message);
    ws.send(JSON.stringify({ event: "error", data: { message: `Geçersiz token: ${error.message}` } }));
    ws.close(1008, "Geçersiz token");
  }
});

wss.on("error", (error) => {
  console.error("[server.js] WebSocket server hatası:", error);
});

app.use(cors({
  origin: ["http://localhost:3000", "https://tinnten.com"],  // frontend URL'leri
  credentials: true, // Eğer token ya da cookie ile çalışıyorsan
}));
// Middleware
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 GB aws sunucusunun bir kerede max upload miktarı.
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Form-data verisini almak için
app.use(express.static(path.join(__dirname, 'public')));
// GZIP sıkıştırmasını etkinleştir
app.use(compression());
app.use(cookieParser()); // ✅ Bu satır önemli

app.use(keycloak.middleware());
// Session middleware'i ayarlama

//routres
app.use("/api/v10", require('./routes'));
app.use(express.static(path.join(__dirname, 'public')));


// sitemap endpoint – async function olmalı!
app.get('/sitemap.xml', async (req, res) => {
  try {
    res.header('Content-Type', 'application/xml');
    res.header('Content-Encoding', 'gzip');

    const sitemap = new SitemapStream({ hostname: 'https://www.tinnten.com' });
    const pipeline = sitemap.pipe(createGzip());

    // Statik sayfalar
    sitemap.write({ url: '/', changefreq: 'monthly', priority: 1.0 });
    sitemap.write({ url: '/about', changefreq: 'monthly', priority: 0.8 });
    sitemap.write({ url: '/contact', changefreq: 'monthly', priority: 0.5 });

    // Dinamik sayfalar (örnek)
    /*     const pages = await getPagesFromDatabase(); // Bu async fonksiyon olmalı
        pages.forEach((page) => {
          sitemap.write({
            url: `/products/${page.slug}`, // örnek
            changefreq: 'weekly',
            priority: 0.7
          });
        }); */
    sitemap.end();
    const xml = await streamToPromise(pipeline);
    res.send(xml);
  } catch (err) {
    console.error('Sitemap oluşturulurken hata:', err);
    res.status(500).end();
  }
});

app.get('/images/cover', (req, res) => {
  const imagePath = path.join(__dirname, 'public/images', "cover.jpg");
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Resim gönderilirken hata oluştu:', err);
      res.status(404).send('Resim bulunamadı.');
    }
  });
});


if (process.env.NODE_ENV != "production") {
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
}
if (process.env.NODE_ENV !== "production") {
  app.get("/", (req, res) => {
    res.send("API running in development mode");
  });

  app.get("/api", (req, res) => {
    res.send("API is working!");
  });
}

app.use(errorHandler)
server.listen(PORT, () => { console.log(`Started on Port : ${PORT}`) })
