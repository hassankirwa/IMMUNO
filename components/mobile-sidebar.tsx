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
  Shield,
  X,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const session = useAppSession();
  const isAdmin = session.showAdminNav;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/25 shadow-[4px_0_24px_-12px_color-mix(in_oklab,var(--foreground)_8%,transparent)] lg:hidden flex flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-sidebar-border/40">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">ImmuniTrack</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {isAdmin && (
            <>
              <div className="my-4 border-t border-sidebar-border/40" />
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
                  Admin
                </p>
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.name}</span>
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
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-2",
              pathname === "/dashboard/settings"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>Settings</span>
          </Link>

          <Link
            href="/dashboard/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors"
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session.displayName || "…"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {session.primaryRole || "…"}
              </p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
