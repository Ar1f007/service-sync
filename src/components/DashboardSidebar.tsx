"use client";

import { Calendar, LogOut, User, CalendarDays, Clock } from "lucide-react";
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

export function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    authClient.signOut();
    router.push("/");
  };

  const isAdmin = session?.user?.role === "admin";
  const isEmployee = session?.user?.role === "staff";

  const getMenuItems = () => {
    if (isAdmin) {
      return [
        {
          title: "Admin Dashboard",
          items: [
            {
              title: "Admin Panel",
              url: "/admin",
              icon: Calendar,
            },
          ],
        },
      ];
    }

    if (isEmployee) {
      return [
        {
          title: "Employee",
          items: [
            {
              title: "Employee Dashboard",
              url: "/dashboard/employee",
              icon: User,
            },
          ],
        },
      ];
    }

    // Regular customer dashboard
    return [
      {
        title: "My Account",
        items: [
          {
            title: "My Appointments",
            url: "/dashboard/appointments",
            icon: CalendarDays,
          },
          {
            title: "My Calendar",
            url: "/dashboard/calendar",
            icon: Calendar,
          },
          {
            title: "Book Appointment",
            url: "/dashboard/book",
            icon: Clock,
          },
        ],
      },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900">ServiceSync</span>
            <span className="text-xs text-slate-500">
              {isAdmin ? "Admin Panel" : isEmployee ? "Employee" : "Dashboard"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {menuItems.map((group) => (
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
                    {session?.user?.name || "User"}
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
