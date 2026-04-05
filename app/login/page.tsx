"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Syringe, Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { getAllowedLoginRoles } from "@/lib/auth-config";
import { login, getBootstrap, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const allowedRoles = getAllowedLoginRoles();

  useEffect(() => {
    let cancelled = false;
    async function checkExistingSession() {
      const fromExplicitLogout =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("immuno_explicit_logout") === "1";
      if (fromExplicitLogout) {
        window.sessionStorage.removeItem("immuno_explicit_logout");
        // User explicitly chose logout; do not auto-rehydrate session on login page.
        if (!cancelled) setIsCheckingSession(false);
        return;
      }
      try {
        const bootstrap = await getBootstrap();
        const hasAllowedRole = bootstrap.user.roles.some((role) =>
          allowedRoles.includes(role)
        );
        if (!cancelled && hasAllowedRole && !fromExplicitLogout) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
        if (!cancelled && !hasAllowedRole) {
          setError(
            "Your account is signed in but does not have required application roles."
          );
        }
      } catch {
        // No active session, stay on login page.
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    }
    checkExistingSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;
    setIsLoading(true);
    setError(null);
    try {
      await login(formData.email, formData.password);
      const bootstrap = await getBootstrap();
      const hasAllowedRole = bootstrap.user.roles.some((role) =>
        allowedRoles.includes(role)
      );
      if (!hasAllowedRole) {
        throw new ApiError({
          status: 403,
          message:
            "Login successful, but your account lacks required roles (admin, health_officer).",
        });
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const fe = err as ApiError;
      setError(fe?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Background with Pattern */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative bg-primary overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />
          
          {/* Floating Circles */}
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-40 right-20 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          
          {/* Medical Icons Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="medical-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M50 20 L50 40 M40 30 L60 30" stroke="currentColor" strokeWidth="3" fill="none" className="text-white"/>
                <circle cx="50" cy="70" r="10" stroke="currentColor" strokeWidth="2" fill="none" className="text-white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#medical-pattern)" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-primary-foreground">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <Syringe className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ImmuniTrack</span>
          </div>
          
          {/* Main Content */}
          <div className="max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-balance mb-6">
              Streamline Your Immunization Management
            </h1>
            <p className="text-lg xl:text-xl text-white/80 leading-relaxed mb-8">
              Track vaccinations, manage patient records, send automated reminders, 
              and ensure compliance with our comprehensive healthcare solution.
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
                Patient Tracking
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
                SMS & Email Reminders
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
                RBAC Security
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex gap-12">
            <div>
              <div className="text-3xl xl:text-4xl font-bold">50K+</div>
              <div className="text-white/70 text-sm">Patients Tracked</div>
            </div>
            <div>
              <div className="text-3xl xl:text-4xl font-bold">120+</div>
              <div className="text-white/70 text-sm">Healthcare Facilities</div>
            </div>
            <div>
              <div className="text-3xl xl:text-4xl font-bold">99.9%</div>
              <div className="text-white/70 text-sm">Uptime</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary rounded-xl">
              <Syringe className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">ImmuniTrack</span>
          </div>
          
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>
          
          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@healthcare.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="h-12 bg-card"
                required
              />
            </div>
            
            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="#"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-12 pr-12 bg-card"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={formData.rememberMe}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, rememberMe: checked as boolean })
                }
              />
              <Label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Remember me for 30 days
              </Label>
            </div>
            
            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold gap-2"
              disabled={isLoading || isCheckingSession}
            >
              {isCheckingSession ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Checking session...
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>
          
          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">
                Need help?
              </span>
            </div>
          </div>
          
          {/* Support Link */}
          <p className="text-center text-sm text-muted-foreground">
            Having trouble signing in?{" "}
            <Link
              href="#"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Contact IT Support
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Role access comes from your Laravel (Spatie) roles.
          </p>
          
          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Protected by enterprise-grade security. Your data is encrypted and secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
