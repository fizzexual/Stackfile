import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
