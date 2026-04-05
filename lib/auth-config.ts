/**
 * Login and API configuration. The app uses the Laravel API only.
 */

/** Spatie role names allowed to sign in to the dashboard. */
export const ALLOWED_LOGIN_ROLES = ["admin", "health_officer"] as const;

export function getAllowedLoginRoles(): readonly string[] {
  return ALLOWED_LOGIN_ROLES;
}
