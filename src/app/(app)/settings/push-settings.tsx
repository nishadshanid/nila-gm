"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { BellRing, BellOff, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { clean } from "@/lib/clean-env";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
  updatePushPreference,
} from "./actions";

const VAPID_KEY = clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

function base64UrlToBytes(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

type Support = "ok" | "ios-install" | "unsupported" | "dev";
const noop = () => () => {};

function detectSupport(): Support {
  if (process.env.NODE_ENV !== "production") return "dev";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (ios && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return "ok";
}

/** Phone notifications: turn them on for this device, and choose whether you want them. */
export function PushSettings({
  enabled: initial,
  serverReady,
}: {
  enabled: boolean;
  serverReady: boolean;
}) {
  const support = useSyncExternalStore(noop, detectSupport, () => null);
  const [enabled, setEnabled] = useState(initial);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (support !== "ok") return;
    let active = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => active && setEndpoint(sub?.endpoint ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [support]);

  function turnOn() {
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notifications are blocked. Allow them in the browser or phone settings.");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(VAPID_KEY),
          }));
        const result = await savePushSubscription(sub.toJSON(), navigator.userAgent);
        if (result.error) return void toast.error(result.error);
        setEndpoint(sub.endpoint);
        toast.success("Notifications are on for this device");
      } catch (e) {
        toast.error(`Couldn't turn on notifications: ${(e as Error).message}`);
      }
    });
  }

  function turnOff() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpoint(null);
      toast.success("Notifications are off for this device");
    });
  }

  function test() {
    startTransition(async () => {
      const result = await sendTestNotification();
      if (result.error) toast.error(result.error);
      else toast.success("Sent. It should pop up in a moment.");
    });
  }

  function togglePreference(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const result = await updatePushPreference(next);
      if (result.error) {
        setEnabled(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="push-on">Phone notifications</Label>
          <p className="text-muted-foreground text-xs">
            The same reminders as email, on the devices you turn on below.
          </p>
        </div>
        <Switch id="push-on" checked={enabled} onCheckedChange={togglePreference} />
      </div>

      {!serverReady ? (
        <p className="text-muted-foreground text-sm">
          Not set up on the server yet (it needs the VAPID keys).
        </p>
      ) : support === null ? (
        <div className="bg-muted h-9 animate-pulse rounded" />
      ) : support === "dev" ? (
        <p className="text-muted-foreground text-sm">
          Works in the installed app (the https address), not the local dev server.
        </p>
      ) : support === "ios-install" ? (
        <p className="text-muted-foreground text-sm">
          On iPhone, first add Nila Gym to the Home Screen (see App above), open it from there, then
          come back here.
        </p>
      ) : support === "unsupported" ? (
        <p className="text-muted-foreground text-sm">This browser can&apos;t show notifications.</p>
      ) : endpoint ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={test} disabled={pending || !enabled}>
            <Send /> Send a test
          </Button>
          <Button variant="ghost" onClick={turnOff} disabled={pending}>
            <BellOff /> Turn off on this device
          </Button>
        </div>
      ) : (
        <Button onClick={turnOn} disabled={pending || !enabled} className="self-start">
          <BellRing /> Turn on for this device
        </Button>
      )}
    </div>
  );
}
