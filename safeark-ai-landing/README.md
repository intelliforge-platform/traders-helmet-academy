# SafeArk AI Landing Page — THAgent Lead Generation

- **Created / updated:** 17 October 2026
- **Time:** 02:17 (Africa/Lagos, UTC+01:00)
- **Intended project directory:** `/mnt/data/safeark-ai-landing/`
- **Production URL:** `https://tradershelmetacademy.com/safearkai`
- **Entry point:** `index.html`
- **Server:** `server.js`
- **Flyer asset:** `assets/safeark-flyer.jpg`
- **Chatbot logo:** `assets/safeark-logo.png`
- **Lead destination:** `Choicendon@gmail.com`

## What's included

- Original SafeArk AI flyer is used as the desktop page artwork.
- THAgent replaces the QR code in the same flyer area; the supplied SafeArk shield logo is sized to fit the launcher and chatbot header.
- Mobile layout presents the main offer and keeps THAgent accessible.
- THAgent can use the OpenAI API through a server-side endpoint, with a business-specific knowledge prompt and safeguards against invented performance/fee claims.
- The front-end lead form posts to `/api/leads` and does **not** open an email app or create an email draft.
- The server delivers leads to `Choicendon@gmail.com` using Resend. Name, email, phone/WhatsApp, interest, message, source and receipt time are included.
- Basic field validation, request-size limit, and error handling are included.

## Configure and run

Requirements: Node.js 18.17+ and an internet connection.

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` to an API key for the OpenAI project you want THAgent to use.
3. Create/configure a Resend account, verify a sending domain, and set `RESEND_API_KEY` and `RESEND_FROM` to an approved sender address on that verified domain.
4. Keep `LEADS_TO=Choicendon@gmail.com` unless the business changes its destination inbox.
5. Install and start:

   ```bash
   npm install
   npm start
   ```

6. Open `http://localhost:3000/safearkai`.

The API keys must remain on the server and must never be placed in `index.html` or another browser-accessible file. Do not deploy with placeholder credentials. The server returns an error if mail or AI services are not configured, rather than falsely reporting success.

## Production deployment

Deploy this Node application to a host that supports Node.js and environment variables (for example, a Node-capable cloud app platform). Point `tradershelmetacademy.com/safearkai` to this application or configure the existing website host to proxy `/api/*` to it. Enable HTTPS. Test `/health`, chat responses, mobile layout and a real test lead after configuration. Do not point the live domain at this build until API credentials and delivery have been tested.

## Email delivery behavior

The form uses a same-origin `fetch('/api/leads')` request. On success it displays an in-chat confirmation; no mail client opens. The email provider is called server-side. For dependable deliverability, verify the sender domain in Resend and configure SPF/DKIM as instructed by the provider. A successful provider response means accepted for delivery, not a guarantee that the recipient inbox will never filter the message.

## Important business and safety notes

The assistant distinguishes the flyer’s claims from independently verified facts. Trading can result in losses; no profit is guaranteed. The business should review the assistant's approved facts, privacy notice, consent wording, performance claims, broker integrations, account permissions, fees, and any regulatory disclosures before launch. Add production-grade rate limiting, bot protection, monitoring and a privacy/data-retention policy before a high-traffic public launch.


## Vercel deployment notes (added 17 October 2026, 02:25 Africa/Lagos)

This folder now includes `api/chat.js`, `api/leads.js`, `api/_config.js`, and `vercel.json` for Vercel Functions. The HTML can call `/api/chat` and `/api/leads`; no Express server process is required for Vercel.

**Important for the existing domain:** Vercel custom domains attach to a deployment, but a path such as `/safearkai` belongs to the site's routing configuration. If `tradershelmetacademy.com` already serves another site, the current site developer should add a route/rewrite in the existing site's Vercel project to serve this landing page at `/safearkai` and route `/api/chat` and `/api/leads` to these functions, or use a dedicated subdomain/deployment and proxy those paths. Do not replace the main site deployment blindly.

### Vercel environment variables
Set these in Vercel Project → Settings → Environment Variables for Production (and Preview if desired):
- `OPENAI_API_KEY` — secret API key from the OpenAI Platform project
- `OPENAI_MODEL` — `gpt-4o-mini` (or another model enabled for your API project)
- `RESEND_API_KEY` — secret Resend API key
- `RESEND_FROM` — sender address on a domain verified in Resend, e.g. `THAgent <leads@your-verified-domain.com>` after that domain has actually been verified
- `LEADS_TO` — `Choicendon@gmail.com`

Never prefix secrets with `NEXT_PUBLIC_` or `VITE_`; never put them in HTML, commit them to Git, or send them in chat. Redeploy after setting/changing variables.

### Deploy checklist
1. Developer checks the existing Vercel project/repository and route ownership.
2. Merge/copy these files into the existing site's codebase under an appropriate path; ensure the root `api/` functions and `vercel.json` are integrated without overwriting existing routes.
3. Set the environment variables above in Vercel.
4. Verify a sending domain in Resend and configure the DNS records Resend provides (SPF/DKIM). The `RESEND_FROM` address must match a verified sender/domain.
5. Deploy to a Preview URL first. Test `/safearkai`, `/api/chat` with a POST JSON body, and `/api/leads` with a controlled test enquiry. Confirm the email arrives at `Choicendon@gmail.com`.
6. Review Vercel function logs, check mobile layout, and only then promote to Production.
7. Add rate limiting/bot protection, consent/privacy notice, and data retention procedures before advertising.

### API smoke-test examples
Use only after deployment, replacing `PREVIEW_URL` with the actual Vercel Preview URL:

```bash
curl -i -X POST 'https://PREVIEW_URL/api/chat' -H 'Content-Type: application/json' --data '{"message":"How does SafeArk AI work?"}'
curl -i -X POST 'https://PREVIEW_URL/api/leads' -H 'Content-Type: application/json' --data '{"name":"Test Lead","email":"you@example.com","phone":"+2348000000000","interest":"General enquiry","message":"Deployment test"}'
```

Do not run the lead test against Production unless the business has approved sending a test email. A successful HTTP response from Resend means the provider accepted the message, not a guarantee of inbox placement.
