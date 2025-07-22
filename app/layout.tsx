import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import { WebVitals } from '@/components/WebVitals'
import { ClientOnlyWebVitals } from '@/components/ClientOnlyWebVitals'
import './globals.css'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fitspresso - Secure Checkout',
  description: 'Complete your Fitspresso order securely',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="text-[2.1vw] md:text-[0.738vw]">
      <head>
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//ajax.googleapis.com" />
        <link rel="dns-prefetch" href="//getretinaclear.com" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="//fonts.gstatic.com" crossOrigin="" />
        
        {/* Critical CSS inline for above-the-fold content */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .container { max-width: 1200px; margin: 0 auto; }
            .btn-primary { background: #f6c657; color: #000; }
            .loading-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s infinite; }
            @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          `
        }} />
      </head>
      <body className={`${roboto.className} font-roboto bg-white`} suppressHydrationWarning>
        {/* <WebVitals />
        <ClientOnlyWebVitals /> */}
        {children}
      </body>
    </html>
  )
}