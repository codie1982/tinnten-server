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
let phoneId;
beforeEach(async () => {
    // login → accessToken
    const loginRes = await request(app)
      .post("/api/v10/auth/login")
      .send({
        email: "engin_erol@hotmail.com",
        password: "1111",
        device: "web",
        wifiConnections: [{ ssid: "Home WiFi", macAddress: "00:1A:2B:3C:4D:5E" }]
      });
  
    accessToken = loginRes.body.data?.data?.accessToken;
  
    // create phone
    const phoneRes = await request(app)
      .post("/api/v10/phone")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        type: "mobile",
        number: "0533" + Math.floor(1000000 + Math.random() * 9000000) // random 0533 ile başlayan
      });
  
    phoneId = phoneRes.body.phone._id;
  });


  describe("🛠️ [UPDATE] PUT /api/v10/phone/:id", () => {
    it("should update phone type and number", async () => {
      const updateRes = await request(app)
        .put(`/api/v10/phone/${phoneId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          type: "work",
          number: "02125551212"
        });
  
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.phone.type).toBe("work");
      expect(updateRes.body.phone.number).toBe("02125551212");
    });
  });
  describe("🗑️ [DELETE] DELETE /api/v10/phone/:id", () => {
    it("should delete the phone number", async () => {
      const deleteRes = await request(app)
        .delete(`/api/v10/phone/${phoneId}`)
        .set("Authorization", `Bearer ${accessToken}`);
  
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  
    it("should return 404 when deleting the same phone again", async () => {
      await request(app)
        .delete(`/api/v10/phone/${phoneId}`)
        .set("Authorization", `Bearer ${accessToken}`);
  
      const secondDelete = await request(app)
        .delete(`/api/v10/phone/${phoneId}`)
        .set("Authorization", `Bearer ${accessToken}`);
  
      expect(secondDelete.statusCode).toBe(404);
    });
  });