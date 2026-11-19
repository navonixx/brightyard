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
  title: "Alderwell Creative — websites, content, ads & apps",
  description:
    "Alderwell Creative is a creative and marketing studio for growing businesses: websites, product photography, video ads, ad campaigns, digital marketing and mobile apps. Your first project is free — pay what you feel it's worth.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serifDisplay.variable} ${condensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
