"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Droplets, Settings, Gauge, Map as MapIcon, CalendarRange, BrainCircuit, Router } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

export function AppSidebar({ locale: initialLocale }: { locale?: string }) {
    const t = useTranslations("nav");
    const locale = initialLocale || useLocale();

    const items = [
        { titleKey: "dashboard", url: `/${locale}`, icon: Droplets },
        { titleKey: "motors", url: `/${locale}/motors`, icon: Gauge },
        { titleKey: "map", url: `/${locale}/map`, icon: MapIcon },
        { titleKey: "schedule", url: `/${locale}/schedule`, icon: CalendarRange },
        { titleKey: "analytics", url: `/${locale}/analytics`, icon: BrainCircuit },
        { titleKey: "devices", url: `/${locale}/devices`, icon: Router },
        { titleKey: "settings", url: `/${locale}/settings`, icon: Settings },
    ] as const;

    const sidebarSide = locale === "ar" ? "right" : "left";

    return (
        <Sidebar side={sidebarSide}>
            <SidebarContent>
                <SidebarGroup>
                    <div className="flex items-center p-4">
                        <img src="/icone.png" alt="SoussFlow Logo" className="w-10 h-10 me-2" />
                        <span className="font-bold text-xl text-green-900">SoussFlow</span>
                    </div>
                    <SidebarGroupLabel>{t("menu")}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.titleKey}>
                                    <SidebarMenuButton size="lg" asChild>
                                        <a href={item.url} className="[&>svg]:!size-5">
                                            <item.icon />
                                            <span className="text-base font-medium">{t(item.titleKey)}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
