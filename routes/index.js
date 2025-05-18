const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRouters'));
router.use('/users', require('./userRoutes'));
router.use('/profile', require('./profilRoutes'));
router.use('/products', require('./productRouters'));
router.use('/forms', require('./formRouters'));
router.use('/services', require('./servicesRouters'));
router.use('/company', require('./companyRouters'));
router.use('/system-packages', require('./systemPackagesRoutes'));
router.use('/conversation', require('./conversationsRouters'));
router.use('/bid-request', require('./bidRequestRouters'));
router.use('/bid-response', require('./bidResponseRouters'));
router.use('/favorite', require('./favoriteRouters'));
router.use('/upload', require('./uploadRouters'));


module.exports = router;