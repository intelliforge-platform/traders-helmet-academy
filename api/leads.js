/**
 * Retrofit: SafeArk Agent contact lead endpoint
 * Updated: 2026-10-17; Timezone: Africa/Lagos (UTC+01:00)
 * Intended directory: /mnt/data/safeark-ai-landing/api/leads.js
 * Vercel Function: silent lead email delivery
 * Created: 17 October 2026
 * Time: 02:25 Africa/Lagos (UTC+01:00)
 * Intended directory: /safeark-ai-landing/api/leads.js
 */
const { INBOX } = require('./_config');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const { name, email, phone, consent, interest, message, source } = req.body || {};
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const lead = { name: clean(name), email: clean(email), phone: clean(phone), interest: clean(interest) || 'General enquiry', message: clean(message), source: clean(source) || 'SafeArk AI landing page / THAgent' };
  if (!lead.name || lead.name.length > 100) return res.status(400).json({ error: 'Please provide a valid name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || lead.email.length > 150) return res.status(400).json({ error: 'Please provide a valid email address.' });
  if (!lead.phone || lead.phone.length > 40 || !/^[+()0-9\s.-]{7,40}$/.test(lead.phone)) return res.status(400).json({ error: 'Please provide a valid phone number.' });
  if (consent !== true) return res.status(400).json({ error: 'Please confirm consent before submitting your details.' });
  if (lead.message.length > 1500 || lead.interest.length > 100) return res.status(400).json({ error: 'One of the submitted fields is too long.' });
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) { console.error('Lead delivery is not configured: RESEND_API_KEY and RESEND_FROM are required.'); return res.status(503).json({ error: 'Lead delivery has not been configured yet.' }); }
  const text = ['New SafeArk AI / Traders Helmet Academy website enquiry', '', `Name: ${lead.name}`, `Email: ${lead.email}`, `Phone / WhatsApp: ${lead.phone}`, `Interest: ${lead.interest}`, `Message: ${lead.message || '(No additional message)'}`, `Source: ${lead.source}`, '', `Received at: ${new Date().toISOString()}`].join('\n');
  try {
    const upstream = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM, to: [INBOX], reply_to: lead.email, subject: `Website lead: ${lead.interest} — ${lead.name}`, text }) });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) { console.error('Email delivery failed:', upstream.status, data?.name || data?.message || 'email_provider_error'); return res.status(502).json({ error: 'Your enquiry could not be delivered right now. Please try again or contact us on WhatsApp.' }); }
    return res.status(200).json({ ok: true });
  } catch (error) { console.error('Email delivery request failed:', error.message); return res.status(502).json({ error: 'Your enquiry could not be delivered right now. Please try again.' }); }
};
