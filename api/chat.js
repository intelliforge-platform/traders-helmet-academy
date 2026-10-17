/**
 * Vercel Function: THAgent chat endpoint
 * Created: 17 October 2026
 * Time: 02:25 Africa/Lagos (UTC+01:00)
 * Intended directory: /safeark-ai-landing/api/chat.js
 */
const { systemPrompt } = require('./_config');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 500) return res.status(400).json({ error: 'Enter a question of up to 500 characters.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI assistant is not configured yet.' });
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], temperature: 0.3, max_tokens: 350 })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) { console.error('OpenAI request failed:', upstream.status, data?.error?.type || 'upstream_error'); return res.status(502).json({ error: 'THAgent is temporarily unavailable.' }); }
    return res.status(200).json({ reply: data.choices?.[0]?.message?.content?.trim() || 'Please contact Traders Helmet Academy for assistance.' });
  } catch (error) { console.error('Chat request failed:', error.message); return res.status(502).json({ error: 'THAgent is temporarily unavailable.' }); }
};
