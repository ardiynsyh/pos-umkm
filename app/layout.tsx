import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS UMKM",
  description: "Sistem Point of Sale untuk UMKM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}