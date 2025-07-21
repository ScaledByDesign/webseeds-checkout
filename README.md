
# Fitspresso Checkout - Next.js E-commerce Application

A high-performance, server-side rendered checkout flow built with Next.js 15, TypeScript, and Tailwind CSS. This application was migrated from a hybrid static HTML/React setup to leverage modern web technologies for optimal performance and user experience.

## 🚀 Features

- **Server-Side Rendering (SSR)** - Fast initial page loads with Next.js App Router
- **TypeScript** - Full type safety across the application
- **Tailwind CSS** - Utility-first styling with custom design tokens
- **Web Vitals Monitoring** - Real-time performance tracking in development
- **Optimized Images** - Next.js Image component with lazy loading and priority hints
- **Responsive Design** - Mobile-first approach with breakpoint-specific layouts
- **Countdown Timers** - Dynamic urgency elements for conversion optimization
- **Multi-step Checkout** - Seamless flow from checkout to upsells to thank you

## 📋 Prerequisites

- Node.js 20.0.0 or higher
- npm or yarn package manager

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd webseed-checkout
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
webseed-checkout/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout with global styles
│   ├── page.tsx            # Home page (redirects to checkout)
│   ├── globals.css         # Global CSS with Tailwind imports
│   ├── checkout/           # Main checkout page
│   ├── thankyou/           # Order confirmation page
│   ├── options/            # Product options/upgrade page
│   └── upsell/             # Upsell pages (1 & 2)
│       ├── 1/
│       └── 2/
├── components/             # Reusable React components
│   ├── CountdownTimer.tsx  # Countdown timer component
│   ├── WebVitals.tsx      # Web vitals monitoring
│   └── BrandingFooter.tsx # Footer component
├── public/                 # Static assets
│   └── assets/            # Images and media files
├── tailwind.config.js     # Tailwind configuration
├── next.config.mjs        # Next.js configuration
└── tsconfig.json          # TypeScript configuration
```

## 🎯 Core Pages

### 1. Checkout (`/checkout`)
- Main checkout form with customer information
- Payment processing interface
- Order summary with dynamic pricing
- Security badges and trust signals

### 2. Options (`/options`)
- Product upgrade opportunities
- FAQ accordion sections
- Limited-time offers with countdown timers

### 3. Upsells (`/upsell/1`, `/upsell/2`)
- Post-purchase upsell flows
- Exit-intent modals
- Testimonials and social proof
- Bonus product offerings

### 4. Thank You (`/thankyou`)
- Order confirmation details
- Video content for customer engagement
- Order summary and next steps

## 🚦 Available Scripts

```bash
# Development
npm run dev          # Start development server on port 3000

# Production
npm run build        # Create optimized production build
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint for code quality
npm run typecheck   # Run TypeScript compiler checks
```

## 🎨 Styling

The application uses Tailwind CSS with custom configuration:

- Custom color palette matching brand guidelines
- Extended spacing and sizing scales
- Custom font sizes with responsive variants
- Utility classes for common patterns

Key custom values in `tailwind.config.js`:
- Colors: `purple-976987`, `yellow-f6c657`, etc.
- Font sizes: From `0.625rem` to `4.5rem`
- Spacing: Extended scale up to `360` units

## 📊 Performance

The application includes built-in performance monitoring:

### Web Vitals Dashboard (Development Only)
- **LCP** (Largest Contentful Paint) - Target: <2.5s
- **CLS** (Cumulative Layout Shift) - Target: <0.1
- **INP** (Interaction to Next Paint) - Target: <200ms
- **FCP** (First Contentful Paint) - Target: <1.8s
- **TTFB** (Time to First Byte) - Target: <800ms

Current performance metrics show excellent results with all Core Web Vitals in the "good" range.

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file for environment-specific configuration:

```env
# Add your environment variables here
NEXT_PUBLIC_API_URL=your_api_url
```

### Next.js Configuration
The `next.config.mjs` includes:
- Image optimization settings
- CSS optimization (experimental)
- Webpack configurations

## 🏗️ Building for Production

1. Create production build:
```bash
npm run build
```

2. Test production build locally:
```bash
npm start
```

3. Deploy to your hosting provider (Vercel, Netlify, etc.)

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🛡️ Security Features

- Secure checkout badges
- SSL certificate indicators
- Trust signals (Norton, McAfee, TRUSTe)
- PCI compliance ready

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential. All rights reserved.

## 🚧 Known Issues

- External CSS imports in upsell pages may override some styles
- Grammarly browser extension may cause hydration warnings

## 🔮 Future Enhancements

- [ ] Implement A/B testing framework
- [ ] Add analytics integration
- [ ] Enhance mobile checkout experience
- [ ] Implement progressive web app features
- [ ] Add internationalization support

## 💻 Development Tips

- Use the Web Vitals dashboard to monitor performance during development
- Check the browser console for detailed performance logs
- Run `npm run build` regularly to catch build-time errors
- Use the TodoWrite tool in Claude Code for task management

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS