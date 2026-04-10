"use client";

import { Bell, Search, Menu, X, Moon, Sun, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useAppSession } from "@/components/app-session-provider";
import { getNotifications } from "@/lib/api";
import type { Notification } from "@/lib/types";

interface AppHeaderProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function AppHeader({ onMenuToggle, isMobileMenuOpen }: AppHeaderProps) {
  const session = useAppSession();
  const [isDark, setIsDark] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pendingNotifications = notifications.filter((n) => n.status === "pending");

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getNotifications({ limit: 20 });
        if (!cancelled) setNotifications(rows);
      } catch (err) {
        if (!cancelled) {
          setNotifications([]);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-12 xl:px-20">
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuToggle}
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-md lg:max-w-xl xl:max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search patients, vaccines..."
            className="h-10 rounded-full border-border/70 bg-background/80 pl-10 pr-3 shadow-sm transition-colors focus-visible:border-primary/40 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 lg:gap-4">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {pendingNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {pendingNotifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {pendingNotifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3">
                <div className="flex items-center gap-2 w-full">
                  <Badge
                    variant={
                      notification.type === "sms"
                        ? "default"
                        : notification.type === "email"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {notification.type.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {notification.scheduledDate}
                  </span>
                </div>
                <p className="text-sm mt-1 line-clamp-2">
                  {notification.patientName}: {notification.vaccineName}
                </p>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex max-w-[230px] items-center gap-2 py-6 px-5"
              disabled={session.loading}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {session.avatarUrl ? (
                  <AvatarImage src={session.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {session.initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 md:block text-left">
                <p className="truncate text-sm font-medium">
                  {session.displayName || "…"}
                </p>
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={session.primaryRole}
                >
                  {session.primaryRole || "…"}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{session.displayName}</p>
                {session.email && session.displayName !== session.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {session.email}
                  </p>
                )}
                {session.primaryRole && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {session.primaryRole}
                    </Badge>
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/notifications">
                Notifications ({pendingNotifications.length})
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">Profile &amp; settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => session.logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
