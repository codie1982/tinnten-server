const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../../server"); // Express instance export edilmeli
const { connectDB } = require("../../config/db")
const { v4: uuidv4 } = require('uuid');

let mongoServer;
let accessToken;
let companyId;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  if (mongoose.connection.readyState === 0) {
    await connectDB(uri); // sadece bağlantı yoksa bağlan
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer?.stop) {
    await mongoServer.stop(); // 💡 burada güvenli kontrol
  }
});
const randomTaxId = () => {
  return String(Math.floor(10000000000 + Math.random() * 89999999999));
};
const randomCompanyName = () => {
  return `Temp Company ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

let socialId;

beforeEach(async () => {
  // Login
  const loginRes = await request(app)
    .post("/api/v10/auth/login")
    .send({
      email: "engin_erol@hotmail.com",
      password: "1111",
      device: "web",
      wifiConnections: [{ ssid: "Home WiFi", macAddress: "00:1A:2B:3C:4D:5E" }]
    });

  accessToken = loginRes.body.data?.data?.accessToken;

  // Create social
  const createRes = await request(app)
    .post("/api/v10/social")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      platform: "linkedin",
      link: "https://linkedin.com/in/testuser"
    });

  socialId = createRes.body.social._id;
});


describe("🛠️ [UPDATE] PUT /api/v10/social/:id", () => {
  it("should update social platform and link", async () => {
    const res = await request(app)
      .put(`/api/v10/social/${socialId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        platform: "twitter",
        link: "https://twitter.com/testuser"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.social.platform).toBe("twitter");
    expect(res.body.social.link).toBe("https://twitter.com/testuser");
  });
});

describe("🗑️ [DELETE] DELETE /api/v10/social/:id", () => {
  it("should delete the social link", async () => {
    const res = await request(app)
      .delete(`/api/v10/social/${socialId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 when deleting the same social again", async () => {
    await request(app)
      .delete(`/api/v10/social/${socialId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    const res = await request(app)
      .delete(`/api/v10/social/${socialId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(404);
  });
});