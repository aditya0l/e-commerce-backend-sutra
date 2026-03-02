const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getAddresses, addAddress, deleteAddress } = require('./customer.controller');
const { protect } = require('../../middlewares/auth');

router.use(protect);
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.delete('/addresses/:id', deleteAddress);

module.exports = router;
