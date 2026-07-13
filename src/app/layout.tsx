import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthSync from '@/components/AuthSync';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TripAI – AI Travel Planner',
  description: 'Lập kế hoạch du lịch thông minh với AI',
  metadataBase: new URL('https://tripai.app'),
  openGraph: {
    title: 'TripAI – AI Travel Planner',
    description: 'Lập kế hoạch du lịch thông minh với AI',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className={`min-h-screen ${inter.className}`}>
        <AuthSync />
        {children}
      </body>
    </html>
  );
}
