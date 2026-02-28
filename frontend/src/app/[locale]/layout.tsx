import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Tifinagh } from "next/font/google";
import "../globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

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

export const metadata: Metadata = {
    title: "AgriFlow AI – Smart Irrigation Monitoring",
    description: "AI-powered irrigation monitoring and leak detection system for Agadir water conservation.",
};

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Validate that the incoming locale is supported
    if (!routing.locales.includes(locale as 'en' | 'fr' | 'ar' | 'zgh-Tfng')) {
        notFound();
    }

    const messages = await getMessages();
    // Only Arabic uses RTL, Tifinagh is LTR
    const isRTL = locale === "ar";
    const dir = isRTL ? "rtl" : "ltr";
    const triggerPosition = isRTL ? "right-4" : "left-4";
    const languageSwitcherPosition = isRTL ? "left-4" : "right-4";

    return (
        <html lang={locale} dir={dir}>
            <body className={`${geistSans.variable} ${geistMono.variable} ${notoSansTifinagh.variable} antialiased`}>
                <NextIntlClientProvider messages={messages}>
                    <SidebarProvider>
                        <AppSidebar locale={locale} />
                        <main className="flex-1 w-full overflow-x-hidden relative">
                            <SidebarTrigger className={`m-4 fixed z-50 bg-white shadow-sm border ${triggerPosition}`} />
                            <div className={`fixed top-4 ${languageSwitcherPosition} z-50`}>
                                <LanguageSwitcher />
                            </div>
                            {children}
                        </main>
                    </SidebarProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
