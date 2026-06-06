# UC Enterprises - Industrial Supply Ecommerce

![UC Enterprises Logo](/public/logo.jpg)

A premium, high-performance ecommerce platform built for **UC Enterprises**, a leading supplier of hardware welding materials, electronic goods, lab chemicals, powders, and general industrial requirements across India.

## 🚀 Tech Stack

- **Framework**: [Next.js 16.2.4](https://nextjs.org/) (App Router & Turbopack)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL & GoTrue)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) & [Base UI](https://base-ui.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Rich Text**: [CKEditor 5](https://ckeditor.com/ckeditor-5/)

## ✨ Key Features

### 🛒 Storefront
- **Dynamic Catalog**: Browse products across Hardware, Electronics, Chemicals, and General Supplies.
- **Advanced Search**: Instant product discovery via `HeaderSearch`.
- **Inquiry System**: "Bulk Enquiry / Get Quote" functionality for industrial orders.
- **User Accounts**: Profile management, wishlist, and order tracking.
- **Responsive Design**: Optimized for Desktop, Tablet, and Mobile with a premium "Glassmorphism" aesthetic.

### 🛠 Admin Console
- **Dashboard**: Real-time business metrics and order notifications.
- **Product Management**: 
  - Multi-image support with Supabase Storage integration.
  - Rich text descriptions via CKEditor.
  - Inventory tracking and status management.
- **Category Management**: Customizable category icons and departmental mapping.
- **Order Operations**: 
  - Export orders as **PDF** or **XLS**.
  - Detailed tracking and status updates.
- **Payment & Tax**: Downloadable CSV reports and tax documentation.

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
   Create a `.env` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm run start
   ```

## 📁 Project Structure

- `src/app/(customer)`: Customer-facing routes (Storefront, Account).
- `src/app/admin`: Comprehensive administrative dashboard.
- `src/components`: Reusable UI components (Admin, Storefront, UI).
- `src/lib`: Shared utilities, constants, and design tokens.
- `src/utils/supabase`: Database client configurations (Client, Server, Middleware).
- `public`: Static assets including the official brand logo and favicon.

## 📄 License

Internal use only for **UC Enterprises**. All rights reserved.
