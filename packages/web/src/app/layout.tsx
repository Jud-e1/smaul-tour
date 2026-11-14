import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import { ToastProvider } from '@/components/ui/Toast';

// Apple's SF Pro and Stripe's Sohne are proprietary; Inter is the open match for
// both. JetBrains Mono carries the small destination labels.
const body = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-body', display: 'swap' });
const display = Inter({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Nsoroma — Experience Accra Like Never Before',
  description: 'Curated itineraries, hidden gems, and real-time local insights powered by advanced AI',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F5F5F7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans min-h-screen overflow-x-hidden bg-canvas text-ink">
        <ToastProvider>
          <Navbar />
          <main className="min-h-[60vh]">{children}</main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
