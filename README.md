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
- **Flipkart-Style Returns & Replacements**: Guided 3-step returns/replacements wizard requesting reasons, comments, and mandatory damage photo uploads (linked with Supabase Storage). Supports bank details input for COD refunds, and free replacements with automated reverse logistics.
- **Cancellation Reason Modal**: Customer cancellation workflows are restricted through structured reason dropdowns and logged remarks.
- **Granular Shipment Tracking**: Interactive vertical timeline showing logistics status for outbound (Label Created -> In Transit -> Out for Delivery -> Delivered) and inbound (Pickup Scheduled -> Picked Up -> In Transit -> Returned to Warehouse) shipments.
- **Logistics Partner Integration**: Clickable shipment tracking cards supporting direct external navigation to real delivery partners (**Delhivery**, **Blue Dart**, **FedEx**, **DHL**, **DTDC**, **Ekart**) with dynamic, real-time shipment status badges.
- **Payment Gateway**: Secure online checkout integrated with Razorpay (payment creation, client verification, and secure webhooks).
  - **Reservation Pattern**: Inventory is placed on hold the moment checkout begins.
  - **Optimistic Cleanup**: Orders are instantly cancelled and stock is released if the user closes the payment window.
  - **Timeout Safety Net**: A background PostgreSQL cron job cleans up abandoned orders after 30 minutes, automatically releasing reserved stock.
  - **Edge-case Handling**: Automatically processes "Ghost/Late Payments" (auto-refunds payments that arrive after order expiration) and securely syncs external Razorpay Dashboard refunds with the internal Credit Note system.
- **Proper Indian GST Architecture**: 
  - **Hierarchical Inheritance**: Subcategories and products automatically inherit HSN codes and exact IGST/CGST/SGST rates from the Main Category, preventing manual data-entry errors.
  - **Inter-state vs Intra-state**: Dynamically calculates split tax rates based on the origin state (Punjab) vs destination state.
  - **Zero-Trust Order Math**: Recalculates all subtotal, discount, shipping, and tax permutations securely on the server-side, ignoring client payload tampering.
- **Responsive Design**: Optimized for Desktop, Tablet, and Mobile devices with a premium glassmorphic aesthetic.

### 🛠 Admin Console
- **Dashboard**: Real-time business metrics (revenue, sales, orders, average order value) and notifications.
- **Product Management**: 
  - Multi-image support with Supabase Storage integration.
  - Rich text description and specification inputs via custom Tiptap Editor.
  - Inventory tracking and status management.
- **Category Management**: Customizable category metadata and department mapping.
- **Order Operations**: 
  - Manage orders, status tracking, and transition logs.
  - Export orders as **PDF** or **CSV** reports.
- **Logistics Sync Cron**: Scheduled background endpoint (`/api/cron/sync-shipments`) and manual detail controls (Sync Courier button) to automate tracking updates and automatically progress orders to `DELIVERED`, `RETURNED`, or `REPLACED`.
- **Inventory Management**: Native WooCommerce-style inventory tracking with PostgreSQL row-level locks, variant-level stock, atomic ledger transactions, and auto-expiring background cart reservations.
- **Invoice System**: Fully automated, GST-compliant PDF tax invoice generation, secure Supabase Storage integration, and automatic dispatch via Brevo email queue. Uses a bundled base64 logo asset to ensure reliable serverless execution on Vercel (avoiding filesystem and network fetch errors).
- **Storefront Feature Toggles**: Dynamic toggles in admin settings page to customize store features (e.g. enable/disable Frequently Bought Together product sections).
- **Security & Logs**: Admin security tracking and activity logging.

### 📈 Marketing & Analytics Attribution
- **UTM Tracking**: Automatic capturing of standard marketing parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`).
- **Click Identifiers**: Capture ad-click parameters including Google (`gclid`), Meta (`fbclid`), Microsoft (`msclkid`), and TikTok (`ttclid`).
- **Attribution Logic**: Retain first-touch attribution (original source) and track latest-touch attribution in local storage and cookies.
- **URL Decoration**: Outbound relative and same-origin links are automatically appended with active tracking parameters.
- **Analytics Integration**: Real analytics tracking with Google Analytics (`gtag`) and Meta Pixel (`fbq`).

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

The codebase uses **Vitest** for unit testing. 

### Running Tests
To run all tests once:
```bash
npm run test
```

To run tests in watch/interactive mode:
```bash
npx vitest
```

### Coverage
- **Invoice Generator Action**: Comprehensive unit tests ([tests/invoice-generator.test.ts](file:///c:/Users/SubodhRana/Downloads/uc%20enterprises/tests/invoice-generator.test.ts)) covering:
  - CGST/SGST (Tax Inclusive & Exclusive) calculations.
  - IGST calculations.
  - Failures: Invoice not found, items query error, storage upload failures, database updates.
  - Bundled asset integration (serverless-safe logo rendering).

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
