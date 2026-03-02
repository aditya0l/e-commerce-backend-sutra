const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

const authRoutes = require('../modules/auth/auth.routes');
const catalogRoutes = require('../modules/catalog/catalog.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const cartRoutes = require('../modules/cart/cart.routes');
const orderRoutes = require('../modules/orders/orders.routes');
const paymentRoutes = require('../modules/payments/payments.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const customerRoutes = require('../modules/customer/customer.routes');

// Public bank info for checkout page
router.get('/bank-info', async (req, res) => {
    const info = await prisma.bankInfo.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', accountHolder: '', bankName: '', iban: '', bic: '', instructions: '' },
        update: {},
    });
    res.json({ success: true, data: info });
});

router.use('/auth', authRoutes);
router.use('/products', catalogRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/customer', customerRoutes);

module.exports = router;

