import type { Metadata } from "next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export const metadata: Metadata = {
    title: "SoussFlow – Smart Irrigation Monitoring",
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
        <NextIntlClientProvider messages={messages}>
            <SidebarProvider>
                <AppSidebar locale={locale} />
                <main className="flex-1 w-full overflow-x-hidden relative">
                    <SidebarTrigger className={`m-4 absolute z-50 bg-white/80 backdrop-blur shadow-sm border ${triggerPosition}`} />
                    <div className={`fixed top-4 ${languageSwitcherPosition} z-50`}>
                        <LanguageSwitcher />
                    </div>
                    {children}
                </main>
            </SidebarProvider>
        </NextIntlClientProvider>
    );
}
