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

### NMI-Konnective Integration Development
```bash
npm run inngest:dev        # Start Inngest dev server for payment workflows
npm run test:e2e          # Run end-to-end tests
npm run test:e2e:local    # Run E2E tests locally
npm run test:e2e:browserstack # Run E2E tests on BrowserStack
npm run tsc               # Run TypeScript type checking
```

### Testing Commands
```bash
npm run test:e2e:headed   # Run E2E tests with browser UI
npm run test:e2e:debug    # Debug E2E tests step by step
npm run test:e2e:ui       # Run tests with Playwright UI
npm run report:show       # Show last test report
npm run browserstack:local # Start BrowserStack local tunnel
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
- **NEW**: Integrated NMI payment processing with Customer Vault
- **NEW**: Added Konnective CRM synchronization
- **NEW**: Implemented event-driven architecture with Inngest
- **NEW**: Added Sentry monitoring and error tracking
- **NEW**: Configured BrowserStack for cross-browser testing

### New Integration Features
1. **Payment Processing** - Full NMI integration with CollectJS tokenization
2. **Customer Vault** - One-click upsell functionality
3. **CRM Sync** - Automatic Konnective order and customer sync
4. **Event-Driven Workflows** - Inngest-powered async processing
5. **Monitoring** - Comprehensive Sentry error tracking and performance monitoring
6. **Cross-Browser Testing** - BrowserStack integration for quality assurance

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Fill in your NMI, Konnective, Inngest, Sentry, and BrowserStack credentials
3. Start the Inngest dev server: `npm run inngest:dev`
4. Start Next.js development: `npm run dev`
5. Visit http://localhost:8288 for Inngest dashboard
6. Visit http://localhost:3000 for the application

### Common Troubleshooting

#### Payment Processing Issues
- **CollectJS not loading**: Ensure HTTPS is enabled (use ngrok for local testing)
- **NMI errors**: Verify NMI_SECURITY_KEY and endpoint configuration
- **Vault creation fails**: Check customer information validation and NMI account settings

#### Inngest Workflow Issues  
- **Events not processing**: Ensure Inngest dev server is running (`npm run inngest:dev`)
- **Function not registered**: Check that functions are imported in `/api/inngest/route.ts`
- **Event schema errors**: Verify event data matches schemas in `src/lib/inngest.ts`

#### Konnective CRM Issues
- **Sync failures**: Verify Konnective credentials and campaign ID
- **Product mapping errors**: Check product ID mappings in KonnectiveService
- **Customer creation fails**: Validate required customer fields

#### TypeScript Issues
- **Compilation errors**: Run `npm run tsc` to see detailed errors
- **Import issues**: Ensure all paths use proper TypeScript imports with extensions
- **Type mismatches**: Check Zod schemas match TypeScript interfaces

#### Testing Issues
- **BrowserStack tests fail**: Verify credentials and start local tunnel
- **E2E tests timeout**: Increase timeout values in test configuration
- **CollectJS in tests**: Mock payment tokenization for automated testing

### Performance Monitoring
- **Sentry Dashboard**: Monitor errors and performance metrics
- **Inngest Dashboard**: Track workflow execution and failures  
- **Next.js Analytics**: Monitor page load times and core web vitals
- **BrowserStack Results**: Review cross-browser compatibility results