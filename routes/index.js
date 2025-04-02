const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRouters'));
router.use('/users', require('./userRoutes'));
router.use('/profile', require('./profilRoutes'));
router.use('/products', require('./productRouters'));
router.use('/services', require('./servicesRouters'));
router.use('/company', require('./companyRouters'));
router.use('/system-packages', require('./systemPackagesRoutes'));
router.use('/conversation', require('./conversationsRouters'));
router.use('/bid-request', require('./bidRequestRouters'));
router.use('/bid-response', require('./bidResponseRouters'));
router.use('/favorite', require('./favoriteRouters'));
router.use('/upload', require('./uploadRouters'));
router.use('/crawler', require('./crawlerRouters'));

module.exports = router;

/**
 * //user
app.use("/api/v10/auth", authRouters)
app.use("/api/v10/users", usersRoutes)
app.use("/api/v10/profile", profilRoutes)
app.use("/api/v10/products", productRouters)
app.use("/api/v10/services", servicesRouters)
app.use("/api/v10/company", companyRouters)
app.use("/api/v10/system-packages", systemPackagesRoutes)
app.use("/api/v10/conversation", conversationRoutes)
app.use("/api/v10/bid-request", bidRequestRouters)
app.use("/api/v10/bid-response", bidResponseRoutes)
app.use("/api/v10/favorite", favoriteRouters)
app.use("/api/v10/upload", uploadRoutes)
app.use("/api/crawler/", crawlerRouters)
 */