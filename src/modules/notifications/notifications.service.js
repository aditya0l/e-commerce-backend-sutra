const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendEmail = async ({ to, subject, html }) => {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
};

const sendWhatsApp = async ({ to, message }) => {
    try {
        await axios.post(
            `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message },
            },
            { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
        );
        logger.info(`WhatsApp message sent to ${to}`);
    } catch (err) {
        logger.error('WhatsApp send failed:', err.response?.data || err.message);
        throw err;
    }
};

module.exports = { sendEmail, sendWhatsApp };
