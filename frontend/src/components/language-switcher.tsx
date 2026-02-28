"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const LOCALES = [
    { code: "en", flag: "🇬🇧", name: "English" },
    { code: "fr", flag: "🇫🇷", name: "Français" },
    { code: "ar", flag: "🇲🇦", name: "العربية" },
    { code: "zgh-Tfng", flag: "🇲🇦", name: "ⵜⴰⵎⴰⵣⵉⵖⵜ" },
] as const;

export function LanguageSwitcher() {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const currentLocale = LOCALES.find((l) => l.code === locale) || LOCALES[0];
    const isRTL = locale === "ar";

    const switchLocale = (newLocale: string) => {
        const segments = pathname.split("/");
        segments[1] = newLocale;
        router.push(segments.join("/") || `/${newLocale}`);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-green-50/90 rounded-xl border border-green-200/50 shadow-md transition-all duration-200 hover:shadow-lg hover:border-green-300 hover:scale-105 group"
            >
                <span className="text-2xl transform group-hover:scale-110 transition-transform duration-200">
                    {currentLocale.flag}
                </span>
                <ChevronDown 
                    className={`w-4 h-4 text-green-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-2 bg-white/95 backdrop-blur-md rounded-xl border border-green-200/50 shadow-xl overflow-hidden z-50 min-w-50 animate-dropdown`}>
                        {LOCALES.map((l) => (
                            <button
                                key={l.code}
                                onClick={() => switchLocale(l.code)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-all duration-150 ${
                                    locale === l.code ? `bg-green-50/80 ${isRTL ? 'border-r-4 border-green-500' : 'border-l-4 border-green-500'}` : `${isRTL ? 'border-r-4' : 'border-l-4'} border-transparent`
                                }`}
                            >
                                <span className="text-2xl transform hover:scale-110 transition-transform duration-150">{l.flag}</span>
                                <span className="text-sm font-medium text-green-900">{l.name}</span>
                                {locale === l.code && (
                                    <span className="ml-auto text-green-600 font-bold">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
