# V4V Agricultural Marketplace — Proposal & Pricing

**Prepared for:** KBS / AGRA  
**Date:** July 2026  
**Status:** Proof of Concept Delivered

---

## 1. What Has Been Delivered

### Core Platform

| Feature | Status |
|---|---|
| 9-role marketplace (SHF, Aggregator, Input Vendor, Logistics, BDSP, KBS, AGRA, Investor, V4V Admin) | Delivered |
| Dual-lock Proof of Delivery escrow engine | Delivered |
| Commission engine — 5-way automated revenue split (V4V, BDSP, Insurance Provider, Gateway Reserve, Operations Reserve) | Delivered |
| Buyer-side markup financial model (seller receives 100% net payout) | Delivered |
| Role-based dashboards — 9 distinct views with metrics, tables, and filters | Delivered |
| NDPC consent pipeline (mandatory `ndpc_consent=true` on registration) | Delivered |
| NITDA-compliant audit logging (`activity_log` table captures all write operations) | Delivered |
| PostgreSQL enterprise schema — 7 relational tables with CHECK constraints, FK cascades, generated columns | Delivered |
| Performance indexes on `actors(actor_type, state)`, `transactions(status)`, and 11 additional columns | Delivered |
| 30 seed actors across all 9 roles with realistic Nigerian names, bank details, and BDSP network relationships | Delivered |

### WhatsApp Channel

| Feature | Status |
|---|---|
| OTP-based registration via WhatsApp (all 9 roles) | Delivered |
| Bank details capture during signup (`bank_name`, `account_number`) | Delivered |
| Harvest posting via WhatsApp chat | Delivered |

### Document Engines

| Feature | Status |
|---|---|
| PDF escrow account confirmation vouchers | Delivered |
| PDF digital insurance certificates | Delivered |
| Partner mock services (NAIC/AXA insurance quotes, bank loan approval, bank payout) | Delivered |

### Reporting & Compliance

| Feature | Status |
|---|---|
| Completed transactions report (date range, gender, and BDSP ID filters) | Delivered |
| Farmer participation report (gender and BDSP ID filters, repeat seller tracking) | Delivered |
| Financial summary — by status with V4V/BDSP commission breakdown | Delivered |
| Escrow status ledger | Delivered |
| Gender-disaggregated KPIs for IFC/AGRA donor reporting | Delivered |
| CSV export on all reports (NDPR-compliant) | Delivered |

### AI Integration (Proof of Concept Placeholders)

| Feature | Status |
|---|---|
| V4V Farm Advisor chatbot UI (crop advice, premium subscription model — ₦500/month) | Delivered |
| AI harvest health scanner (spoilage risk detection, pay-per-scan — ₦50) | Delivered |
| Market trend price forecast (48hr early alerts — ₦1,000/month) | Delivered |
| Risk & yield prediction for banks (B2B SaaS — ₦2,000/farmer profile) | Delivered |
| IFAD/AGRA AI impact report generator (₦500,000 per report) | Delivered |

---

## 2. Pricing Breakdown

| Line Item | Amount (NGN) |
|---|---|
| Core platform — 9-role marketplace, dual-lock escrow, commission engine, compliance pipeline | ₦1,200,000 |
| WhatsApp channel — OTP registration, harvest posting, bank details capture | ₦300,000 |
| Document engines — escrow vouchers, insurance certificates, partner mocks | ₦200,000 |
| Reporting & analytics — 4 report types with gender/BDSP filtering, CSV export | ₦200,000 |
| AI integration POC — 5 placeholder UIs with monetization pathways | ₦100,000 |
| **Subtotal — Platform Delivery** | **₦2,000,000** |
| Landing page (3 sub-pages) + domain setup (.com.ng) + custom email (Zoho) + DNS configuration | ₦300,000 |
| 1-month post-handover support | ₦200,000 |
| **Total** | **₦2,500,000** |

---

## 3. Landing Page & Domain Setup (Included)

### What You Get

- **3-page landing site** — Home, How It Works, About/Partners
- Navigation bar with link to the login/register page
- **Custom domain** — registered under `.com.ng` (purchased via Go54)
- **Custom email** — Zoho Mail setup (`yourname@yourdomain.ng`, up to 5 users, free tier)
- **DNS configuration** — MX records for email, A/CNAME records for the web platform
- Deployment on Render (HTTPS/SSL included)

### Page Content (Suggested)

| Page | Content |
|---|---|
| **Home** | Hero section with platform value proposition, partner logos (KBS, AGRA), "Login" and "Register" buttons |
| **How It Works** | Step-by-step flow: Register → Post harvest → Match with buyer → Escrow locks → POD confirms → Payout. Simple illustrations, no code. |
| **About / Partners** | KBS and AGRA partnership story. Mission statement: "0% smartphone exclusion for Nigerian smallholders." NDPC compliance badge. |

---

## 4. 1-Month Post-Handover Support

**Duration:** 30 calendar days from handover

### Included

- Render hosting health monitoring (uptime checks, database connectivity)
- Database backup routine setup and verification
- Environment variable documentation and rotation
- Minor bug fixes (errors in existing features — not new feature requests)
- WhatsApp bot connectivity checks
- One round of copy/text changes on the landing page

### Not Included

- New feature development
- Payment gateway integration (Paystack, Flutterwave, etc.)
- SMS/USSD channel development
- Mobile app development
- Training or user onboarding sessions
- Content creation (page copy, images, partner logos — client provides these)

---

## 5. Handover Document (Included)

At handover you will receive a one-page PDF containing:

| Item | Details |
|---|---|
| **Database credentials** | Hostname, port, database name, username, connection string (Render PostgreSQL dashboard link) |
| **Platform URLs** | Frontend URL, backend API base URL, Render dashboard login |
| **Environment variables** | Full `.env` key list with descriptions (values redacted — filled in during handover call) |
| **Admin access** | V4V Admin login credentials for the platform (phone + password) |
| **Restart procedure** | Command to restart the backend service if it goes down |
| **WhatsApp bot setup** | Webhook URL, phone number ID, access token location |
| **Backup schedule** | When database backups run and where they are stored |
| **Support contact** | Your email/phone for the 30-day support window |
| **Known limitations** | What is not yet automated, what requires manual attention |

---

## 6. What Is NOT Included (Important)

Be clear about these to avoid scope creep:

- **Payment gateway integration** — The escrow engine works with internal wallets only. Integrating Paystack, Flutterwave, or any real payment processor is a separate project.
- **SMS/USSD channel** — The platform architecture supports it, but no USSD shortcode or SMS gateway has been provisioned.
- **Mobile app** — The web app is mobile-responsive but no native Android/iOS app has been built.
- **Real AI models** — The 5 AI features are placeholder UIs demonstrating monetization pathways. They do not connect to any machine learning model or external AI API.
- **User onboarding/training** — Not included. Client is responsible for training the 60 SHFs and 2 BDSPs in Chikun LGA.
- **Content** — Landing page copy, partner logos, and images must be provided by the client.

---

## 7. Next Steps

1. Client confirms proposal and provides: partner logos (KBS, AGRA), landing page copy, preferred domain name
2. Domain purchased via Go54, custom email configured on Zoho
3. Landing page built and deployed
4. Platform deployed to Render (frontend + backend)
5. Handover document delivered
6. 30-day support window begins

---

## 8. Payment Terms (Suggested)

| Milestone | Percentage | Trigger |
|---|---|---|
| Signing | 50% | Proposal accepted |
| Landing page + domain live | 25% | Site deployed, domain resolving, email working |
| Platform deployed + handover | 25% | Platform live on Render, handover document received |

---

*All prices in Nigerian Naira (NGN). Prices exclusive of third-party costs (domain registration ₦1,500–3,000/year, Render hosting free tier — upgrade if traffic exceeds limits).*
