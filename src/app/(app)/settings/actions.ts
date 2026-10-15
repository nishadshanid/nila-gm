"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
});

export type ProfileState = { ok?: boolean; error?: string };

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Remembers this device so the server can send it notifications. */
export async function savePushSubscription(
  subscription: unknown,
  userAgent: string,
): Promise<ProfileState> {
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { error: "This browser gave an invalid subscription." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };

  const { endpoint, keys } = parsed.data;
  // A device can move between accounts; it belongs to whoever enabled it last.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: userAgent.slice(0, 300),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ProfileState> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Whether you want phone notifications at all (on every device you enabled). */
export async function updatePushPreference(enabled: boolean): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };
  const { error } = await supabase
    .from("profiles")
    .update({ push_notifications: enabled })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/** Sends "It works!" to all your devices. */
export async function sendTestNotification(): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out." };
  const { pushConfigured, sendPush } = await import("@/lib/push");
  if (!pushConfigured()) return { error: "Phone notifications aren't set up on the server yet." };
  try {
    // Your own devices only: RLS limits the client to your rows.
    const devices = await sendPush(supabase, user.id, {
      title: "Nila Gym",
      body: "It works! Reminders and cheers will show up like this.",
      path: "/settings",
    });
    if (devices === 0) return { error: "No devices are turned on yet." };
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
