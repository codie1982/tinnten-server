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
// 🔄 Her test öncesi bir firma oluştur
beforeEach(async () => {
    const loginRes = await request(app)
        .post("/api/v10/auth/login")
        .send({
            "email": "engin_erol@hotmail.com",
            "password": "1111",
            "device": "web",
            "wifiConnections": [
                {
                    "ssid": "Home WiFi",
                    "macAddress": "00:1A:2B:3C:4D:5E"
                }
            ]
        });
    accessToken = loginRes.body.data.data.accessToken;
});


describe.skip("POST /api/v10/company/create", () => {
    it("should create a company profile", async () => {
        const res = await request(app)
            .post("/api/v10/company/create")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                email: "test@tinnten.com",
                companyName: "Test Company",
                companySlug: "test-company",
                description: "Deneme açıklaması",
                website: "https://tinnten.com",
                foundedDate: "2022-01-01",
                companyType: "individual",
                industry: ["yazılım"],
                taxOrIdentityNumber: "12345678900",
                logo: { uploadid: "c66493d0-e3e2-479a-b809-156fd40963de" },
                phone: [{ type: "mobile", number: "+905551112233" }],
                address: { city: "İstanbul", country: "Türkiye" },
                location: { lat: 41, lng: 28 },
                social: [{ platform: "instagram", link: "https://instagram.com/test" }],
                packagename: "Free Company Plan"
            });

        console.log("Status:", res.statusCode);        // 👈
        console.log("Response body:", res.body);       // 👈

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.company).toHaveProperty("companyName", "Test Company");
    });
});

describe("GET /api/v10/company/me", () => {
    it("should return the current user's company profile", async () => {
        const res = await request(app)
            .get("/api/v10/company/me")
            .set("Authorization", `Bearer ${accessToken}`);

        console.log("GET /company/me response:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
describe("🧪 [UPDATE] PUT /api/v10/company/me", () => {
    it("should update the company name and website", async () => {
        const updateRes = await request(app)
            .put(`/api/v10/company/me`) // companyId create testinden gelmeli
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
                companyName: "Updated Test Company",
                website: "https://updated.com"
            });

        console.log("🛠️ Update Response:", updateRes.body);

        expect(updateRes.statusCode).toBe(200);
        expect(updateRes.body.success).toBe(true);
    });
});
describe("🧪 [DELETE] DELETE /api/v10/company/me", () => {
    it("should delete the company profile", async () => {
        const deleteRes = await request(app)
            .delete(`/api/v10/company/me`)
            .set("Authorization", `Bearer ${accessToken}`);

        expect(deleteRes.statusCode).toBe(200);
        expect(deleteRes.body.success).toBe(true);
    });

    it("should return 404 when fetching deleted company", async () => {
        const getRes = await request(app)
            .get("/api/v10/company/me")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(getRes.statusCode).toBe(404);
    });
});