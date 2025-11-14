import './globals.css';
import type { Metadata } from 'next';
import { Urbanist } from 'next/font/google';
import React from 'react';

const urbanist = Urbanist({
  subsets: ['latin'],
  variable: '--font-urbanist'
});

export const metadata: Metadata = {
  title: 'Agentic Video Studio',
  description: 'Create short looping videos straight in your browser.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body>{children}</body>
    </html>
  );
}
