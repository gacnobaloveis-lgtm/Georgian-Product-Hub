# Georgian Market Web Application

## Overview
This project is a web application designed for the Georgian market, featuring comprehensive product management, an image gallery, and a product catalog. The primary goal is to provide a localized e-commerce platform with all UI elements in Georgian, using the local currency (GEL ₾). The application supports various user roles, including a detailed admin panel for managing products, orders, users, and site settings, as well as a referral and analytics system to drive sales and track performance.

## User Preferences
N/A

## System Architecture

### Frontend
The frontend is built with React and TypeScript, styled using TailwindCSS and Shadcn/UI components. It utilizes Wouter for routing and TanStack Query for data fetching. The UI is mobile-first, featuring responsive layouts, bottom navigation, and full-screen drawers for categories and search on smaller screens. All UI text is localized in Georgian, and the FiraGO font is used.

### Backend
The backend is powered by Node.js and Express. It provides RESTful APIs for managing products, media, categories, orders, users, and admin-specific functionalities.

### Database
PostgreSQL is used as the primary database, with Drizzle ORM for database interactions. Key tables include `products`, `media`, `categories`, `users`, `sessions`, `orders`, `referral_logs`, and `site_settings`.

### API Endpoints
The API provides endpoints for:
- Public access: Listing products, single product details, products by category, media, and categories.
- Admin access: CRUD operations for products, media, categories; admin login/logout, session status, sync checks, order management, user management, referral logs, and site settings.
- User access: Order creation, fetching user-specific orders, and profile management.

### Image Handling
Images are processed using Sharp, resizing them to 800px width and converting them to WebP format. They are stored in `public/uploads/` and served statically. Image paths are stored in the database.

### Category System
Products are organized into categories with associated icons. The system supports filtering products by category.

### User Authentication & Authorization
- **Admin Authentication**: Secret-key based authentication for administrators, with robust session management and production fail-closed startup.
- **User Authentication**: Supports Google/GitHub/email login via Replit Auth (OpenID Connect) and Facebook Login via `passport-facebook`. User sessions are stored in PostgreSQL.
- **Role-Based Access Control**: Four distinct roles (`admin`, `moderator`, `sales_admin`, `user`) control access to admin panel sections and functionalities, enforced by middleware.

### Referral System
A referral system awards credit to users who refer new buyers. Each user has a unique referral code. Referral tracking includes anti-fraud measures and a configurable credit system. Admin tools are available for managing referral settings and viewing logs.

### Analytics System
Tracks visitor page visits, including referrer domains and page paths. Provides an admin view to analyze traffic sources over various time periods.

### Content Management
Rich text editing capabilities (`react-quill-new`) are integrated for managing "Terms & Conditions" and "Contact Info" sections, with secure rendering using DOMPurify.

### Security Features
- **Authentication**: Secret-key admin login, robust session management.
- **Access Control**: Role-based middleware for API and UI.
- **Rate Limiting**: `express-rate-limit` for API routes.
- **Security Headers**: `helmet` middleware.
- **Input Validation & Sanitization**: HTML entity encoding, file validation (MIME types, size limits), path validation, and filename sanitization.
- **Dependency Management**: Regular updates and patching to address CVEs.

## External Dependencies

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/UI, Wouter, TanStack Query.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (via Drizzle ORM).
- **Image Processing**: Sharp.
- **File Upload**: Multer.
- **Security**: `express-session`, `helmet`, `express-rate-limit`.
- **Authentication**: Replit Auth (OpenID Connect), `passport-facebook`.
- **Rich Text Editor**: `react-quill-new`, DOMPurify.
- **Font**: FiraGO (via Google Fonts).
- **Other**: `cookie-parser`.