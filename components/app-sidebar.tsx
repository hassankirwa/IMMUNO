"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Syringe,
  Bell,
  Settings,
  Calendar,
  ClipboardList,
  FileText,
  Building2,
  UserCog,
  Thermometer,
  Package,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useAppSession } from "@/components/app-session-provider";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Administer", href: "/dashboard/administer", icon: Syringe },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "Vaccinations", href: "/dashboard/vaccinations", icon: FileText },
  { name: "Cold-Chain", href: "/dashboard/cold-chain", icon: Thermometer },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Schedule", href: "/dashboard/schedule", icon: Calendar },
  { name: "Session planning", href: "/dashboard/session-planning", icon: ClipboardList },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
];

const adminNavigation = [
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Facilities", href: "/dashboard/facilities", icon: Building2 },
  { name: "Users & Roles", href: "/dashboard/users", icon: UserCog },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const session = useAppSession();

  const isAdmin = session.showAdminNav;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground",
        "border-r border-sidebar-border/25 shadow-[4px_0_24px_-12px_color-mix(in_oklab,var(--foreground)_8%,transparent)]",
        "transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-sidebar-border/40">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">ImmuniTrack</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary mx-auto">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-1.5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border/40" />
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
                  Admin
                </p>
              )}
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* User Profile & Settings */}
      <div className="shrink-0 border-t border-sidebar-border/40 p-3">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-2",
            pathname === "/dashboard/settings"
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 transition-colors",
            collapsed ? "justify-center" : "hover:bg-sidebar-accent"
          )}
        >
          <div className="relative">
            <Avatar className="h-9 w-9">
              {session.avatarUrl ? (
                <AvatarImage src={session.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                {session.initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-sidebar bg-green-500" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session.displayName || "…"}
              </p>
              <p
                className="text-xs text-sidebar-foreground/60 truncate"
                title={session.primaryRole}
              >
                {session.primaryRole || "…"}
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border/50 bg-sidebar shadow-sm hover:bg-sidebar-accent"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
