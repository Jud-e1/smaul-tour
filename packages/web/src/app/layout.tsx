import type { Metadata, Viewport } from 'next';
import { Inter, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/Toast';

const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nsoroma — Experience Accra Like Never Before',
  description: 'Curated itineraries, hidden gems, and real-time local insights powered by advanced AI',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0C2F1E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="font-sans min-h-screen overflow-x-hidden bg-canvas text-ink">
        <ToastProvider>
          <Navbar />
          <main className="pb-28 lg:pb-0">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
