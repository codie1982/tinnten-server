
require("dotenv").config()
require("colors")
const path = require('path');
const compression = require('compression');
const express = require("express")
const fileUpload = require('express-fileupload');
const { connectDB } = require("./config/db")
const cookieParser = require('cookie-parser');

const { errorHandler } = require("./middleware/errorHandler")
const { keycloak, memoryStore } = require('./helpers/keycloak-config');

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

const cors = require('cors');
const { SitemapStream, streamToPromise } = require('sitemap');


const fs = require('fs');

const csv = require('csv-parser');
//const App = require('../frontend/src/index.js'); // React uygulamanızı bu şekilde import edin

const bodyParser = require("body-parser");
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

app.get('/addproducts', (req, res) => {
  const csvFilePath = path.join(__dirname, 'assets', 'production_infos.csv');

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      console.log("row", row);
    })
    .on('end', () => {
      console.log('CSV file successfully processed');
    });
});
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