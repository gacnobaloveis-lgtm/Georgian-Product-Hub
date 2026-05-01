# Georgian Market Web Application

## Overview
A web application for the Georgian market with full product CRUD management, image gallery/album system, and a product catalog. All UI labels are in Georgian, using the FiraGO font. Currency is displayed in GEL (₾).

## Tech Stack
- **Frontend**: React + TypeScript, TailwindCSS, Shadcn/UI, Wouter routing, TanStack Query
- **Backend**: Node.js, Express
- **Database**: PostgreSQL via Drizzle ORM
- **Image Processing**: Sharp (resize to 800px, WebP conversion)
- **File Upload**: Multer (multipart/form-data)
- **Security**: express-session, helmet, express-rate-limit

## Architecture

### Pages
- `/` — Public product catalog (customer-facing, clean grid with images, prices in ₾)
- `/admin-login` — Admin login page (secret key authentication)
- `/admin-dashboard` — Admin panel with product table, Edit and Delete buttons per product (auth-protected)
- `/admin-add` — Form to add new products with file upload (auth-protected)

### Database Tables
- `products` — id (serial), name, description, original_price, discount_price, youtube_url, image_url, album_images, category_id
- `media` — id (serial), filename, original_name, path, size, created_at
- `categories` — id (serial), name, icon (text, nullable - Lucide icon name)

### API Endpoints
- `GET /api/products` — List all products (public)
- `POST /api/products` — Create a product (admin-only)
- `GET /api/products/:id` — Get single product (public)
- `PUT /api/products/:id` — Update product (admin-only)
- `DELETE /api/products/:id` — Delete a product (admin-only)
- `GET /api/products/category/:categoryId` — Get products by category (public)
- `GET /api/media` — List all uploaded media (public)
- `POST /api/media/upload` — Upload images (admin-only)
- `DELETE /api/media/:id` — Delete a media item (admin-only)
- `GET /api/categories` — List categories (public)
- `POST /api/categories` — Create category (admin-only)
- `PATCH /api/categories/:id` — Update category icon/name (admin-only)
- `DELETE /api/categories/:id` — Delete category (admin-only)
- `POST /api/orders/credit` — Create order using credit balance (authenticated)
- `POST /api/admin/login` — Admin login with secret key
- `POST /api/admin/logout` — Admin logout
- `GET /api/admin/status` — Check admin session status
- `GET /api/sync-check` — Check uploads vs DB sync (admin-only)

### Security
- **Authentication**: Secret-key based admin login via `ADMIN_SECRET_KEY` env var
- **Session Management**: express-session with `SESSION_SECRET` (Replit Secret only — never committed). In production, `getSession()` throws if `SESSION_SECRET` is missing or shorter than 32 chars; dev uses an ephemeral random fallback.
- **Production Fail-Closed Startup**: If `setupAuth()` fails in production, `initializeApp()` calls `process.exit(1)` instead of marking the app ready.
- **Admin Seeding**: `seedAdminUser()` refuses to create the admin account unless `ADMIN_USER_PASSWORD` is set and ≥12 chars. No hardcoded fallback password.
- **SEO Crawler XSS Hardening**: `/product/:id` social-bot HTML branch escapes every interpolated product field (name, description, imageUrl, productUrl, price) via `escHtml()` before injecting into Open Graph / Twitter meta tags.
- **Admin Middleware**: `requireAdmin` middleware on all mutating routes (POST/PUT/DELETE)
- **Rate Limiting**: 200 requests per 15 minutes on `/api/` routes via express-rate-limit
- **Security Headers**: Helmet middleware (CSP disabled for compatibility)
- **Input Sanitization**: HTML entity encoding on user inputs (name, description, youtubeUrl)
- **File Validation**: MIME type whitelist (JPEG, PNG, WebP, GIF, BMP), 10MB size limit
- **Path Validation**: Album image paths validated to start with `/uploads/`
- **Filename Sanitization**: Special characters stripped from uploaded filenames
- **Frontend Route Guards**: `AdminRoute` component redirects unauthenticated users to `/admin-login`
- **Patched Dependencies (May 2026 hardening pass)**: `multer@2.1.1`, `express-rate-limit@8.2.2`, `drizzle-orm@0.45.2`, `path-to-regexp@8.4.0`, `lodash@4.18.1`. Production-runtime HIGH CVEs: 0. Remaining HIGH advisories are in dev-only build packages (vite, rollup, minimatch, picomatch).

### Key Directories
- `shared/` — Schema (Drizzle + Zod) and API route contracts
- `server/` — Express backend (routes, storage, db connection)
- `client/src/pages/` — React page components
- `client/src/hooks/` — Custom hooks (useProducts, useMedia, useAdmin, useCategories)
- `client/src/components/` — Reusable UI components (AdminRoute, AnimatedShell, GlassPanel, TopBar)
- `public/uploads/` — Processed uploaded images (WebP, 800px width)

## Image Handling
- All uploaded images are resized to 800px width, converted to WebP (quality 82) via Sharp
- Saved to `public/uploads/` directory
- Served via `express.static('public')` + dedicated `/uploads` route with cache headers
- Image paths stored in DB as `/uploads/filename.webp`
- Frontend uses `ImgWithFallback` component — shows placeholder SVG if image is missing
- Editing a product without uploading a new image preserves the existing image path
- Sync check endpoint verifies files on disk match database entries

## Category System
- Categories stored in `categories` table (id, name)
- Products have `categoryId` field linking to categories
- Category filtering via sidebar (desktop) and bottom drawer (mobile)
- `/api/products/category/:categoryId` endpoint for filtered product lists
- Custom fishing equipment icons per category via `getCategoryIcon()` helper

## Mobile-First UI (< 768px)
- **Bottom Navigation**: Fixed bottom bar with Home, Categories, Search, Admin icons (60px height, safe-area-aware)
- **Category Drawer**: Full-screen Sheet overlay from bottom (85vh) with all categories
- **Search Drawer**: Full-screen Sheet overlay from top with instant product search
- **Product Grid**: 2 columns on mobile, 3 on sm+ breakpoint
- **Touch Targets**: All buttons minimum 44px height (`min-h-[44px]`)
- **Responsive Text**: Smaller text sizes on mobile, scaling up on sm+
- **Desktop Sidebar**: Hidden on mobile (`hidden lg:block`), sticky sidebar on large screens
- **Desktop Nav**: Hidden on mobile (`hidden md:block`), shown on medium+
- **Bottom Padding**: `pb-20` on mobile to account for fixed bottom nav

## Localization
- All UI text is in Georgian
- FiraGO font loaded via Google Fonts
- UTF-8 support for Georgian characters in database
- Currency symbol: ₾ (GEL)

## User Authentication (Replit Auth + Facebook)
- Google/GitHub/email login via Replit Auth (OpenID Connect)
- Facebook Login via passport-facebook (OAuth 2.0)
  - Env vars: `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET`
  - Facebook users stored with `fb_` prefixed ID in users table
  - Callback URL dynamically generated from `req.hostname`
  - `isAuthenticated` middleware handles both OIDC and Facebook sessions
  - Logout redirects Facebook users to `/` instead of OIDC end-session
- Users table stores: id, email, firstName, lastName, profileImageUrl, address, city, phone, createdAt, updatedAt
- Sessions stored in PostgreSQL `sessions` table (7-day TTL)
- Admin panel "Users" section shows all registered users in a table

## Shopping Cart
- Cart stored in localStorage (no login required to add items)
- Cart hook: `client/src/hooks/use-cart.ts` with CartContext provider in App.tsx
- CartDrawer: `client/src/components/CartDrawer.tsx` — bottom sheet with item list, selection, checkout
- Cart icon in mobile bottom nav and desktop nav with red badge showing item count
- Users can add products from ProductDetail page (validates color selection and stock)
- Cart items: productId, name, price, imageUrl, quantity, selectedColor, maxStock
- Select/deselect individual items or all at once for batch purchase
- Quantity adjustable in cart (min 1, max stock)
- "ყიდვა" button only appears when items are selected, shows total price
- Login required only at checkout (when clicking buy on selected items)
- Checkout creates separate orders for each selected cart item
- Successfully ordered items are automatically removed from cart

## Purchase / Order System
- Direct "ყიდვა" button on ProductDetail still works for single-item purchase
- "კალათა" button on ProductDetail adds item to cart
- Form fields: fullName (manual), country (auto "საქართველო"), city (dropdown of Georgian cities), address (manual), phone (manual)
- If user is not logged in, form data is saved to sessionStorage and user is redirected to Google Auth; after login the order is auto-submitted
- If user is already logged in, order is created immediately and user profile is updated with address/city/phone
- Orders table: id, userId, productId, productName, productPrice, quantity, fullName, country, city, address, phone, status, createdAt
- Products have optional `shippingPrice` field set by admin
- Quantity counter on ProductDetail page (min 1, +/- buttons)
- PurchaseDialog shows price breakdown: unit price × quantity, shipping, and total
- Admin panel has "შეკვეთები" (Orders) section showing all orders in a table
- API endpoints: POST /api/orders, GET /api/orders/my, GET /api/admin/orders, GET /api/profile, PUT /api/profile

## Referral System
- Each user gets a unique `referralCode` (6 chars, e.g., "GIO123") auto-generated on first profile load
- Users table has `referral_code` (unique varchar) and `my_credit` (numeric, default 0) columns
- Share button on product cards opens Facebook sharer with `?ref=CODE` appended to the product URL
- Middleware reads `?ref=` query param and stores it in an httpOnly cookie for 30 days
- On order creation, if a `ref` cookie exists:
  - Looks up the referrer by referral code
  - Anti-fraud: referrer must be a different user than the buyer (`referrer.id !== userId`)
  - Credit amount is configurable via `site_settings` table (default 5)
  - Adds configured credit to the referrer's `myCredit` balance
  - Creates a `referral_logs` entry tracking: referrer, buyer, order, product, credit awarded
  - Clears the ref cookie
- Profile page shows "ჩემი კრედიტი" balance and referral code with copy button
- Dependencies: cookie-parser

### Referral Admin (ავტო-ძრავა section)
- **სტატისტიკა tab**: Product sold/view counts with inline editing
- **გადაზიარებები tab**: Referral log history — shows referrer name, buyer name, product, price, credit awarded, date
- **კრედიტის მართვა tab**: Configure credit per sale and credit-to-GEL exchange rate (admin-only for saving)
- DB tables: `referral_logs` (referrer_user_id, buyer_user_id, order_id, product_name, product_price, credit_awarded, created_at), `site_settings` (key/value pairs)
- API: GET /api/admin/referral-logs, GET /api/admin/settings, PUT /api/admin/settings (admin-only)

### Analytics (ანალიტიკა section)
- Tracks visitor referrer sources (which websites send traffic)
- Middleware records every page visit: referrer domain, URL, page path, user-agent
- Filters out own-domain referrers (self-visits) and API/asset requests
- "პირდაპირი შესვლა" label for direct visits (no referrer)
- Time period filter: 1 day, 7 days, 30 days, 90 days
- Shows total visits count and per-source breakdown with percentage bars
- DB table: `page_visits` (referrer_domain, referrer_url, page_path, user_agent, created_at) with indexes
- API: GET /api/admin/analytics?days=7 (admin-only)

## Admin Role System (4 Levels)
- **admin** — Full access to all sections (products, orders, site management, users, statuses, autodrava)
- **moderator** — Access to: products, orders, users, autodrava (no site management, no statuses, no user deletion)
- **sales_admin** (გაყიდვების ადმინი) — Access to: orders only; sees "გაყიდვების პანელი" title
- **user** — Regular user, no admin panel access; admin link hidden
- Users table has `role` column (varchar, default "user")
- Admin panel link only visible to users with admin/moderator/sales_admin role (checked via `user.role`)
- Same admin password for all roles; after password login, session role is set from DB role
- Role assignment via "სტატუსები" section in admin panel (admin-only)
- `requireAdminOnly` middleware restricts role changes and user deletion to full admins only

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-managed)
- `SESSION_SECRET` — Express session secret
- `ADMIN_PASSWORD` — Secret key for admin authentication
- `AUTH_FACEBOOK_ID` — Facebook App ID for OAuth login
- `AUTH_FACEBOOK_SECRET` — Facebook App Secret for OAuth login
