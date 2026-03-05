import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokeForge",
  description: "FireRed-inspired battle simulator with AI-generated Pokemon"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
