import type { Metadata } from "next";
import { plusJakartaSans, poppins } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Parliament | JNV Nagpur Alumni Network",
  description:
    "The official alumni network of Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur — managed by NNAWCA",
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
