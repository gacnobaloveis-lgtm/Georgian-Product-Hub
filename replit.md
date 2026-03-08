# Georgian Market Web Application

## Overview
This project is a web application designed for the Georgian market, featuring comprehensive product management, an image gallery system, and a public product catalog. The primary goal is to provide a localized e-commerce experience with all UI labels in Georgian, using the FiraGO font, and displaying currency in Georgian Lari (₾). The application supports a full product CRUD cycle, user authentication, a shopping cart, an order system, and a referral program. It aims to offer a robust and user-friendly platform for both administrators and customers, with a focus on mobile-first design and SEO.

## User Preferences
The user wants all UI text to be in Georgian and currency displayed in GEL (₾). The application should have a mobile-first design with specific UI components for smaller screens. The user prioritizes security, performance, and clear administrative control over content and users. They expect dynamic SEO features for product pages and a comprehensive analytics section.

## System Architecture

### UI/UX Decisions
- **Localization**: All UI labels in Georgian, FiraGO font, GEL (₾) currency.
- **Mobile-First Design**: Responsive layout with specific adaptations for mobile (bottom navigation, full-screen drawers for categories and search, 2-column product grid, 44px minimum touch targets).
- **Admin Panel**: Dedicated sections for product management, orders, users, referrals, visual settings, and analytics.
- **Image Display**: Product catalog with clean grid, `ImgWithFallback` for missing images.
- **Color Scheme/Templates**: Not explicitly defined but implies a clean, functional design based on Shadcn/UI and TailwindCSS.

### Technical Implementations
- **Frontend**: React + TypeScript, TailwindCSS, Shadcn/UI for components, Wouter for routing, TanStack Query for data fetching.
- **Backend**: Node.js with Express.
- **Database**: PostgreSQL managed with Drizzle ORM.
- **Image Processing**: Sharp library for resizing images to 800px width and converting them to WebP format (quality 82). Images are stored in `public/uploads/` AND in the PostgreSQL database (`media.data` bytea column) for persistence across deployments. The `/uploads/:filename` route serves from filesystem first, falling back to database if the file doesn't exist on disk.
- **File Upload**: Multer for handling `multipart/form-data` uploads with MIME type validation and size limits.
- **Authentication**:
    - **Admin**: Secret-key based login with `ADMIN_SECRET_KEY` environment variable.
    - **User**: Phone number and password-based registration and login, with scrypt for password hashing. Guest users are supported.
    - **Session Management**: `express-session` with httpOnly cookies and 7-day TTL in PostgreSQL.
- **Security**:
    - `express-session` for session management.
    - `helmet` for setting security headers (CSP disabled).
    - `express-rate-limit` (200 requests/15 mins) for API routes.
    - Input sanitization (HTML entity encoding).
    - File and path validation for uploads.
    - `requireAdmin` and `requireAdminOnly` middleware for access control.
- **State Management**: React Context (`CartContext`), TanStack Query.
- **SEO**: Static and dynamic meta tags (Open Graph, Twitter Card), JSON-LD, sitemap.xml, robots.txt.

### Feature Specifications
- **Product Management**: Full CRUD operations for products, including image gallery.
- **Category System**: Products linked to categories, category filtering, custom icons.
- **Shopping Cart**: LocalStorage-based cart, no login required to add items, adjustable quantities, batch purchase, login required at checkout.
- **Order System**: Direct purchase or cart checkout, user profile updates on order, distinct orders per item. Admin panel for order viewing.
- **Referral System**: Unique referral codes per user, credit accumulation for referrers on successful orders, anti-fraud checks, admin management of credit settings.
- **Visual Customization**: Admin section for logo gallery (built-in and custom), text style editor (font, size, color, bold/italic, presets), dynamic display on homepage.
- **Analytics**: Tracks page visits, referrer sources, user-agent, with time-period filtering and source breakdown.
- **Terms & Conditions**: Admin-editable sections (title + content) displayed in the footer above contact info. Managed via `terms_sections` DB table with CRUD API. Session table auto-creates on Railway (`createTableIfMissing: true`).
- **Admin Roles**: Four levels (`admin`, `moderator`, `sales_admin`, `user`) with granular access permissions.

### System Design Choices
- **API Endpoints**: RESTful API design for products, media, categories, orders, authentication, and admin functionalities.
- **Data Schemas**: Defined using Drizzle ORM and Zod for validation, ensuring consistency between frontend and backend.
- **Modular Structure**: Key directories for `shared/`, `server/`, `client/src/pages/`, `client/src/hooks/`, `client/src/components/`, `public/uploads/`.

## External Dependencies
- **React**: Frontend UI library.
- **TypeScript**: Statically typed JavaScript.
- **TailwindCSS**: Utility-first CSS framework.
- **Shadcn/UI**: UI component library.
- **Wouter**: React router.
- **TanStack Query**: Data fetching and caching library.
- **Node.js**: Backend runtime environment.
- **Express**: Web application framework for Node.js.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Sharp**: High-performance Node.js image processing library.
- **Multer**: Middleware for handling `multipart/form-data`.
- **express-session**: Session management middleware.
- **helmet**: Security middleware for Express.
- **express-rate-limit**: Basic rate-limiting middleware.
- **scrypt**: Password hashing library.
- **cookie-parser**: Middleware for parsing cookies (for referral system).
- **Google Fonts**: For FiraGO font.
- **Lucide Icons**: For category icons.
- **Facebook Sharer**: For product sharing (referral system).
- **Google Auth**: (Deprecated in UI but available server-side as fallback).
- **Replit Auth (OIDC)**: (Fallback when `REPL_ID` is set).