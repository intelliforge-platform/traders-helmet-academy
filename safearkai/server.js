/**
 * SafeArk AI / THAgent web server
 * Created: 17 October 2026
 * Time: 02:17 Africa/Lagos (UTC+01:00)
 * Intended project directory: /mnt/data/safeark-ai-landing/
 * Required secrets are supplied through environment variables; never commit .env.
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const INBOX = process.env.LEADS_TO || 'Choicendon@gmail.com';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM;

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

const systemPrompt = `You are THAgent, the official information assistant for SafeArk AI and Traders Helmet Academy in Nigeria. Be friendly, concise, and helpful. Use only the business facts in this prompt; do not invent fees, broker names, account requirements, returns, regulatory approvals, performance figures, or guarantees. SafeArk AI is described by the business flyer as an intelligent trading system that connects to a partner's own trading account, under their name, and trades on their behalf; the flyer says the partner can pause or disconnect at any time. The flyer says performance history can be reviewed at the academy office and claims the system has run on real partner accounts across Nigeria. These are marketing claims and you must clearly say you cannot independently verify them. Trading involves risk and losses are possible; never guarantee profits or provide individualized investment advice. Traders Helmet Academy advertises forex trading mentorship. Office: 8 Lake Chad Crescent, Maitama, Abuja. WhatsApp: 0705 277 7715. Phone: 0806 392 0215. Lead enquiries: ${INBOX}. For exact setup, broker, permissions, fees, eligibility, or proof of performance, invite the visitor to submit the contact form or contact the academy. Never request passwords, one-time codes, API secrets, or account login details.`;

app.post('/api/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 500) return res.status(400).json({ error: 'Enter a question of up to 500 characters.' });
  if (!OPENAI_API_KEY) return res.status(503).json({ error: 'AI assistant is not configured yet.' });
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        temperature: 0.3,
        max_tokens: 350
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error('OpenAI request failed:', upstream.status, data?.error?.type || 'upstream_error');
      return res.status(502).json({ error: 'THAgent is temporarily unavailable.' });
    }
    return res.json({ reply: data.choices?.[0]?.message?.content?.trim() || 'Please contact Traders Helmet Academy for assistance.' });
  } catch (error) {
    console.error('Chat request failed:', error.message);
    return res.status(502).json({ error: 'THAgent is temporarily unavailable.' });
  }
});

app.post('/api/leads', async (req, res) => {
  const { name, email, phone, interest, message, source } = req.body || {};
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const lead = { name: clean(name), email: clean(email), phone: clean(phone), interest: clean(interest) || 'General enquiry', message: clean(message), source: clean(source) || 'SafeArk AI landing page / THAgent' };
  if (!lead.name || lead.name.length > 100) return res.status(400).json({ error: 'Please provide a valid name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || lead.email.length > 150) return res.status(400).json({ error: 'Please provide a valid email address.' });
  if (!lead.phone || lead.phone.length > 40) return res.status(400).json({ error: 'Please provide a valid phone number.' });
  if (lead.message.length > 1500 || lead.interest.length > 100) return res.status(400).json({ error: 'One of the submitted fields is too long.' });
  if (!RESEND_API_KEY || !RESEND_FROM) {
    console.error('Lead delivery is not configured: RESEND_API_KEY and RESEND_FROM are required.');
    return res.status(503).json({ error: 'Lead delivery has not been configured yet.' });
  }
  const text = [
    'New SafeArk AI / Traders Helmet Academy website enquiry', '',
    `Name: ${lead.name}`, `Email: ${lead.email}`, `Phone / WhatsApp: ${lead.phone}`,
    `Interest: ${lead.interest}`, `Message: ${lead.message || '(No additional message)'}`,
    `Source: ${lead.source}`, '', `Received at: ${new Date().toISOString()}`
  ].join('\n');
  try {
    const upstream = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: [INBOX], reply_to: lead.email, subject: `Website lead: ${lead.interest} — ${lead.name}`, text })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Email delivery failed:', upstream.status, data?.name || data?.message || 'email_provider_error');
      return res.status(502).json({ error: 'Your enquiry could not be delivered right now. Please try again or contact us on WhatsApp.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Email delivery request failed:', error.message);
    return res.status(502).json({ error: 'Your enquiry could not be delivered right now. Please try again.' });
  }
});

app.get('/safearkai', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'SafeArk AI / THAgent' }));
app.listen(PORT, () => console.log(`SafeArk AI landing page listening on port ${PORT}`));
