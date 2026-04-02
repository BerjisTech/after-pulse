You are an expert Shopify app developer in 2026. I have just created a new Shopify app using `npm init @shopify/app@latest` with the **React Router template** (TypeScript).

App Name: **AfterPulse**
Partner Organization: Berjis Apps

**App Description:**
AfterPulse is a modern AI-powered post-purchase and checkout upsell app. It helps Shopify merchants increase AOV by showing smart, dynamic upsells and bundles on the thank-you page, order status page, and optionally during checkout (using Checkout Extensibility).

Core Value: Use AI to show highly relevant, personalized upsell offers based on the customer's order, browsing behavior, and merchant rules.

### Technical Requirements
- Use the official Shopify React Router template structure.
- Use **TypeScript** strictly.
- Use **Polaris** components and follow Shopify App Design Guidelines (clean, modern, professional UI).
- Implement proper App Bridge v4 for embedded experience.
- Use GraphQL Admin API + REST where needed.
- Store app data using Shopify Metaobjects or App Embedded models (best practices).
- Implement proper authentication, session tokens, and webhooks.
- Make it fully embedded (no full-screen redirects).

### Core Features for MVP (Phase 1)
1. **Dashboard** - Overview with key metrics (revenue generated, AOV lift, conversion rate, top offers).
2. **Offer Builder** - Create multiple upsell offers (single product, bundle, discount).
3. **AI Smart Rules** - Merchant can define rules + AI generates personalized offers (integrate with OpenAI/Claude API - make it configurable).
4. **Post-Purchase Placement** - Show offers on thank-you page and order status page.
5. **Targeting** - By products, collections, customer tags, order value, country.
6. **Analytics** - Basic performance tracking per offer.
7. **Settings** - API keys, enable/disable features, styling options.

### UI/UX & Theming Requirements
- Modern, clean, premium look (use Polaris 12+).
- Dark/light mode support.
- Excellent mobile responsiveness.
- Use consistent branding colors (suggest a nice palette: deep teal + indigo + white).
- Professional typography and spacing.

### Development Approach
Follow this step-by-step workflow:
1. First, analyze the current template structure and explain key files/folders.
2. Suggest clean folder structure improvements for scalability (especially since I plan 4 apps).
3. Implement features one by one with full code.
4. Always provide both the code and clear explanations.
5. Focus on performance, error handling, and Shopify compliance.
6. After each major feature, give testing steps.

Start by exploring the current project structure and giving me a complete development plan with prioritized tasks for the MVP.

Be extremely detailed, production-ready, and follow latest Shopify best practices (2026). Think like a senior full-stack Shopify developer who has built many successful apps.

Begin now.

Run the shopify app dev using `PORT=6300 shopify app dev --tunnel-url https://after-pulse.berjis.tech:6300`