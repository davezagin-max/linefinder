import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import { Header } from "@/components/ui/Header";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", weight: ["400", "500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: `${BRAND.name}: find your perfect ski or snowboard setup`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
};

export const viewport: Viewport = { themeColor: "#FAFCFF" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${inter.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-night focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        {process.env.NEXT_PUBLIC_DEMO === "1" && (
          <div className="bg-night px-4 py-2 text-center text-sm text-white">
            <strong className="font-semibold">Demo:</strong> runs entirely in your browser with sample gear data (specs unverified) and mock prices.{" "}
            <a href="https://github.com/davezagin-max/linefinder" className="font-semibold underline underline-offset-2">
              View the code
            </a>
          </div>
        )}
        <Header />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
