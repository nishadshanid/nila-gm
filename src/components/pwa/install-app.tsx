"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const noop = () => () => {};

/** Install Nila Gym to the home screen: one tap on Android/Chrome, steps on iPhone. */
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  // Read once on the client; null during the server render.
  const env = useSyncExternalStore(
    noop,
    () =>
      window.matchMedia("(display-mode: standalone)").matches
        ? "standalone"
        : /iphone|ipad|ipod/i.test(navigator.userAgent)
          ? "ios"
          : "other",
    () => null,
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (env === null) return <div className="bg-muted h-10 animate-pulse rounded" />;

  if (env === "standalone" || installed) {
    return (
      <p className="text-muted-foreground text-sm">Nila Gym is installed on this device. 🎉</p>
    );
  }

  if (prompt) {
    return (
      <Button
        onClick={async () => {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === "accepted") setInstalled(true);
          setPrompt(null);
        }}
      >
        <Download /> Install Nila Gym
      </Button>
    );
  }

  if (env === "ios") {
    return (
      <ol className="text-muted-foreground flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          1. In Safari, tap <Share className="text-foreground size-4" /> Share.
        </li>
        <li className="flex items-center gap-2">
          2. Tap <SquarePlus className="text-foreground size-4" /> Add to Home Screen.
        </li>
        <li>3. Open Nila Gym from the home screen icon.</li>
      </ol>
    );
  }

  return (
    <p className="text-muted-foreground text-sm">
      In Chrome, open the ⋮ menu and choose{" "}
      <span className="text-foreground">Add to home screen</span> or{" "}
      <span className="text-foreground">Install app</span>. This needs the app&apos;s https address,
      not the local Wi-Fi one.
    </p>
  );
}
