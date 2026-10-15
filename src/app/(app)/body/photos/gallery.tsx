/* eslint-disable @next/next/no-img-element -- private, signed Supabase links; already resized. */
"use client";

import { useRef, useState, useTransition } from "react";
import { Columns2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/segmented";
import { daysBetween, formatDay, relativeDay } from "@/lib/dates";
import { resizeImage } from "@/lib/resize-image";
import { createClient } from "@/lib/supabase/client";
import type { Pose } from "@/lib/types";
import type { PhotoWithUrl } from "@/lib/body-data";
import { cn } from "@/lib/utils";
import { addPhoto, deletePhoto } from "../actions";

const POSES: { value: Pose; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
];
const poseLabel = (p: Pose) => POSES.find((x) => x.value === p)!.label;

export function Gallery({
  userId,
  photos,
  today,
}: {
  userId: string;
  photos: PhotoWithUrl[];
  today: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [viewing, setViewing] = useState<PhotoWithUrl | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState<[PhotoWithUrl, PhotoWithUrl] | null>(null);

  const byDate = new Map<string, PhotoWithUrl[]>();
  for (const p of photos) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);

  function tap(p: PhotoWithUrl) {
    if (!picking) return setViewing(p);
    const next = picked.includes(p.id) ? picked.filter((id) => id !== p.id) : [...picked, p.id];
    if (next.length === 2) {
      const [a, b] = next.map((id) => photos.find((x) => x.id === id)!);
      setComparing(a.date <= b.date ? [a, b] : [b, a]);
      setPicking(false);
      setPicked([]);
    } else setPicked(next);
  }

  /** The oldest and newest photo of the most common pose. */
  function firstVsLatest() {
    for (const pose of ["front", "side", "back"] as Pose[]) {
      const same = photos.filter((p) => p.pose === pose);
      if (same.length >= 2 && same[0].date !== same.at(-1)!.date) {
        return setComparing([same.at(-1)!, same[0]]);
      }
    }
    toast("Add photos on two different days to compare them.");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => input.current?.click()}>
          <ImagePlus /> Add photo
        </Button>
        {photos.length >= 2 &&
          (picking ? (
            <Button
              variant="outline"
              onClick={() => {
                setPicking(false);
                setPicked([]);
              }}
            >
              <X /> Cancel compare
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={firstVsLatest}>
                <Columns2 /> First vs latest
              </Button>
              <Button variant="ghost" onClick={() => setPicking(true)}>
                Pick two
              </Button>
            </>
          ))}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
      {picking && (
        <p className="text-muted-foreground text-sm">
          Tap two photos to compare them ({picked.length} of 2).
        </p>
      )}

      {photos.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          No photos yet. Take a front, side and back photo now, then again every few weeks; the
          changes are easier to see than on the scale.
        </p>
      ) : (
        [...byDate].map(([date, list]) => (
          <section key={date}>
            <h2 className="mb-2 text-sm font-semibold">{relativeDay(date, today)}</h2>
            <div className="grid grid-cols-3 gap-2">
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => tap(p)}
                  className={cn(
                    "bg-muted relative aspect-[3/4] overflow-hidden rounded-lg",
                    picked.includes(p.id) && "ring-3 ring-green-600",
                  )}
                >
                  <img
                    src={p.url}
                    alt={`${poseLabel(p.pose)}, ${formatDay(p.date)}`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white">
                    {poseLabel(p.pose)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <UploadDialog file={file} userId={userId} today={today} onClose={() => setFile(null)} />
      <ViewDialog photo={viewing} today={today} onClose={() => setViewing(null)} />
      <CompareDialog pair={comparing} onClose={() => setComparing(null)} />
    </div>
  );
}

function UploadDialog({
  file,
  userId,
  today,
  onClose,
}: {
  file: File | null;
  userId: string;
  today: string;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [date, setDate] = useState(today);
  const [pose, setPose] = useState<Pose>("front");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (file !== lastFile) {
    setLastFile(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
    setError(null);
  }

  function upload() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const { blob, width, height } = await resizeImage(file);
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const supabase = createClient();
        const up = await supabase.storage
          .from("progress")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw new Error(up.error.message);
        const r = await addPhoto({ path, date, pose, width, height });
        if (!r.ok) throw new Error(r.error);
        toast.success("Photo saved");
        // Next photo of the set is usually the next pose.
        setPose((p) => (p === "front" ? "side" : p === "side" ? "back" : "front"));
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add photo</DialogTitle>
        </DialogHeader>
        {preview && (
          <img
            src={preview}
            alt="The photo to add"
            className="bg-muted mx-auto max-h-72 rounded-lg object-contain"
          />
        )}
        <Segmented value={pose} onChange={setPose} aria-label="Pose" options={POSES} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="photo-date" className="text-xs">
            Date
          </Label>
          <Input
            id="photo-date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={upload} disabled={pending}>
            {pending ? "Saving…" : "Save photo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({
  photo,
  today,
  onClose,
}: {
  photo: PhotoWithUrl | null;
  today: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!photo || !confirm("Delete this photo?")) return;
    startTransition(async () => {
      const r = await deletePhoto(photo.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Photo deleted");
      onClose();
    });
  }

  return (
    <Dialog open={photo !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {photo && `${poseLabel(photo.pose)} · ${relativeDay(photo.date, today)}`}
          </DialogTitle>
        </DialogHeader>
        {photo && (
          <>
            <img
              src={photo.url}
              alt={`${poseLabel(photo.pose)}, ${formatDay(photo.date)}`}
              className="bg-muted mx-auto max-h-[70dvh] rounded-lg object-contain"
            />
            <div className="flex justify-between gap-2">
              <Button variant="destructive" onClick={remove} disabled={pending}>
                Delete
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompareDialog({
  pair,
  onClose,
}: {
  pair: [PhotoWithUrl, PhotoWithUrl] | null;
  onClose: () => void;
}) {
  const days = pair ? daysBetween(pair[0].date, pair[1].date) : 0;
  return (
    <Dialog open={pair !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {days === 0
              ? "Same day"
              : days < 14
                ? `${days} days apart`
                : `${Math.round(days / 7)} weeks apart`}
          </DialogTitle>
        </DialogHeader>
        {pair && (
          <div className="grid grid-cols-2 gap-2">
            {pair.map((p) => (
              <figure key={p.id} className="min-w-0">
                <img
                  src={p.url}
                  alt={`${poseLabel(p.pose)}, ${formatDay(p.date)}`}
                  className="bg-muted aspect-[3/4] w-full rounded-lg object-cover"
                />
                <figcaption className="text-muted-foreground mt-1 text-center text-xs">
                  {formatDay(p.date, "d MMM yyyy")} · {poseLabel(p.pose)}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
