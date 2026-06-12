import { Plus_Jakarta_Sans, Poppins } from "next/font/google";

export const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const poppins = Poppins({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
