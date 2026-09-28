import type { Metadata, Viewport } from "next";
import { Literata, Outfit } from "next/font/google";
import { Nav } from "@/components/Nav";
import { isAdmin } from "@/lib/auth";
import { countLowStock, getDb } from "@/lib/db";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const literata = Literata({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Press bench",
  description: "Heat press and cup press settings in Celsius, with shelf stock and a press log.",
};

export const viewport: Viewport = {
  themeColor: "#b8431f",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  const lowStock = countLowStock(getDb());
  return (
    <html lang="en-GB">
      <body className={`${outfit.variable} ${literata.variable}`}>
        <div className="shell">
          <Nav lowStock={lowStock} admin={admin} />
          {children}
        </div>
      </body>
    </html>
  );
}
