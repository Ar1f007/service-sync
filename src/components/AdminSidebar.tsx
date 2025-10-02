"use client";

import { Calendar, LogOut, User, Settings, Users, CreditCard, Clock, BarChart3, Mail, Shield, PlusCircle, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    authClient.signOut();
    router.push("/");
  };

  const adminMenuItems = [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: BarChart3,
        },
        {
          title: "Admin Calendar",
          url: "/admin/calendar",
          icon: CalendarDays,
        },
      ],
    },
    {
      title: "Services & Staff",
      items: [
        {
          title: "Manage Services",
          url: "/admin/services",
          icon: Settings,
        },
        {
          title: "Service Add-ons",
          url: "/admin/addons",
          icon: PlusCircle,
        },
        {
          title: "Manage Staff",
          url: "/admin/employees",
          icon: Users,
        },
      ],
    },
    {
      title: "Appointments",
      items: [
        {
          title: "All Appointments",
          url: "/admin/all-appointments",
          icon: Calendar,
        },
        {
          title: "Appointments",
          url: "/admin/appointments",
          icon: CalendarDays,
        },
        {
          title: "Waitlist Management",
          url: "/admin/waitlist",
          icon: Clock,
        },
      ],
    },
    {
      title: "Business Management",
      items: [
        {
          title: "Payment Management",
          url: "/admin/payments",
          icon: CreditCard,
        },
        {
          title: "Risk Assessment",
          url: "/admin/risk-assessment",
          icon: Shield,
        },
        {
          title: "Analytics Dashboard",
          url: "/admin/analytics",
          icon: BarChart3,
        },
        {
          title: "Email Management",
          url: "/admin/emails",
          icon: Mail,
        },
      ],
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900">ServiceSync</span>
            <span className="text-xs text-slate-500">Admin Panel</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {adminMenuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Profile"
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <User className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900">
                    {session?.user?.name || "Admin"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {session?.user?.email}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              tooltip="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
