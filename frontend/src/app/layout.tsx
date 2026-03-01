import { Geist, Geist_Mono, Noto_Sans_Tifinagh } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansTifinagh = Noto_Sans_Tifinagh({
  variable: "--font-tifinagh",
  subsets: ["tifinagh"],
  weight: "400",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSansTifinagh.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
