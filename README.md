# UC Enterprises - Industrial Supply Ecommerce

![UC Enterprises Logo](/public/logo.jpg)

A premium, high-performance B2B & B2C ecommerce platform built for **UC Enterprises**, a leading supplier of hardware welding materials, electronic goods, lab chemicals, powders, and general industrial requirements across India.

## 🚀 Tech Stack

- **Framework**: [Next.js 14.1.0](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL database, GoTrue Auth & Storage)
- **Styling**: [Tailwind CSS 3.4.1](https://tailwindcss.com/) (with tailwindcss-animate)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) & [Base UI](https://base-ui.com/) (Radix UI primitives)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Rich Text Editor**: [Tiptap Editor](https://tiptap.dev/)
- **Payment Gateway**: [Razorpay](https://razorpay.com/)
- **Email Delivery**: [Brevo (Sendinblue)](https://www.brevo.com/)
- **Testing**: [Vitest](https://vitest.dev/)

## ✨ Key Features

### 🛒 Storefront
- **Dynamic Catalog**: Browse products across Hardware, Electronics, Chemicals, and General Supplies.
- **Advanced Search**: Instant product discovery via `HeaderSearch` component.
- **Inquiry System**: "Bulk Enquiry / Get Quote" functionality for bulk/B2B industrial orders.
- **User Accounts & Billing**: Profile management, order tracking, dynamic wishlists, and a secure portal to download GST tax invoices.
- **Payment Gateway**: Secure online checkout integrated with Razorpay (payment creation, client verification, and secure webhooks).
- **Responsive Design**: Optimized for Desktop, Tablet, and Mobile devices with a premium glassmorphic aesthetic.

### 🛠 Admin Console
- **Dashboard**: Real-time business metrics (revenue, sales, orders, average order value) and notifications.
- **Product Management**: 
  - Multi-image support with Supabase Storage integration.
  - Rich text description and specification inputs via custom Tiptap Editor.
  - Inventory tracking and status management.
- **Category Management**: Customizable category metadata and department mapping.
- **Order Operations**: 
  - Manage orders and status tracking.
  - Export orders as **PDF** or **CSV** reports.
- **Inventory Management**: Native WooCommerce-style inventory tracking with PostgreSQL row-level locks, variant-level stock, atomic ledger transactions, and auto-expiring background cart reservations.
- **Invoice System**: Fully automated, GST-compliant PDF tax invoice generation, secure Supabase Storage integration, and automatic dispatch via Brevo email queue.
- **Security & Logs**: Admin security tracking and activity logging.

### 📈 Marketing & Analytics Attribution
- **UTM Tracking**: Automatic capturing of standard marketing parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`).
- **Click Identifiers**: Capture ad-click parameters including Google (`gclid`), Meta (`fbclid`), Microsoft (`msclkid`), and TikTok (`ttclid`).
- **Attribution Logic**: Retain first-touch attribution (original source) and track latest-touch attribution in local storage and cookies.
- **URL Decoration**: Outbound relative and same-origin links are automatically appended with active tracking parameters.
- **Analytics Integration**: Real analytics tracking with Google Analytics (`gtag`) and Meta Pixel (`fbq`).

### 🔍 Search Engine Optimization (SEO)
- **Dynamic Metadata & JSON-LD**: Comprehensive generation of Server-Side Metadata, Open Graph tags, Twitter Cards, and structured data schemas (`CollectionPage`, `BreadcrumbList`, `ItemList`, `FAQPage`) for enhanced Google Rich Snippets.
- **Indexability & Crawling**: Fully optimized `robots.txt` configuration, wildcard directives, dynamic Canonical URLs preventing duplicate content, and properly structured `/categories/[slug]` routing.
- **Automated Sitemaps**: Dynamic `sitemap.xml` generation mapped to the PostgreSQL database, including Image Sitemap integration for Google Image Search discovery.
- **Page Performance**: Implemented paginated canonicalization, `noindex` rules for deep search boundaries, and Next.js Image caching to improve Core Web Vitals.

## 🛠 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd uc-enterprises
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and configure the variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Razorpay Gateway
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

   # Brevo Email SMTP/API
   BREVO_API_KEY=your_brevo_api_key
   BREVO_SENDER_EMAIL=your_sender_email
   BREVO_SENDER_NAME=your_sender_name
   ```

4. **Initialize Database Schema (Supabase)**:
   - Run the schema definitions found in `supabase/customer-commerce.sql` to set up wishlist constraints and review schemas.
   - Run the queries in `supabase/seed.sql` to populate category lists and default products.

5. **Run development server**:
   ```bash
   npm run dev
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

7. **Start production server**:
   ```bash
   npm run start
   ```

## 🧪 Testing

The codebase uses **Vitest** for unit testing. To run the tests:

```bash
npx vitest
```

## 📁 Project Structure

- `src/app/(auth)`: Authentication routes (login, registration, password recovery).
- `src/app/(customer)`: Customer storefront pages (Storefront, Catalog, Cart, Checkout, Profile).
- `src/app/admin`: Comprehensive administrative dashboard and metrics console.
- `src/components`: Reusable UI components (Admin modules, Customer catalog components, shared UI elements).
- `src/lib`: Shared helper utilities, tracking scripts, and design configurations.
- `src/utils/supabase`: Client, server, and middleware initialization helpers for Supabase database.
- `supabase`: Database schemas, policy creation scripts, and SQL seed files.
- `public`: Static assets including favicons, product placeholders, and icons.

## 📄 License

Internal use only for **UC Enterprises**. All rights reserved.
