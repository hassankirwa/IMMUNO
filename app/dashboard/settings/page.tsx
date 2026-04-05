"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Bell,
  Shield,
  Palette,
  Mail,
  Save,
  Upload,
  Loader2,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { useAppSession } from "@/components/app-session-provider";
import {
  ApiError,
  changePassword,
  updateProfile,
  uploadProfileAvatar,
  deleteProfileAvatar,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { ChannelGatewaySettingsCard } from "@/components/settings/channel-gateway-settings";

const COMPACT_KEY = "immuno_compact_mode";
const SIDEBAR_POS_KEY = "immuno_sidebar_position";

function splitFullName(full: string): { first: string; last: string } {
  const t = full.trim();
  if (!t) return { first: "", last: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { first: t, last: "" };
  return { first: t.slice(0, i), last: t.slice(i + 1).trim() };
}

function joinName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim();
}

export default function SettingsPage() {
  const session = useAppSession();
  const {
    refresh,
    loading: sessionLoading,
    error: sessionError,
    bootstrap,
    avatarUrl,
  } = session;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [compactMode, setCompactMode] = useState(false);
  const [sidebarPos, setSidebarPos] = useState<"left" | "right">("left");
  const [savingAppearance, setSavingAppearance] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCompactMode(window.localStorage.getItem(COMPACT_KEY) === "1");
    const p = window.localStorage.getItem(SIDEBAR_POS_KEY);
    if (p === "right" || p === "left") setSidebarPos(p);
  }, []);

  useEffect(() => {
    const u = bootstrap?.user;
    if (!u) return;
    const full = u.full_name || u.name || u.email || "";
    const { first, last } = splitFullName(full);
    setFirstName(first);
    setLastName(last);
    setEmail(u.email || u.user || "");
  }, [bootstrap?.user]);

  const initials = session.initials;
  const facilityLabel = bootstrap?.user?.facility?.name ?? "—";
  const isAdmin = session.roles.includes("admin");

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be 2MB or smaller", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      await uploadProfileAvatar(file);
      await refresh();
      toast({ title: "Photo updated" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Upload failed";
      toast({
        title: "Could not upload photo",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;
    setUploadingAvatar(true);
    try {
      await deleteProfileAvatar();
      await refresh();
      toast({ title: "Photo removed" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Request failed";
      toast({
        title: "Could not remove photo",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    const name = joinName(firstName, lastName);
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ name, email: email.trim() || undefined });
      await refresh();
      toast({ title: "Profile saved" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Request failed";
      toast({
        title: "Could not save profile",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refresh();
      toast({ title: "Password updated" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Request failed";
      toast({
        title: "Could not update password",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveAppearance = useCallback(() => {
    setSavingAppearance(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COMPACT_KEY, compactMode ? "1" : "0");
        window.localStorage.setItem(SIDEBAR_POS_KEY, sidebarPos);
      }
      toast({ title: "Appearance preferences saved on this device" });
    } finally {
      setSavingAppearance(false);
    }
  }, [compactMode, sidebarPos]);

  const themeValue = useMemo(() => {
    if (!mounted) return "system";
    return theme ?? "system";
  }, [mounted, theme]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading settings…
      </div>
    );
  }

  if (sessionError || !bootstrap?.user) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {sessionError || "Could not load your session. Try signing in again."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <Avatar className="h-20 w-20">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    aria-hidden
                    tabIndex={-1}
                    onChange={handleAvatarChange}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload Photo
                    </Button>
                    {avatarUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="gap-2 text-destructive hover:text-destructive"
                        disabled={uploadingAvatar}
                        onClick={handleRemoveAvatar}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG, GIF or WebP. Max 2MB. Shown in the header and sidebar.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={savingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={savingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={savingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="Not stored" disabled />
                  <p className="text-xs text-muted-foreground">Phone is not stored on your account yet.</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="facility">Assigned Facility</Label>
                  <Input id="facility" value={facilityLabel} disabled />
                </div>
              </div>

              <Button
                type="button"
                className="gap-2"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Personal alert preferences will be available in a future update.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Granular toggles (email summaries, overdue alerts, in-app sound) are not wired to the backend
                yet. When they are, you will choose what you want to receive here.
              </p>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                SMS, email, and WhatsApp for <strong className="text-foreground">patient reminders</strong> use
                templates and schedules on the{" "}
                <Link href="/dashboard/schedule" className="text-primary font-medium underline-offset-4 hover:underline inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  Vaccination Schedule
                </Link>{" "}
                page (reminder rules and activity).
              </div>
            </CardContent>
          </Card>

          <ChannelGatewaySettingsCard isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                />
              </div>
              <Button
                type="button"
                className="gap-2"
                onClick={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm opacity-80">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">
                    Not available yet. This will require backend support.
                  </p>
                </div>
                <Switch disabled checked={false} aria-readonly />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm opacity-80">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Session management is not available in the app yet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                After a successful password change, other API tokens for your account are revoked; sign in again on
                other devices if needed.
              </p>
              <Button type="button" variant="outline" className="w-full" disabled>
                Sign Out All Other Sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Customize the appearance of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Color Theme</Label>
                <Select
                  value={themeValue}
                  onValueChange={(v) => setTheme(v)}
                  disabled={!mounted}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder={mounted ? undefined : "…"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                {mounted && (
                  <p className="text-xs text-muted-foreground">
                    Active: {resolvedTheme ?? theme ?? "system"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Compact Mode</Label>
                <div className="flex items-center justify-between max-w-md gap-4">
                  <p className="text-sm text-muted-foreground">
                    Reduce spacing (saved locally for future use)
                  </p>
                  <Switch
                    checked={compactMode}
                    onCheckedChange={setCompactMode}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sidebar Position</Label>
                <Select
                  value={sidebarPos}
                  onValueChange={(v) => setSidebarPos(v as "left" | "right")}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                className="gap-2"
                onClick={handleSaveAppearance}
                disabled={savingAppearance}
              >
                {savingAppearance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Appearance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
