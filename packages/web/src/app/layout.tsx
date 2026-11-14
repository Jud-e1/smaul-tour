import type { Metadata, Viewport } from 'next';
import { Figtree, Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import { ToastProvider } from '@/components/ui/Toast';

// Emphatic geometric headlines (Outfit), friendly reading text (Figtree) and
// small mono "destination markings" (JetBrains Mono).
const body = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });
const display = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Nsoroma — Experience Accra Like Never Before',
  description: 'Curated itineraries, hidden gems, and real-time local insights powered by advanced AI',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F7F1E8',
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
