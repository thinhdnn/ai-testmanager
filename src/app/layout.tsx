import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Providers } from '@/components/providers';

const fontSans = Inter({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: false
});

export const metadata: Metadata = {
  title: 'AI Test Manager',
  description: 'A web-based platform for managing manual and automated test cases',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={fontSans.variable}>
      <body
        suppressHydrationWarning
        className={cn(
          'min-h-screen bg-background text-foreground font-sans antialiased',
          fontSans.className
        )}
      >
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
} 