import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brightyard — websites, AI photos and promo videos for small businesses",
  description:
    "Brightyard is a small creative studio. We make your website, AI photo set or promo video first — you pay only if you love it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `js` is added before paint so scroll-reveal content starts hidden only when JS can reveal it.
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
