require("dotenv").config()
require("colors")
require("./config/instrument.js");
const path = require('path');
const compression = require('compression');
const Sentry = require("@sentry/node");
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
//const { initSocket } = require('./lib/WSSocket');
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
// Proxy arkasındaysan bunu yap:
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

const allowedOrigins = [
  "https://tinnten.com",
  "https://www.tinnten.com",
  "http://localhost:3000"
];
// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});
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

app.get("/", (req, res) => {
  res.send(`api running on ${process.env.NODE_ENV} mode`);
});
app.get("/api", (req, res) => {
  res.send("API is working!");
});
app.use(errorHandler)

console.log("[server.js] WebSocket sunucusu başlatılıyor. Zaman:", new Date().toISOString());
const wss = socketManager.initSocket(server);

if (!wss) {
  console.error("[server.js] Hata: WebSocket server başlatılamadı! Zaman:", new Date().toISOString());
  process.exit(1);
}
console.log("[server.js] WebSocket sunucusu başarıyla başlatıldı. Zaman:", new Date().toISOString());
wss.on("connection", async (ws, req) => {
  //console.log("[server.js] Yeni WebSocket bağlantısı alındı: URL:", req.url, "Headers:", req.headers, "Zaman:", new Date().toISOString());

  ws.on("message", async (message) => {
    //console.log("[server.js] Yeni mesaj alındı: Ham veri:", message.toString(), "Zaman:", new Date().toISOString());
    try {
      const { event, data: payload } = JSON.parse(message);
      //console.log("[server.js] Mesaj ayrıştırıldı: Event:", event, "Payload:", payload, "Zaman:", new Date().toISOString());

      if (event === "identify") {
        const receivedUserid = payload.userid;
        const token = payload.token;
        console.log(
          "[server.js] Identify işlemi: Alınan UserID:",
          receivedUserid,
          "Token:",
          token ? "Mevcut" : "Eksik",
          "Zaman:",
          new Date().toISOString()
        );

        if (!token) {
          console.error("[server.js] Hata: Token eksik. Zaman:", new Date().toISOString());
          ws.send(JSON.stringify({ event: "error", data: { message: "Token eksik" } }));
          ws.close(1008, "Token eksik");
          return;
        }

        try {
          console.log("[server.js] Keycloak ile token doğrulanıyor. Zaman:", new Date().toISOString());
          const userkey = await Keycloak.getUserInfo(token);
          console.log("[server.js] Keycloak doğrulama başarılı: Kullanıcı ID:", userkey.sub, "Zaman:", new Date().toISOString());

          const user = await User.findOne({ keyid: userkey.sub });
          if (!user) {
            console.error("[server.js] Hata: Kullanıcı bulunamadı, keyid:", userkey.sub, "Zaman:", new Date().toISOString());
            ws.send(JSON.stringify({ event: "error", data: { message: "Kullanıcı bulunamadı" } }));
            ws.close(1008, "Kullanıcı bulunamadı");
            return;
          }

          const userid = user._id.toString();
          ws.userid = userid;
          ws.isAuthenticated = false;

          if (receivedUserid && receivedUserid === userid) {
            await socketManager.setUserSocket(userid, ws);
            console.log("[server.js] Kullanıcı soketi kaydedildi: ID:", userid, "Zaman:", new Date().toISOString());
            await socketManager.updateUserAuth(userid, true);
            console.log(`[server.js] Kullanıcı doğrulandı: ${userid}. Zaman:`, new Date().toISOString());
            ws.send(JSON.stringify({ event: "identify_success", data: { message: "Doğrulama başarılı" } }));
          } else {
            console.error(
              "[server.js] Hata: Geçersiz userid, Alınan:",
              receivedUserid,
              "Beklenen:",
              userid,
              "Zaman:",
              new Date().toISOString()
            );
            ws.send(JSON.stringify({ event: "error", data: { message: "Geçersiz userid" } }));
            ws.close(1008, "Geçersiz userid");
          }
        } catch (error) {
          console.error("[server.js] Hata: Token doğrulama hatası:", error.message, error.stack, "Zaman:", new Date().toISOString());
          ws.send(JSON.stringify({ event: "error", data: { message: `Geçersiz token: ${error.message}` } }));
          ws.close(1008, "Geçersiz token");
        }
      } else if (event === "ping") {
        console.log("[server.js] Ping alındı, pong gönderiliyor. Zaman:", new Date().toISOString());
        ws.send(JSON.stringify({ event: "pong" }));
        console.log("[server.js] Pong gönderildi. Zaman:", new Date().toISOString());
      } else {
        console.warn("[server.js] Uyarı: Bilinmeyen mesaj tipi:", event, "Zaman:", new Date().toISOString());
        ws.send(JSON.stringify({ event: "error", data: { message: `Bilinmeyen mesaj tipi: ${event}` } }));
      }
    } catch (error) {
      console.error(
        "[server.js] Hata: Mesaj işleme hatası:",
        error.message,
        "Ham veri:",
        message.toString(),
        "Zaman:",
        new Date().toISOString()
      );
      ws.send(JSON.stringify({ event: "error", data: { message: "Mesaj işlenemedi: " + error.message } }));
    }
  });

  ws.on("close", async (code, reason) => {
    console.log(
      `[server.js] Kullanıcı bağlantısı kapandı: Kod: ${code}, Sebep: ${reason || "Belirtilmemiş"}`,
      "Zaman:",
      new Date().toISOString()
    );
    if (ws.userid) {
      await socketManager.deleteUserSocket(ws.userid);
      console.log(`[server.js] Kullanıcı soketi silindi: UserID: ${ws.userid}. Zaman:`, new Date().toISOString());
    }
  });

  ws.on("error", async (error) => {
    console.error("[server.js] Hata: WebSocket hatası:", error.message, error.stack, "Zaman:", new Date().toISOString());
    if (ws.userid) {
      await socketManager.deleteUserSocket(ws.userid);
      console.log(`[server.js] Kullanıcı soketi silindi (hata sonrası): UserID: ${ws.userid}. Zaman:`, new Date().toISOString());
    }
  });
});

wss.on("error", (error) => {
  console.error("[server.js] Hata: WebSocket server hatası:", error.message, error.stack, "Zaman:", new Date().toISOString());
});
if (process.env.NODE_ENV !== "production")
  app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("My first Sentry error!");
  });
// Sadece direkt çalıştırıldığında dinle
app.get("/ping", async (req, res) => {
  res.status(200).json({ message: "pong" });
});

if (require.main === module) {

}
server.listen(PORT, () => {
  console.log(`Started on Port : ${PORT}`);
});

//module.exports = app; // 👈 Supertest ile test için sadece app objesi export edilir