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

let addressId;

beforeEach(async () => {
  // login
  const loginRes = await request(app)
    .post("/api/v10/auth/login")
    .send({
      email: "engin_erol@hotmail.com",
      password: "1111",
      device: "web",
      wifiConnections: [{ ssid: "Home WiFi", macAddress: "00:1A:2B:3C:4D:5E" }]
    });

  accessToken = loginRes.body.data?.data?.accessToken;

  // create address
  const createRes = await request(app)
    .post("/api/v10/address")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      street: "Test Cad.",
      city: "İstanbul",
      state: "Marmara",
      zip: "34000",
      country: "Türkiye",
      location: {
        coordinates: {
          lat: 41.0082,
          lng: 28.9784
        }
      }
    });

  addressId = createRes.body.address._id;
});


describe("🛠️ [UPDATE] PUT /api/v10/address/:id", () => {
  it("should update the address city and street", async () => {
    const res = await request(app)
      .put(`/api/v10/address/${addressId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        street: "Yeni Mahalle",
        city: "Ankara"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.address.city).toBe("Ankara");
    expect(res.body.address.street).toBe("Yeni Mahalle");
  });
});

describe("🗑️ [DELETE] DELETE /api/v10/address/:id", () => {
  it("should delete the address", async () => {
    const res = await request(app)
      .delete(`/api/v10/address/${addressId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 when deleting again", async () => {
    await request(app)
      .delete(`/api/v10/address/${addressId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    const res = await request(app)
      .delete(`/api/v10/address/${addressId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(404);
  });
});