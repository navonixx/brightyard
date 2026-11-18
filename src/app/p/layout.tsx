import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your homepage preview",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: LayoutProps<"/p">) {
  return children;
}
