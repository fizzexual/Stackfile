import type { Metadata } from "next";
import { Inter, Azeret_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  variable: "--font-azeret",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stackfile",
    template: "%s · Stackfile",
  },
  description:
    "Self-hosted file storage, reimagined. Upload, organize, and share your files from your own server.",
  applicationName: "Stackfile",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${azeretMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
