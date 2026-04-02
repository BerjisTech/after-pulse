# AfterPulse — MVP Implementation Plan

> AI-powered post-purchase & checkout upsell app for Shopify merchants.

## Background

The project starts from a freshly scaffolded **Shopify React Router template** (TypeScript) with:
- React Router 7 (flat-file routing via `@react-router/fs-routes`)
- Polaris Web Components (`s-page`, `s-section`, `s-stack`, etc.)
- App Bridge v4 for embedded experience
- Prisma + SQLite for session/data storage
- GraphQL Admin API codegen
- Webhook handlers for `app/uninstalled` and `app/scopes_update`

The template currently contains only demo routes (product creation example). We will progressively replace all demo code with AfterPulse features.

---

## User Review Required

> [!IMPORTANT]
> **AI Provider Choice**: The plan makes the AI integration configurable (OpenAI vs Claude). For MVP, we'll implement **one** provider first. Which do you prefer as the default — **OpenAI (GPT-4)** or **Anthropic (Claude)**?

> [!IMPORTANT]
> **Database**: The template uses **SQLite** by default. This is fine for development but won't scale to production. Do you want to:
> - (A) Keep SQLite for now, migrate to PostgreSQL before deployment
> - (B) Switch to PostgreSQL immediately (requires a DB connection string)

> [!WARNING]
> **Shopify Plus Requirement**: Post-purchase one-click upsells (between payment and thank-you page) require **Shopify Plus**. The Thank You / Order Status page extensions work for all plans. Should we build both, or focus on Thank You / Order Status page upsells only for now?

> [!IMPORTANT]
> **Scopes**: The current app has scopes: `write_metaobject_definitions, write_metaobjects, write_products`. For AfterPulse, we'll need additional scopes:
> - `read_products`, `read_orders`, `read_customers`, `read_checkouts`
> - `write_order_edits` (for post-purchase order modifications)
> - `read_analytics` (for metrics)
> 
> I'll update `shopify.app.toml` accordingly. Please confirm this is acceptable.

---

## Proposed Folder Structure

The current flat structure will be reorganized for scalability (designed to support 4 apps):

```
app/
├── components/              # Shared UI components
│   ├── dashboard/           # Dashboard-specific components
│   │   ├── MetricCard.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── TopOffersTable.tsx
│   │   └── ConversionFunnel.tsx
│   ├── offers/              # Offer builder components
│   │   ├── OfferForm.tsx
│   │   ├── OfferCard.tsx
│   │   ├── ProductPicker.tsx
│   │   ├── RuleBuilder.tsx
│   │   └── OfferPreview.tsx
│   ├── analytics/           # Analytics components
│   │   ├── PerformanceChart.tsx
│   │   └── OfferStats.tsx
│   ├── settings/            # Settings components
│   │   ├── ApiKeyForm.tsx
│   │   ├── FeatureToggles.tsx
│   │   └── StylingOptions.tsx
│   └── shared/              # Reusable across features
│       ├── EmptyState.tsx
│       ├── StatusBadge.tsx
│       ├── ConfirmDialog.tsx
│       └── LoadingState.tsx
├── lib/                     # Business logic & utilities
│   ├── ai/                  # AI integration
│   │   ├── provider.server.ts      # AI provider factory
│   │   ├── openai.server.ts        # OpenAI implementation
│   │   ├── claude.server.ts        # Claude implementation
│   │   └── prompts.ts              # Prompt templates
│   ├── offers/              # Offer engine
│   │   ├── engine.server.ts        # Offer matching/ranking
│   │   ├── targeting.server.ts     # Targeting rules evaluator
│   │   └── types.ts                # Offer type definitions
│   ├── analytics/           # Analytics helpers
│   │   ├── tracker.server.ts       # Event tracking
│   │   └── aggregator.server.ts    # Metrics aggregation
│   └── utils/               # General utilities
│       ├── formatting.ts           # Price/date formatters
│       ├── validators.ts           # Input validation
│       └── constants.ts            # App-wide constants
├── graphql/                 # GraphQL queries & mutations
│   ├── products.ts
│   ├── orders.ts
│   ├── customers.ts
│   └── metaobjects.ts
├── routes/                  # React Router routes
│   ├── _index/              # Landing page (keep as-is, customize)
│   ├── auth.login/          # Auth (keep as-is)
│   ├── auth.$.tsx           # Auth catch-all (keep as-is)
│   ├── app.tsx              # App layout (update nav)
│   ├── app._index.tsx       # Dashboard (replace demo)
│   ├── app.offers.tsx       # Offers list
│   ├── app.offers.$id.tsx   # Single offer editor
│   ├── app.offers.new.tsx   # New offer form
│   ├── app.ai-rules.tsx     # AI Smart Rules
│   ├── app.analytics.tsx    # Analytics page
│   ├── app.settings.tsx     # Settings page
│   ├── api.offers.tsx       # API: offer data for extensions
│   ├── api.track.tsx        # API: analytics event tracking
│   ├── webhooks.app.uninstalled.tsx  # (keep)
│   └── webhooks.app.scopes_update.tsx # (keep)
├── styles/                  # CSS modules
│   ├── dashboard.module.css
│   ├── offers.module.css
│   ├── analytics.module.css
│   └── settings.module.css
├── db.server.ts             # Prisma client (keep)
├── shopify.server.ts        # Shopify config (update scopes)
├── entry.server.tsx         # SSR entry (keep)
├── root.tsx                 # Document (keep)
├── routes.ts                # Route config (keep)
└── globals.d.ts             # Type declarations

extensions/
├── post-purchase-upsell/    # Post-purchase checkout extension
│   ├── src/
│   │   └── index.tsx
│   ├── shopify.extension.toml
│   └── package.json
└── thank-you-upsell/        # Thank You / Order Status extension
    ├── src/
    │   └── index.tsx
    ├── shopify.extension.toml
    └── package.json

prisma/
└── schema.prisma            # Updated with AfterPulse models
```

---

## Proposed Changes

### Phase 1: Foundation & Architecture

Sets up the project structure, design system, and core infrastructure.

---

#### [MODIFY] [schema.prisma](file:///e:/Berjis/Apps/Shopify/after-pulse/prisma/schema.prisma)

Add all AfterPulse data models. The Session model is kept as-is.

**New models:**

```prisma
model Shop {
  id              String    @id @default(cuid())
  shopDomain      String    @unique
  aiProvider      String    @default("openai")   // "openai" | "claude"
  aiApiKey        String?                         // Encrypted
  enableAi        Boolean   @default(true)
  enablePostPurchase Boolean @default(true)
  enableThankYou  Boolean   @default(true)
  brandColor      String    @default("#0D9488")   // Deep teal
  accentColor     String    @default("#4F46E5")   // Indigo
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  offers          Offer[]
  analytics       AnalyticsEvent[]
}

model Offer {
  id              String    @id @default(cuid())
  shopId          String
  shop            Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  name            String
  type            String                          // "single" | "bundle" | "discount"
  status          String    @default("draft")     // "draft" | "active" | "paused" | "archived"
  priority        Int       @default(0)
  
  // Products
  productIds      String                          // JSON array of Shopify product GIDs
  discountType    String?                         // "percentage" | "fixed" | "free_shipping"
  discountValue   Float?
  
  // Targeting rules (JSON)
  targetProducts  String?                         // JSON: product/collection IDs to trigger on
  targetTags      String?                         // JSON: customer tags
  targetMinOrder  Float?                          // Minimum order value
  targetMaxOrder  Float?                          // Maximum order value
  targetCountries String?                         // JSON: country codes
  
  // Display
  headline        String    @default("You might also like...")
  description     String?
  imageUrl        String?
  placement       String    @default("thank_you") // "post_purchase" | "thank_you" | "order_status"
  
  // AI
  aiGenerated     Boolean   @default(false)
  aiPrompt        String?
  
  // Metrics (denormalized for performance)
  impressions     Int       @default(0)
  clicks          Int       @default(0)
  conversions     Int       @default(0)
  revenue         Float     @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  analytics       AnalyticsEvent[]
}

model AnalyticsEvent {
  id              String    @id @default(cuid())
  shopId          String
  shop            Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  offerId         String?
  offer           Offer?    @relation(fields: [offerId], references: [id], onDelete: SetNull)
  
  eventType       String                          // "impression" | "click" | "conversion" | "dismiss"
  orderId         String?                         // Shopify order GID
  revenue         Float?                          // Revenue attributed
  metadata        String?                         // JSON: extra event data
  
  createdAt       DateTime  @default(now())
}
```

---

#### [MODIFY] [shopify.app.toml](file:///e:/Berjis/Apps/Shopify/after-pulse/shopify.app.toml)

- Update `name` to `AfterPulse`
- Expand `access_scopes` to include: `read_products, write_products, read_orders, write_order_edits, read_customers, read_checkouts, write_metaobject_definitions, write_metaobjects, read_analytics`
- Add webhook subscriptions for `orders/create` (trigger offer matching)
- Remove demo metafield/metaobject definitions, add AfterPulse-specific ones

---

#### [MODIFY] [app.tsx](file:///e:/Berjis/Apps/Shopify/after-pulse/app/routes/app.tsx)

Update the app navigation to AfterPulse pages:

```tsx
<s-app-nav>
  <s-link href="/app">Dashboard</s-link>
  <s-link href="/app/offers">Offers</s-link>
  <s-link href="/app/ai-rules">AI Rules</s-link>
  <s-link href="/app/analytics">Analytics</s-link>
  <s-link href="/app/settings">Settings</s-link>
</s-app-nav>
```

---

#### [NEW] `app/lib/utils/constants.ts`

App-wide constants: branding colors, default AI prompts, offer types, placement options, targeting operators.

#### [NEW] `app/lib/utils/formatting.ts`

Currency formatting, date formatting, percentage helpers.

#### [NEW] `app/lib/utils/validators.ts`

Zod schemas for offer creation, settings updates, API key validation.

---

### Phase 2: Dashboard

Replace the demo index page with a real metrics dashboard.

---

#### [MODIFY] [app._index.tsx](file:///e:/Berjis/Apps/Shopify/after-pulse/app/routes/app._index.tsx)

Complete rewrite. The dashboard will show:
- **Header**: "AfterPulse Dashboard" with date range selector
- **Metric cards row**: Total Revenue Generated, AOV Lift %, Conversion Rate, Active Offers
- **Revenue chart**: Line chart showing revenue over time (using lightweight charting)
- **Top performing offers**: Table with offer name, impressions, conversions, revenue
- **Quick actions**: Create offer, view analytics, configure AI

The loader will query Prisma for aggregated analytics data.

#### [NEW] `app/components/dashboard/MetricCard.tsx`

Reusable metric card showing value, label, trend indicator (up/down arrow + percentage).

#### [NEW] `app/components/dashboard/TopOffersTable.tsx`

Table component showing top 5 offers by revenue with sparklines.

#### [NEW] `app/styles/dashboard.module.css`

Dashboard-specific styles: metric card grid, chart containers, responsive breakpoints.

---

### Phase 3: Offer Builder

Full CRUD for upsell offers with visual preview.

---

#### [NEW] `app/routes/app.offers.tsx`

Offers list page:
- Filterable table of all offers (name, type, status, impressions, conversions, revenue)
- Status badges (Draft, Active, Paused, Archived)
- Bulk actions (activate, pause, delete)
- "Create Offer" primary action button

#### [NEW] `app/routes/app.offers.new.tsx`

New offer creation form:
- **Step 1**: Offer type selection (Single Product, Bundle, Discount)
- **Step 2**: Product picker (using Shopify Resource Picker via App Bridge)
- **Step 3**: Discount configuration
- **Step 4**: Targeting rules
- **Step 5**: Display customization (headline, description, image)
- **Step 6**: Placement selection (Thank You, Order Status, Post-Purchase)
- **Step 7**: Review & activate

#### [NEW] `app/routes/app.offers.$id.tsx`

Offer edit page — same form as creation but pre-populated, with additional section showing performance metrics for this specific offer.

#### [NEW] `app/components/offers/OfferForm.tsx`

Multi-step form component with validation, auto-save draft support.

#### [NEW] `app/components/offers/ProductPicker.tsx`

Wrapper around App Bridge Resource Picker for selecting products/collections.

#### [NEW] `app/components/offers/RuleBuilder.tsx`

Visual rule builder for targeting conditions (AND/OR logic).

#### [NEW] `app/components/offers/OfferPreview.tsx`

Live preview of how the offer will appear to customers.

#### [NEW] `app/graphql/products.ts`

GraphQL queries for fetching product details, collections, variants.

---

### Phase 4: AI Smart Rules

---

#### [NEW] `app/routes/app.ai-rules.tsx`

AI Rules page:
- Toggle AI on/off
- Select AI provider + enter API key
- Define base rules (merchant preferences)
- "Generate Suggestions" button that calls AI to create offer recommendations
- Preview AI-generated offers before activating

#### [NEW] `app/lib/ai/provider.server.ts`

Factory pattern for AI providers. Selects OpenAI or Claude based on shop settings.

#### [NEW] `app/lib/ai/openai.server.ts`

OpenAI integration — sends order/product context, receives personalized offer suggestions.

#### [NEW] `app/lib/ai/claude.server.ts`

Anthropic Claude integration — same interface as OpenAI provider.

#### [NEW] `app/lib/ai/prompts.ts`

Prompt templates for:
- Generating upsell recommendations based on order contents
- Suggesting bundle combinations from product catalog
- Writing compelling offer headlines/descriptions

---

### Phase 5: Post-Purchase Extensions

---

#### [NEW] `extensions/thank-you-upsell/`

Checkout UI Extension for Thank You and Order Status pages:
- Extension target: `purchase.thank-you.block.render` and `customer-account.order-status.block.render`
- Fetches active offers from our `api.offers` endpoint
- Renders offer card with product image, title, price, discount badge
- "Add to order" button triggers order edit via API
- Tracks impressions and clicks

#### [NEW] `extensions/post-purchase-upsell/` *(if Shopify Plus support confirmed)*

Post-purchase extension:
- Extension target: `Checkout::PostPurchase::ShouldRender` and `Checkout::PostPurchase::Render`
- One-click upsell using existing payment token
- Uses `applyChangeset` to add items to order

#### [NEW] `app/routes/api.offers.tsx`

API endpoint for extensions to fetch relevant offers for a given order. Accepts order ID, evaluates targeting rules, returns matched offers ranked by priority.

#### [NEW] `app/routes/api.track.tsx`

API endpoint for extensions to report analytics events (impressions, clicks, conversions).

#### [NEW] `app/lib/offers/engine.server.ts`

Offer matching engine:
1. Load active offers for shop
2. Evaluate targeting rules against order context
3. Rank by priority + AI relevance score
4. Return top N offers

#### [NEW] `app/lib/offers/targeting.server.ts`

Rule evaluator: checks product matches, collection matches, customer tags, order value ranges, country codes.

---

### Phase 6: Analytics & Settings

---

#### [NEW] `app/routes/app.analytics.tsx`

Analytics page:
- Date range picker
- Overview metrics (same as dashboard but more detailed)
- Per-offer performance table with sorting/filtering
- Revenue by placement chart
- Conversion funnel visualization

#### [NEW] `app/routes/app.settings.tsx`

Settings page:
- **General**: Enable/disable post-purchase offers, enable/disable thank-you offers
- **AI Configuration**: Provider selection, API key input, test connection button
- **Styling**: Brand color picker, accent color picker, preview
- **Webhooks & Data**: View registered webhooks, export analytics data

#### [NEW] `app/lib/analytics/tracker.server.ts`

Server-side analytics tracker — creates `AnalyticsEvent` records.

#### [NEW] `app/lib/analytics/aggregator.server.ts`

Aggregation queries for dashboard metrics: revenue by day, conversion rates, AOV calculations.

#### [NEW] Webhook: `app/routes/webhooks.orders.create.tsx`

Handles `orders/create` webhook — evaluates if any offers were shown for this order to attribute conversions.

---

## Open Questions

> [!IMPORTANT]
> 1. **AI Provider**: Which AI provider should we implement first — OpenAI or Claude? Both will be supported eventually, but we'll start with one.

> [!IMPORTANT]
> 2. **Shopify Plus**: Should we include the post-purchase (between payment and thank-you) extension? This requires Shopify Plus. Or should we focus only on Thank You / Order Status page extensions which work for all plans?

> [!IMPORTANT]
> 3. **Charting Library**: For dashboard charts, I'll use a lightweight approach. Options:
>    - **Chart.js** (popular, full-featured, ~60KB)
>    - **Lightweight custom SVG** (no dependency, simpler charts)
>    - Which do you prefer?

> [!NOTE]
> 4. **Landing Page**: The `_index` route (non-authenticated landing page) currently shows placeholder text. Do you want me to design a proper AfterPulse marketing landing page, or leave it minimal for now?

---

## Verification Plan

### Automated Tests
1. `npm run typecheck` — TypeScript compilation check after each phase
2. `npx prisma validate` — Schema validation after Phase 1
3. `npx prisma migrate dev` — Run migrations successfully
4. `npm run lint` — ESLint passes
5. `npm run build` — Production build succeeds

### Manual Verification
1. **Phase 1**: `npm run dev` → app loads, new navigation visible, database migrates cleanly
2. **Phase 2**: Dashboard renders with empty state, metric cards display zeros gracefully
3. **Phase 3**: Create/edit/delete offers, verify Prisma records via Shopify CLI
4. **Phase 4**: AI suggestion generation works (requires API key)
5. **Phase 5**: Extensions appear in Shopify checkout preview (via `shopify app dev`)
6. **Phase 6**: Analytics page shows data after simulating events, settings persist

### Browser Testing
- Navigate all pages within the embedded Shopify admin
- Test responsive layout at mobile/tablet/desktop breakpoints
- Verify App Bridge integration (Resource Picker, Toast notifications)
