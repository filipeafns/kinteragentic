import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kinteragentic.vercel.app'),
  title: 'Magnetic Morph Studies',
  description:
    'A black-and-gray 3D particle agent morphs over a cursor-aware feathered color field.',
  openGraph: {
    title: 'Magnetic Morph Studies',
    description: 'A cursor-aware particle head with expressive eyes and a feathered color field.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'A black-eyed gray particle agent over a feathered color field',
      },
    ],
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Magnetic Morph Studies',
    description: 'A cursor-aware particle head with expressive eyes and a feathered color field.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
