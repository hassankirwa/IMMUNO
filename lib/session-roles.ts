import type { MeResponse } from "./types";

export const SIDEBAR_ADMIN_ROLES = ["admin"] as const;

const HIGHLIGHT_ROLES = new Set(["admin", "health_officer"]);

const DISPLAY_ROLES = new Set(["admin", "health_officer"]);

function emailPrefix(email: string): string {
  return email.split("@")[0]?.trim() || "";
}

export function getSessionDisplayName(user: MeResponse): string {
  const name = user.full_name?.trim();
  if (name) return name;
  const fromEmail = emailPrefix(user.email || user.user || "");
  if (fromEmail) return fromEmail;
  return user.name?.trim() || "User";
}

export function getInitials(displayName: string): string {
  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (
      parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
    ).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase() || "?";
}

export function primaryAppRole(roles: string[]): string {
  const visible = roles.filter((r) => DISPLAY_ROLES.has(r));
  if (visible.length > 0) roles = visible;
  if (roles.includes("admin")) return "admin";
  if (roles.includes("health_officer")) return "health_officer";
  return roles[0] || "User";
}

export function compactRoles(roles: string[]): { shown: string[]; extra: number } {
  roles = roles.filter((r) => DISPLAY_ROLES.has(r));
  const ordered = [
    ...roles.filter((r) => HIGHLIGHT_ROLES.has(r)),
    ...roles.filter((r) => !HIGHLIGHT_ROLES.has(r)),
  ];
  const primary = ordered[0];
  return { shown: primary ? [primary] : [], extra: 0 };
}

export function canSeeAdminNav(roles: string[]): boolean {
  return roles.includes("admin");
}
