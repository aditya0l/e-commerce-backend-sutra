const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
const FROM = `Sutra Vedic <${process.env.SMTP_USER}>`;

const BASE_STYLE = `
  font-family: Georgia, 'Times New Roman', serif;
  background: #FEFAE0;
  color: #0F2E22;
`;
const BTN = `
  display:inline-block;background:#0F2E22;color:#FEFAE0;
  padding:14px 32px;border-radius:8px;text-decoration:none;
  font-family:Arial,sans-serif;font-size:14px;font-weight:600;
  letter-spacing:0.05em;
`;
const GOLD = '#C9A84C';

function header(title) {
    return `
    <div style="background:#0F2E22;padding:32px 40px;text-align:center;">
      <h1 style="color:${GOLD};font-family:Georgia,serif;font-size:28px;margin:0;letter-spacing:0.08em;">
        Sutra Vedic
      </h1>
      <p style="color:#E8D8A0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:6px 0 0;">
        Ayurveda
      </p>
    </div>
    <div style="background:#FEFAE0;padding:40px;color:#0F2E22;">
      <h2 style="font-family:Georgia,serif;color:#0F2E22;margin:0 0 24px;font-size:22px;">${title}</h2>
    `;
}
function footer() {
    return `
    </div>
    <div style="background:#0F2E22;padding:20px 40px;text-align:center;">
      <p style="color:#E8D8A0;font-size:11px;letter-spacing:0.1em;margin:0;">
        © ${new Date().getFullYear()} Sutra Vedic Ayurveda · All rights reserved
      </p>
    </div>
    `;
}
function orderTable(order) {
    const items = (order.items || []).map(i => {
        const name = i.productSnapshot?.name || i.name || 'Product';
        const localName = typeof name === 'object' ? (name.fr || name.en || JSON.stringify(name)) : name;
        return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #E8D8A0;">${localName}</td>
      <td style="padding:8px 0;border-bottom:1px solid #E8D8A0;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #E8D8A0;text-align:right;">${Number(i.unitPrice || i.price || 0).toFixed(2)} €</td>
    </tr>`;
    }).join('');
    return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 0;border-bottom:2px solid ${GOLD};color:${GOLD};">Article</th>
          <th style="text-align:center;padding:8px 0;border-bottom:2px solid ${GOLD};color:${GOLD};">Qté</th>
          <th style="text-align:right;padding:8px 0;border-bottom:2px solid ${GOLD};color:${GOLD};">Prix</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 0 0;font-weight:bold;font-size:16px;">Total</td>
          <td style="padding:12px 0 0;text-align:right;font-weight:bold;font-size:18px;color:${GOLD};">
            ${Number(order.totalAmount).toFixed(2)} €
          </td>
        </tr>
      </tfoot>
    </table>`;
}

async function send(to, subject, html) {
    try {
        await transporter.sendMail({ from: FROM, to, subject, html });
        logger.info(`Email sent to ${to}: ${subject}`);
    } catch (err) {
        logger.error('Email send failed:', err.message);
    }
}

// ─── Templates ───────────────────────────────────────────────────────────────

/**
 * 1. Customer: order received, waiting for bank transfer
 */
async function orderPendingPayment(order, bankInfo) {
    const ref = order.id.slice(0, 8).toUpperCase();
    const to = order.guestEmail || order.user?.email;
    if (!to) return;
    const html = `
    <html><body style="${BASE_STYLE}">
    ${header('Commande Reçue — En attente de paiement')}
    <p>Merci pour votre commande <strong>#${ref}</strong>. Pour confirmer votre commande, veuillez effectuer un virement bancaire avec les informations ci-dessous.</p>

    <div style="background:#fff;border:1px solid #E8D8A0;border-radius:12px;padding:24px;margin:24px 0;">
      <h3 style="color:${GOLD};margin:0 0 16px;font-size:16px;letter-spacing:0.05em;">
        🏦 Informations de virement
      </h3>
      <table style="font-size:14px;width:100%;">
        <tr><td style="padding:4px 0;color:#666;width:40%;">Bénéficiaire</td><td><strong>${bankInfo.accountHolder}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#666;">Banque</td><td><strong>${bankInfo.bankName}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#666;">IBAN</td><td><strong style="font-family:monospace;letter-spacing:0.1em;">${bankInfo.iban}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#666;">BIC / SWIFT</td><td><strong>${bankInfo.bic}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#666;">Montant exact</td><td><strong style="font-size:18px;color:${GOLD};">${Number(order.totalAmount).toFixed(2)} €</strong></td></tr>
        <tr><td style="padding:4px 0;color:#666;">Référence</td><td><strong>SUTRAVEDIC-${ref}</strong></td></tr>
      </table>
      ${bankInfo.instructions ? `<p style="margin:16px 0 0;font-size:13px;color:#555;border-top:1px solid #E8D8A0;padding-top:12px;">${bankInfo.instructions}</p>` : ''}
    </div>

    <p style="font-size:13px;color:#555;">⏳ Une fois votre virement effectué, notre équipe vérifiera le paiement et vous enverra une confirmation sous <strong>1–2 jours ouvrés</strong>.</p>

    <h3 style="margin-top:32px;font-size:16px;color:${GOLD};">Récapitulatif</h3>
    ${orderTable(order)}
    ${footer()}
    </body></html>`;
    await send(to, `Sutra Vedic — Commande #${ref} reçue`, html);
}

/**
 * 2. Admin: new order waiting for verification
 */
async function adminNewOrder(order) {
    if (!ADMIN_EMAIL) return;
    const ref = order.id.slice(0, 8).toUpperCase();
    const customerName = order.guestName || order.user?.name || 'Guest';
    const customerEmail = order.guestEmail || order.user?.email || '—';
    const html = `
    <html><body style="${BASE_STYLE}">
    ${header(`🛒 Nouvelle Commande #${ref}`)}
    <p><strong>Client :</strong> ${customerName} (${customerEmail})</p>
    <p><strong>Montant :</strong> <span style="font-size:18px;color:${GOLD};">${Number(order.totalAmount).toFixed(2)} €</span></p>
    ${orderTable(order)}
    <br>
    <a href="${process.env.ADMIN_URL || 'http://localhost:3000/admin'}/orders" style="${BTN}">
      Gérer la commande →
    </a>
    ${footer()}
    </body></html>`;
    await send(ADMIN_EMAIL, `[Sutra Vedic] Nouvelle commande #${ref} — Vérification requise`, html);
}

/**
 * 3. Customer: payment confirmed
 */
async function orderPaymentConfirmed(order) {
    const ref = order.id.slice(0, 8).toUpperCase();
    const to = order.guestEmail || order.user?.email;
    if (!to) return;
    const html = `
    <html><body style="${BASE_STYLE}">
    ${header('✅ Paiement Confirmé !')}
    <p>Excellent ! Votre paiement pour la commande <strong>#${ref}</strong> a été vérifié et confirmé.</p>
    <p>Votre commande est maintenant en cours de préparation. Vous recevrez un email dès qu'elle sera expédiée.</p>
    ${orderTable(order)}
    ${footer()}
    </body></html>`;
    await send(to, `Sutra Vedic — Paiement confirmé pour la commande #${ref}`, html);
}

/**
 * 4. Customer: order shipped
 */
async function orderShipped(order) {
    const ref = order.id.slice(0, 8).toUpperCase();
    const to = order.guestEmail || order.user?.email;
    if (!to) return;
    const tracking = order.trackingNumber ? `<p><strong>📦 Numéro de suivi :</strong> <code>${order.trackingNumber}</code>${order.courierName ? ` (${order.courierName})` : ''}</p>` : '';
    const html = `
    <html><body style="${BASE_STYLE}">
    ${header('🚚 Votre commande est en route !')}
    <p>Votre commande <strong>#${ref}</strong> a été expédiée et est en chemin vers vous.</p>
    ${tracking}
    <p style="font-size:13px;color:#555;">Estimé de livraison : <strong>3–5 jours ouvrés</strong></p>
    ${footer()}
    </body></html>`;
    await send(to, `Sutra Vedic — Commande #${ref} expédiée 🚚`, html);
}

/**
 * 5. Customer: order cancelled
 */
async function orderCancelled(order) {
    const ref = order.id.slice(0, 8).toUpperCase();
    const to = order.guestEmail || order.user?.email;
    if (!to) return;
    const html = `
    <html><body style="${BASE_STYLE}">
    ${header('Commande Annulée')}
    <p>Votre commande <strong>#${ref}</strong> a été annulée.</p>
    ${order.adminNote ? `<div style="background:#fff8f0;border-left:4px solid #E57373;padding:12px 16px;border-radius:4px;margin:16px 0;"><strong>Motif :</strong> ${order.adminNote}</div>` : ''}
    <p style="font-size:13px;">Pour toute question, contactez-nous à <a href="mailto:${ADMIN_EMAIL}" style="color:${GOLD};">${ADMIN_EMAIL}</a>.</p>
    ${footer()}
    </body></html>`;
    await send(to, `Sutra Vedic — Commande #${ref} annulée`, html);
}

/**
 * 6. Customer: order delivered
 */
async function orderDelivered(order) {
    const ref = order.id.slice(0, 8).toUpperCase();
    const to = order.guestEmail || order.user?.email;
    if (!to) return;
    const html = `
    <html><body style="${BASE_STYLE}">
    ${header('🎉 Commande Livrée !')}
    <p>Votre commande <strong>#${ref}</strong> a été livrée. Nous espérons que vous apprécierez vos produits Sutra Vedic !</p>
    <p style="font-size:13px;color:#555;">Avez-vous aimé vos produits ? N'hésitez pas à laisser un avis.</p>
    ${footer()}
    </body></html>`;
    await send(to, `Sutra Vedic — Commande #${ref} livrée 🎉`, html);
}

module.exports = {
    orderPendingPayment,
    adminNewOrder,
    orderPaymentConfirmed,
    orderShipped,
    orderCancelled,
    orderDelivered,
};
