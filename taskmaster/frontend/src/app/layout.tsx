import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ThemeWrapper } from '@/components/layout/theme-wrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TaskMaster - AI-Powered Business Task Management',
  description: 'Boost team productivity with AI-driven task management, gamification, and real-time analytics.',
  keywords: ['task management', 'productivity', 'gamification', 'AI', 'team collaboration'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-cosmic-darker text-white antialiased`}>
        <Providers>
          <ThemeWrapper>
            {children}
          </ThemeWrapper>
        </Providers>
      </body>
    </html>
  );
}
