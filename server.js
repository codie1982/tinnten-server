
require("dotenv").config()
require("colors")
const path = require('path');
const compression = require('compression');
const express = require("express")
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fileUpload = require('express-fileupload');
const { connectDB } = require("./config/db")
const usersRoutes = require("./routes/userRoutes")
const mailRoutes = require("./routes/mailRoutes")
const {errorHandler} = require("./middleware/errorHandler")
const { keycloak, memoryStore } = require('./helpers/keycloak-config');


const cors = require('cors');
const { SitemapStream, streamToPromise } = require('sitemap');

//const App = require('../frontend/src/index.js'); // React uygulamanızı bu şekilde import edin



const bodyParser = require("body-parser");
const PORT = process.env.PORT || 3000;
connectDB()
const app = express()
app.use(
  cors({
    origin: '*',
    credentials: true, // if you need to allow cookies or other credentials
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true })); // Form-data verisini almak için
app.use(express.static(path.join(__dirname, 'public')));
// GZIP sıkıştırmasını etkinleştir
app.use(compression());
// Middleware
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 5 GB aws sunucusunun bir kerede max upload miktarı.
}));
app.use(keycloak.middleware());
// Session middleware'i ayarlama
/* app.use(session({
  secret: process.env.SESSION_SECRET_KEY,  // Güçlü ve gizli bir anahtar belirleyin
  resave: false,  // Oturum verisi değişmediği sürece oturumu yeniden kaydetme
  saveUninitialized: true,  // Boş oturumları kaydetme
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI, // MongoDB bağlantı URL'si
    dbName: process.env.DB_SPOTSOUND,
    collectionName: process.env.SESSION_COLLECTION,  // Oturum verilerinin saklanacağı koleksiyon adı
    ttl: 14 * 24 * 60 * 60  // Oturumun sona erme süresi (14 gün)
  }),
  cookie: {
    secure: process.env.NODE_ENV === "development" ? false : true, // true ise sadece HTTPS üzerinden gönderilir; geliştirme ortamında false olabilir
    maxAge: 14 * 24 * 60 * 60 * 1000  // Çerez süresi (milisaniye cinsinden)
  }
})); */

//user
app.use("/api/v10/users", usersRoutes)

app.use("/api/v10/mail", mailRoutes)

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