# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js e-commerce checkout application for "Fitspresso" that was migrated from a hybrid static HTML/React setup. The application features:
- Server-side rendered checkout flow
- Responsive design with Tailwind CSS
- TypeScript for type safety

## Development Commands

### Next.js Development
```bash
npm install         # Install dependencies (requires Node.js 20+)
npm run dev        # Start Next.js dev server at http://localhost:3000
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
```

## Architecture

### Directory Structure
```
/app/                   # Next.js App Router pages
  ├── layout.tsx       # Root layout with global styles
  ├── page.tsx         # Home page (redirects to checkout)
  ├── globals.css      # Global CSS with Tailwind imports
  ├── checkout/
  │   └── page.tsx     # Checkout page component
  └── thankyou/
      └── page.tsx     # Thank you page component

/components/           # React components
  ├── BrandingFooter.tsx
  ├── Component1.tsx
  └── ReviewPairs.tsx

/public/               # Static assets
  └── assets/          # Images and icons
      ├── images/      # SVG and PNG files
      └── style.css    # Legacy compiled CSS

/styles/               # Additional styles (if needed)

Configuration files:
  ├── next.config.mjs   # Next.js configuration
  ├── tailwind.config.js # Tailwind CSS with custom values
  ├── postcss.config.js  # PostCSS configuration
  └── tsconfig.json      # TypeScript configuration
```

### Technology Stack
- **Next.js 15.2.0** - React framework with App Router
- **React 19.0.0** - UI library
- **TypeScript 5.8.3** - Type safety
- **Tailwind CSS 4.1.3** - Utility-first CSS
- **PostCSS** - CSS processing

### Key Features
1. **App Router** - Using Next.js 15 App Router for routing
2. **Server Components** - Pages are server components by default
3. **Image Optimization** - Using Next.js Image component
4. **Responsive Design** - Mobile-first with Tailwind utilities
5. **Custom Tailwind Values** - Extended theme with design-specific values

### Important Notes
- Images are served from `/public/assets/images/`
- The app redirects from home (`/`) to `/checkout`
- Custom font sizes and spacing values are defined in `tailwind.config.js`
- Roboto font is loaded via Google Fonts in the layout

### Migration Notes
- Converted from static HTML + React Router to Next.js App Router
- Static checkout.html and thankyou.html converted to Next.js pages
- React components moved to `/components` directory
- Assets copied to `/public` for static serving