import "server-only";
import { clean } from "@/lib/clean-env";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushMessage = {
  title: string;
  body: string;
  path?: string;
  tag?: string;
  /** Merge into one notification on the phone (see public/sw.js), e.g. shopping items. */
  group?: { key: string; who: string; item: string };
};

const publicKey = () => clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

/** Whether phone notifications are set up (the VAPID key pair). */
export function pushConfigured() {
  return Boolean(publicKey() && clean(process.env.VAPID_PRIVATE_KEY));
}

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(
    clean(process.env.VAPID_SUBJECT) || "mailto:nila-gym@example.com",
    publicKey(),
    clean(process.env.VAPID_PRIVATE_KEY),
  );
  ready = true;
}

/**
 * Sends to every device the person turned notifications on for. Devices that
 * have gone away (uninstalled, permission revoked) are removed. Returns how
 * many devices got it.
 */
export async function sendPush(db: SupabaseClient, userId: string, message: PushMessage) {
  if (!pushConfigured()) return 0;
  setup();
  const { data, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw new Error(`Could not load devices: ${error.message}`);

  let delivered = 0;
  const failures: string[] = [];
  await Promise.all(
    data.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(message),
          { TTL: 60 * 60 * 12, urgency: "high" },
        );
        delivered++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          failures.push(`${status ?? ""} ${(e as Error).message}`.trim());
        }
      }
    }),
  );
  if (delivered === 0 && failures.length) throw new Error(`Push failed: ${failures[0]}`);
  return delivered;
}
