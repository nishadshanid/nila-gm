"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/types";
import { updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});

  useEffect(() => {
    if (state.ok) toast.success("Profile saved");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={profile.name} maxLength={40} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="color">Your color</Label>
        <div className="flex items-center gap-3">
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue={profile.color}
            className="h-10 w-16 cursor-pointer p-1"
          />
          <span className="text-muted-foreground text-sm">Used to mark your items everywhere.</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Email</Label>
        <p className="text-muted-foreground text-sm">{profile.email}</p>
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
