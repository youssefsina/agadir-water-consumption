"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import GB from "country-flag-icons/react/3x2/GB";
import FR from "country-flag-icons/react/3x2/FR";
import MA from "country-flag-icons/react/3x2/MA";

const LOCALES = [
    { code: "en", FlagIcon: GB, name: "English" },
    { code: "fr", FlagIcon: FR, name: "Français" },
    { code: "ar", FlagIcon: MA, name: "العربية" },
    { code: "zgh-Tfng", FlagIcon: MA, name: "ⵜⴰⵎⴰⵣⵉⵖⵜ" },
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
                <currentLocale.FlagIcon className="w-7 h-5 rounded-sm shadow-sm group-hover:scale-110 transition-transform duration-200" />
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
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-all duration-150 ${locale === l.code
                                    ? `bg-green-50/80 ${isRTL ? 'border-r-4 border-green-500' : 'border-l-4 border-green-500'}`
                                    : `${isRTL ? 'border-r-4' : 'border-l-4'} border-transparent`
                                    }`}
                            >
                                <l.FlagIcon className="w-7 h-5 rounded-sm shadow-sm shrink-0" />
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
