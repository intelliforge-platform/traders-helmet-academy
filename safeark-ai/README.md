# SafeArk AI Landing Page — THAgent Lead Generation Prototype

- **Created:** 17 October 2026
- **Time:** 01:15 (Africa/Lagos, UTC+01:00)
- **Project directory:** `/mnt/data/safeark-ai-landing/`
- **Entry point:** `index.html`
- **Image asset:** `assets/safeark-flyer.jpg`

## What's included
- Desktop landing page uses the supplied SafeArk AI flyer as the visual foundation.
- THAgent replaces the QR-code area with a chatbot launcher in the same position.
- Mobile layout adapts the key messaging and keeps the chatbot accessible.
- THAgent answers common questions based on the flyer and gives cautious answers about unverified trading-performance claims.
- Lead form collects name, email, phone/WhatsApp, interest, and optional message.
- Contact details and WhatsApp/call links are included.

## Run locally
Open `index.html` in a modern browser. No build tools or external JavaScript libraries are required.

## Important email delivery note
This is a front-end prototype. The lead form validates fields and opens the visitor's default email application with a prefilled email addressed to `Choicendon@gmail.com`. A static HTML page cannot silently deliver form submissions to an inbox by itself. For reliable lead capture even when a visitor has no configured email app, connect a backend endpoint or form service, configure spam protection/consent, and test delivery before publishing.

## Before launch
1. Confirm the canonical production URL. The provided `https\://tradershelmetacademy/safearkai` appears to omit a domain suffix; verify the intended domain and HTTPS certificate.
2. Replace the mailto submission with an approved backend/form endpoint if direct inbox delivery is required.
3. Confirm all marketing claims, performance records, account custody details, fees, broker integrations, and risk disclosures with the business owner.
4. Test desktop/mobile sizing, keyboard navigation, screen readers, and lead delivery.
