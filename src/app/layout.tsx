import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

// Pulling multiple weights so your headers and thin text look correct
const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Gamerarena Master ERP",
  description: "Premium Gaming Cafe Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#0A0A0C]">
      {/* lato.className strictly enforces the font globally */}
      <body className={`${lato.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}