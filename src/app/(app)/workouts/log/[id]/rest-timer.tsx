"use client";

import { useEffect, useState } from "react";
import { Timer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/workout";

function beep() {
  try {
    const audio = new AudioContext();
    [0, 0.3, 0.6].forEach((offset) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, audio.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.25);
      osc.connect(gain).connect(audio.destination);
      osc.start(audio.currentTime + offset);
      osc.stop(audio.currentTime + offset + 0.25);
    });
  } catch {}
}

/**
 * Counts down the rest after a set, floating above the bottom bar. At zero the
 * phone buzzes and beeps. `endAt` is a timestamp; null hides it.
 */
export function RestTimer({
  endAt,
  onChange,
}: {
  endAt: number | null;
  onChange: (endAt: number | null) => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endAt]);

  const left = endAt === null ? 0 : Math.ceil((endAt - now) / 1000);

  useEffect(() => {
    if (endAt === null || left > 0) return;
    onChange(null);
    try {
      navigator.vibrate?.([250, 120, 250]);
    } catch {}
    beep();
    toast("Rest's over. Next set! 💪", { duration: 4000 });
  }, [endAt, left, onChange]);

  if (endAt === null || left <= 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
      <div
        role="timer"
        aria-live="off"
        className="bg-foreground text-background flex items-center gap-1 rounded-full py-1.5 pr-1.5 pl-4 shadow-lg"
      >
        <Timer className="size-4" />
        <span className="w-14 text-center font-mono text-lg font-semibold tabular-nums">
          {formatClock(left)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="hover:bg-background/15 hover:text-background h-8 rounded-full px-2.5"
          onClick={() => onChange(Math.max(Date.now() + 1000, endAt - 15000))}
        >
          −15
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="hover:bg-background/15 hover:text-background h-8 rounded-full px-2.5"
          onClick={() => onChange(endAt + 15000)}
        >
          +15
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="hover:bg-background/15 hover:text-background size-8 rounded-full"
          aria-label="Skip rest"
          onClick={() => onChange(null)}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
