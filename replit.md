# IMSTEV NATURALS - Hair & Skin Analysis Platform

## Overview

IMSTEV NATURALS is a medical-grade AI-powered platform for hair and skin analysis, specializing in African hair types (4A-4C) and diverse skin conditions. The application provides instant dermatological assessments, personalized treatment plans, and comprehensive health tracking through multi-angle image capture and advanced computer vision analysis.

The platform operates "IMSTEV NATURALS HAIR SPECIALIST SALON" with appointment-based booking and sells an organic product line. It targets users seeking professional-grade skin and hair care guidance, with particular expertise in Nigerian and African hair care needs. Features include salon consultations, custom formulation services, e-commerce functionality, and family account management.

## Brand Identity
- **Brand Name**: IMSTEV NATURALS
- **Tagline**: "Home of Nature's Beauty"
- **Color Palette**: Purple/Amber gradient (`from-purple-600 to-amber-500`) for active states and CTAs
- **Logo**: `/public/logo.png`
- **Product Image**: `/public/products.jpg`

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast HMR and optimized production builds
- **React Router** for client-side routing with dedicated pages for each feature (scan, results, timeline, shop, etc.)

**UI Component System**
- **shadcn/ui** components built on Radix UI primitives for accessible, customizable interface elements
- **Tailwind CSS** for utility-first styling with custom design tokens defined in CSS variables
- **Class Variance Authority** for managing component variants
- Premium design system with:
  - Glassmorphism navbar with backdrop blur effects
  - Gradient mesh backgrounds across all pages
  - Premium color palette: slate tones, teal/emerald accents, sand highlights
  - Custom typography with display fonts for headings
  - Premium button styles with gradients and hover effects
  - Mobile-first responsive design with breakpoints (320px, 375px, 768px, 1024px, 1280px)

**State Management**
- **TanStack Query (React Query)** for server state management, data fetching, and caching
- Local React state (useState, useForm) for UI-specific state

**Form Handling**
- **React Hook Form** with **Zod** schema validation for robust form management
- Multi-step onboarding flow with dedicated sub-steps for hair/skin profiling

**Design Patterns**
- Component-based architecture with clear separation between pages, layout components, and feature-specific components
- Custom hooks pattern (e.g., `useIsMobile`, `useToast`) for reusable logic
- Compound component pattern for complex UI like multi-angle capture and analysis workflows

### Image Processing Pipeline

**Client-Side Processing**
- Advanced image preprocessing utilities for medical-grade quality analysis
- Blur detection using Laplacian variance method
- Lighting and contrast scoring algorithms
- Image quality metrics validation before upload
- Multi-angle capture system with quality feedback for both skin and hair analysis
- Scale calibration using reference objects (coins, rulers) for accurate size measurements
- Live camera capture with zoom, flip, and camera switching capabilities

**Analysis Workflows**
- Separate capture requirements for skin vs. hair analysis
- Skin: front, close-up, left/right angles
- Hair: crown, scalp parting, frontal, strand close-up, nape
- Porosity testing flow for hair analysis
- Real-time quality indicators and recommendations during capture

### Data Storage & Backend

**Local Express Backend** (server/index.ts)
- **Authentication**: JWT-based email/password auth with role-based access control
- **Database**: PostgreSQL for storing user profiles, scans, diagnoses, treatment plans, and e-commerce data
- **Storage**: Local file storage for scan images in /uploads directory
- **Stripe Integration**: Payment processing via Stripe with stripe-replit-sync for webhooks
- **AI Analysis**: OpenAI GPT-4o integration for real image analysis (server/aiAnalysis.ts)
- **Video Meetings**: Daily.co integration for telehealth consultations (server/dailyClient.ts)

**API Server Architecture**
- Express.js server running on port 3001 (development) or port 5000 (production)
- Vite frontend dev server on port 5000 with API proxy to backend
- Production: Server serves built frontend from skin-sense-buddy-main/dist
- Supabase compatibility layer (skin-sense-buddy-main/src/integrations/supabase/client.ts) for minimal frontend changes

**Data Schema Design**
- Users → Profiles (demographic, skin/hair type, medical history)
- Scans → Diagnoses → Treatment Plans (analysis results chain)
- Subscription Plans → User Subscriptions (tiered access model)
- Products → Orders → Order Items (e-commerce)
- Clinicians → Telehealth Appointments (virtual consultations)
- Family Accounts (multi-user household management)

**Access Control**
- User roles table for clinician vs. patient differentiation
- Subscription-based feature gating (telehealth, custom formulations, family accounts)
- Row-level security considerations for multi-tenant data isolation

### Feature Modules

**Skin & Hair Analysis Engine**
- Dual analysis modes (skin/hair) with specialized algorithms
- Confidence scoring and severity assessment
- Triage level determination for urgent cases
- Hair-specific metrics: moisture level, protein balance, scalp health, strand integrity, porosity scoring
- Heatmap visualization with highlighted regions of concern
- Before/after comparison tools

**Progress Tracking & Timeline**
- Chronological scan history with filterable views
- Condition-specific progress charts using Recharts
- Hair journey vs. skin journey separation
- Statistical trending (improvement percentages, severity changes)
- Days-between-scans tracking

**E-Commerce System**
- Product catalog with categories (skin care, hair care, supplements)
- Hair-type and condition-based product filtering
- Shopping cart and order management
- Inventory tracking with low-stock alerts
- Nigerian Naira (NGN) pricing

**Subscription Tiers**
- Free: Limited scans
- Premium: Unlimited scans, family accounts
- Professional: Telehealth access, custom formulations
- Feature flags control access to advanced capabilities

**Telehealth Platform**
- Clinician profiles with specialties, ratings, consultation fees
- Appointment scheduling with calendar integration
- Video meeting URL generation
- Clinician dashboard for managing consultations

**Custom Formulation Service**
- AI-generated personalized treatment formulations based on diagnosis
- Ingredient lists, instructions, contraindications
- Cost estimation in NGN

## External Dependencies

### Core Services

**Supabase** (`@supabase/supabase-js`)
- Backend-as-a-Service providing authentication, PostgreSQL database, and file storage
- Project URL and anon key configured via environment variables
- Handles all data persistence and user management

### UI & Styling

**shadcn/ui Component Library**
- Built on Radix UI primitives: accordion, alert-dialog, avatar, badge, button, calendar, card, checkbox, dialog, dropdown-menu, form, input, label, popover, progress, radio-group, select, separator, slider, switch, tabs, toast, tooltip
- Provides accessible, customizable components

**Tailwind CSS** with PostCSS and Autoprefixer
- Utility-first CSS framework
- Custom theme configuration in `tailwind.config.ts`
- HSL-based color system for theme consistency

**Additional UI Libraries**
- `lucide-react`: Icon library for consistent iconography
- `date-fns`: Date formatting and manipulation
- `recharts`: Charting library for progress visualizations
- `embla-carousel-react`: Image carousel functionality
- `next-themes`: Dark/light mode theme switching

### Forms & Validation

**React Hook Form** (`react-hook-form`)
- Performant form state management with minimal re-renders

**Zod** (`@hookform/resolvers`, `zod`)
- TypeScript-first schema validation
- Used for onboarding, profile editing, and form validation throughout

### Development Tools

**Vite** with React SWC plugin
- Fast development server on port 5000
- Production builds with code splitting

**TypeScript** with relaxed linting configuration
- Type safety disabled for rapid prototyping (`strict: false`)

**ESLint** with React hooks and React refresh plugins
- Code quality enforcement

**Lovable Tagger** (development mode only)
- Component tagging for Lovable.dev integration

### API Integrations

**AI Analysis Engine** (implementation assumed via Supabase Edge Functions or external API)
- Computer vision model for skin/hair condition detection
- Confidence scoring and medical-grade assessment
- Expected to process uploaded images and return structured diagnosis data

**Payment Processing** (implementation pending)
- Likely Paystack or Flutterwave for Nigerian market
- Order processing and subscription billing

**Video Conferencing** (for telehealth)
- Meeting URL generation (possibly Jitsi, Zoom, or Google Meet integration)

### Deployment

**Lovable.dev Platform**
- Project hosted and managed via Lovable
- Git-based deployment workflow
- Environment: Node.js with npm