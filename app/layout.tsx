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
    'A cursor-aware 3D particle head morphs between attentive, dizzy, and void-collapse states.',
  openGraph: {
    title: 'Magnetic Morph Studies',
    description: 'A cursor-aware 3D particle head with expressive eyes and size-driven depth.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'A black spherical particle agent with oval eyes on a white background',
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
    description: 'A cursor-aware 3D particle head with expressive eyes and size-driven depth.',
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
