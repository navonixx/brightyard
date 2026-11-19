import type { Metadata } from "next";
import { DM_Serif_Display, Inter, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Display faces used by the client-site themes (editorial / luxury / bold).
const serifDisplay = DM_Serif_Display({ variable: "--font-serif-display", subsets: ["latin"], weight: "400" });
const condensed = Oswald({ variable: "--font-condensed", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  // Absolute URLs for the social image etc. follow the public site address, not the Vercel project name.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Alderwell Creative — websites for local businesses, built before you pay",
  description:
    "Alderwell Creative is a web design studio for local businesses. We build your whole website first — you pay only if you love it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serifDisplay.variable} ${condensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
