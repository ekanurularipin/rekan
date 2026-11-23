import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "REKAN LABEL — More Than Fashion, A Companion",
  description:
    "Rekanmu dalam Setiap Penampilan. Modest wear inklusif (S – 3XL), nyaman, dan elegan.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`scroll-smooth ${cormorant.variable} ${jakarta.variable}`}
    >
      <body className="bg-[#F7F3EE] text-[#4A2C1D] font-sans antialiased selection:bg-[#4A2C1D] selection:text-[#F7F3EE] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}