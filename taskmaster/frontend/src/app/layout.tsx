import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

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
          {/* Cosmic Background */}
          <div className="fixed inset-0 -z-10">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-cosmic-gradient" />

            {/* Nebula effects */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-glow-purple opacity-30 blur-3xl animate-nebula" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-glow-blue opacity-30 blur-3xl animate-nebula" style={{ animationDelay: '-10s' }} />
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-glow-cyan opacity-20 blur-3xl animate-nebula" style={{ animationDelay: '-5s' }} />

            {/* Stars */}
            <div className="stars" />
          </div>

          {children}
        </Providers>
      </body>
    </html>
  );
}
