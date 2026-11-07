import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import { ToastProvider } from '@/components/ui/Toast';

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nsoroma — Experience Accra Like Never Before',
  description: 'Curated itineraries, hidden gems, and real-time local insights powered by advanced AI',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={body.variable}>
      <body className="font-sans min-h-screen overflow-x-hidden bg-white text-ink">
        <ToastProvider>
          <Navbar />
          <main className="min-h-[60vh]">{children}</main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
