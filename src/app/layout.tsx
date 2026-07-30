import type { Metadata } from "next";
import { plusJakartaSans, poppins } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nnawca.org"),
  title: {
    default: "The Parliament | JNV Nagpur Alumni Network",
    template: "%s | The Parliament",
  },
  description:
    "The official alumni network of Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur — managed by NNAWCA",
  applicationName: "The Parliament",
  keywords: ["JNV Nagpur", "NNAWCA", "alumni", "Navodaya", "Jawahar Navodaya Vidyalaya"],
  openGraph: {
    title: "The Parliament | JNV Nagpur Alumni Network",
    description:
      "The official alumni network of JNV Nagpur, managed by NNAWCA.",
    url: "https://nnawca.org",
    siteName: "The Parliament",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Parliament | JNV Nagpur Alumni Network",
    description:
      "The official alumni network of JNV Nagpur, managed by NNAWCA.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}
