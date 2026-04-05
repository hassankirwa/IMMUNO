"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mail, MessageSquare, Phone, Save } from "lucide-react";
import {
  ApiError,
  getChannelGatewaySettings,
  updateChannelGatewaySettings,
} from "@/lib/api";
import type { ChannelGatewaySettings, SmsChannelEnvironment, SmsChannelProvider } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

type Props = {
  isAdmin: boolean;
};

export function ChannelGatewaySettingsCard({ isAdmin }: Props) {
  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ChannelGatewaySettings | null>(null);

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsProvider, setSmsProvider] = useState<SmsChannelProvider>("africas_talking");
  const [smsEnvironment, setSmsEnvironment] = useState<SmsChannelEnvironment>("production");
  const [smsIdentity, setSmsIdentity] = useState("");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("");

  const [waEnabled, setWaEnabled] = useState(false);
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waBizId, setWaBizId] = useState("");
  const [waToken, setWaToken] = useState("");

  const [emailCustom, setEmailCustom] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpEnc, setSmtpEnc] = useState<string>("");
  const [fromAddr, setFromAddr] = useState("");
  const [fromName, setFromName] = useState("");

  const applyLoaded = useCallback((d: ChannelGatewaySettings) => {
    setData(d);
    setSmsEnabled(d.sms.enabled);
    setSmsProvider(d.sms.provider);
    setSmsEnvironment(d.sms.environment);
    setSmsSenderId(d.sms.sender_id ?? "");
    setSmsIdentity("");
    setSmsApiKey("");
    setWaEnabled(d.whatsapp.enabled);
    setWaPhoneId(d.whatsapp.phone_number_id ?? "");
    setWaBizId(d.whatsapp.business_account_id ?? "");
    setWaToken("");
    setEmailCustom(d.email.use_custom_smtp);
    setSmtpHost(d.email.smtp_host ?? "");
    setSmtpPort(d.email.smtp_port != null ? String(d.email.smtp_port) : "");
    setSmtpUser(d.email.smtp_username ?? "");
    setSmtpPass("");
    setSmtpEnc(d.email.smtp_encryption ?? "");
    setFromAddr(d.email.from_address ?? "");
    setFromName(d.email.from_name ?? "");
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await getChannelGatewaySettings();
        if (!cancelled) applyLoaded(d);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : "Could not load channel settings";
          toast({ title: "Channel settings", description: msg, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, applyLoaded]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        sms_enabled: smsEnabled,
        sms_provider: smsProvider,
        sms_environment: smsEnvironment,
        sms_from_number: smsSenderId.trim() || null,
        whatsapp_enabled: waEnabled,
        whatsapp_phone_number_id: waPhoneId.trim() || null,
        whatsapp_business_account_id: waBizId.trim() || null,
        email_use_custom_smtp: emailCustom,
        email_smtp_host: smtpHost.trim() || null,
        email_smtp_port: smtpPort.trim() ? Number(smtpPort.trim()) : null,
        email_smtp_username: smtpUser.trim() || null,
        email_from_address: fromAddr.trim() || null,
        email_from_name: fromName.trim() || null,
        email_smtp_encryption: smtpEnc === "tls" || smtpEnc === "ssl" ? smtpEnc : null,
      };
      if (smsIdentity.trim()) payload.sms_account_sid = smsIdentity.trim();
      if (smsApiKey.trim()) payload.sms_auth_token = smsApiKey.trim();
      if (waToken.trim()) payload.whatsapp_access_token = waToken.trim();
      if (smtpPass.trim()) payload.email_smtp_password = smtpPass.trim();

      const next = await updateChannelGatewaySettings(payload);
      applyLoaded(next);
      setSmsIdentity("");
      setSmsApiKey("");
      setWaToken("");
      setSmtpPass("");
      toast({ title: "Channel settings saved" });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Save failed";
      toast({ title: "Could not save", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Channel configuration</CardTitle>
          <CardDescription>API keys and provider credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            SMS, WhatsApp, and email gateway credentials can only be viewed and edited by{" "}
            <strong className="text-foreground">administrators</strong>. Ask an admin to sign in and open
            Settings → Notifications, or configure the API server environment.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !data) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Channel configuration</CardTitle>
          <CardDescription>API keys and provider credentials (admin)</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading gateway settings…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>Channel configuration</CardTitle>
        <CardDescription>
          SMS defaults to{" "}
          <a
            href="https://africastalking.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Africa&apos;s Talking
          </a>{" "}
          (username + API key + sender ID per their dashboard). WhatsApp and optional SMTP below. Secrets are
          encrypted at rest; leave secret fields blank to keep existing values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-chart-1" />
            SMS
          </div>
          <div className="flex items-center justify-between gap-4 max-w-md">
            <div>
              <p className="text-sm font-medium">Enable SMS</p>
              <p className="text-xs text-muted-foreground">
                Provider SDK on the server uses these credentials when dispatch is wired.
              </p>
            </div>
            <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Africa&apos;s Talking:</strong> In the{" "}
              <a
                href="https://account.africastalking.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                account dashboard
              </a>
              , create an app and note the <strong className="text-foreground">username</strong>. Under{" "}
              <strong className="text-foreground">Settings → API Key</strong>, generate and copy the key (wait a few
              minutes before testing). Register a <strong className="text-foreground">Sender ID</strong> under SMS
              (alphanumeric or short code) for the &quot;from&quot; name recipients see.
            </p>
            <p>
              Use <strong className="text-foreground">Sandbox</strong> for test numbers; switch to{" "}
              <strong className="text-foreground">Production</strong> for live routes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 max-w-xl">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={smsProvider}
                onValueChange={(v) => setSmsProvider(v as SmsChannelProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="africas_talking">Africa&apos;s Talking</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {smsProvider === "africas_talking" ? (
              <div className="space-y-2">
                <Label>API environment</Label>
                <Select
                  value={smsEnvironment}
                  onValueChange={(v) => setSmsEnvironment(v as SmsChannelEnvironment)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (api.sandbox.africastalking.com)</SelectItem>
                    <SelectItem value="production">Production (api.africastalking.com)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground flex items-end pb-2">
                Twilio uses live credentials; environment applies to Africa&apos;s Talking only.
              </div>
            )}
          </div>

          {data.sms.username ? (
            <p className="text-xs text-muted-foreground">
              {smsProvider === "africas_talking" ? "Username" : "Account SID"} on file:{" "}
              <span className="font-mono">{data.sms.username}</span>
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cg-sms-identity">
                {smsProvider === "africas_talking" ? "Username (replace)" : "Account SID (replace)"}
              </Label>
              <Input
                id="cg-sms-identity"
                autoComplete="off"
                placeholder={
                  smsProvider === "africas_talking"
                    ? "App username from Africa's Talking"
                    : "ACxxxxxxxx…"
                }
                value={smsIdentity}
                onChange={(e) => setSmsIdentity(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cg-sms-apikey">
                {smsProvider === "africas_talking" ? "API key" : "Auth token"}{" "}
                {data.sms.api_key_configured ? "(configured)" : ""}
              </Label>
              <Input
                id="cg-sms-apikey"
                type="password"
                autoComplete="new-password"
                placeholder={
                  data.sms.api_key_configured ? "Leave blank to keep existing" : "Paste from provider dashboard"
                }
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cg-sms-sender">
                {smsProvider === "africas_talking" ? "Sender ID" : "From number (E.164)"}
              </Label>
              <Input
                id="cg-sms-sender"
                placeholder={
                  smsProvider === "africas_talking"
                    ? "Registered alphanumeric or short code"
                    : "+15551234567"
                }
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value)}
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4 text-success" />
            WhatsApp
          </div>
          <div className="flex items-center justify-between gap-4 max-w-md">
            <div>
              <p className="text-sm font-medium">Enable WhatsApp</p>
              <p className="text-xs text-muted-foreground">Meta WhatsApp Cloud API</p>
            </div>
            <Switch checked={waEnabled} onCheckedChange={setWaEnabled} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cg-wa-phone">Phone number ID</Label>
              <Input
                id="cg-wa-phone"
                placeholder="From Meta Business Suite"
                value={waPhoneId}
                onChange={(e) => setWaPhoneId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cg-wa-biz">WhatsApp Business Account ID</Label>
              <Input
                id="cg-wa-biz"
                placeholder="Optional"
                value={waBizId}
                onChange={(e) => setWaBizId(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cg-wa-token">
                Permanent access token {data.whatsapp.access_token_configured ? "(configured)" : ""}
              </Label>
              <Input
                id="cg-wa-token"
                type="password"
                autoComplete="new-password"
                placeholder={
                  data.whatsapp.access_token_configured ? "Leave blank to keep existing" : "Paste token"
                }
                value={waToken}
                onChange={(e) => setWaToken(e.target.value)}
              />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-chart-2" />
            Email (SMTP)
          </div>
          <div className="flex items-center justify-between gap-4 max-w-md">
            <div>
              <p className="text-sm font-medium">Use custom SMTP</p>
              <p className="text-xs text-muted-foreground">
                When off, the server falls back to Laravel <code className="text-xs">MAIL_*</code> environment
                defaults.
              </p>
            </div>
            <Switch checked={emailCustom} onCheckedChange={setEmailCustom} />
          </div>
          {emailCustom ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cg-smtp-host">SMTP host</Label>
                <Input
                  id="cg-smtp-host"
                  placeholder="smtp.example.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cg-smtp-port">Port</Label>
                <Input
                  id="cg-smtp-port"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cg-smtp-user">Username</Label>
                <Input
                  id="cg-smtp-user"
                  autoComplete="off"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cg-smtp-pass">
                  Password {data.email.smtp_password_configured ? "(configured)" : ""}
                </Label>
                <Input
                  id="cg-smtp-pass"
                  type="password"
                  autoComplete="new-password"
                  placeholder={data.email.smtp_password_configured ? "Leave blank to keep" : ""}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Encryption</Label>
                <Select value={smtpEnc || "__none__"} onValueChange={(v) => setSmtpEnc(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cg-from-addr">From address</Label>
                <Input
                  id="cg-from-addr"
                  type="email"
                  placeholder="reminders@facility.org"
                  value={fromAddr}
                  onChange={(e) => setFromAddr(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cg-from-name">From name</Label>
                <Input
                  id="cg-from-name"
                  placeholder="Immunisation reminders"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </section>

        <Button type="button" className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save channel settings
        </Button>
      </CardContent>
    </Card>
  );
}
