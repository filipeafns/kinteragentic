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
  metadataBase: new URL('https://magnetic-morph-studies.filipeafns.chatgpt.site'),
  title: 'Magnetic Morph Studies',
  description:
    'Twelve magnetic particle agents morph through sentient eye states, data forms, and geometric solids.',
  openGraph: {
    title: 'Magnetic Morph Studies',
    description: 'Sentient eye states and opaque particle reorganization across twelve magnetic studies.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Lime particle forms arranged in a curved dark carousel beneath the title Magnetic Morph Studies',
      },
    ],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Magnetic Morph Studies',
    description: 'Sentient eye states and opaque particle reorganization across twelve magnetic studies.',
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
