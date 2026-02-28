import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Droplets, Settings, Gauge, Map as MapIcon, CalendarRange, BrainCircuit, Router } from "lucide-react"

const items = [
    {
        title: "Dashboard",
        url: "/",
        icon: Droplets,
    },
    {
        title: "Motors & Sensors",
        url: "/motors",
        icon: Gauge,
    },
    {
        title: "Farm Map",
        url: "/map",
        icon: MapIcon,
    },
    {
        title: "Smart Schedule",
        url: "/schedule",
        icon: CalendarRange,
    },
    {
        title: "AI Analytics",
        url: "/analytics",
        icon: BrainCircuit,
    },
    {
        title: "Device Fleet",
        url: "/devices",
        icon: Router,
    },
    {
        title: "Settings",
        url: "#",
        icon: Settings,
    },
]

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <div className="flex items-center p-4">
                        <Droplets className="w-6 h-6 text-green-600 mr-2" />
                        <span className="font-bold text-lg text-green-900">AgriFlow</span>
                    </div>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
