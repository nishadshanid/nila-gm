import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushConfigured, sendPush, type PushMessage } from "@/lib/push";

/**
 * After the response is sent, pushes "<name> added …" to the partner's phones.
 * Phone only (no email), and only if the partner has phone notifications on.
 * Never fails the action: problems are only logged.
 */
export function notifyPartner(
  actorId: string,
  build: (actorName: string) => Omit<PushMessage, "title"> & { title?: string },
) {
  if (!pushConfigured()) return;
  after(async () => {
    try {
      const db = createAdminClient();
      const { data, error } = await db.from("profiles").select("id, name, push_notifications");
      if (error) throw new Error(error.message);
      const actor = data.find((p) => p.id === actorId);
      const message = build(actor?.name || "Your partner");
      for (const partner of data) {
        if (partner.id === actorId || !partner.push_notifications) continue;
        await sendPush(db, partner.id, { title: "💪 Nila Gym", ...message });
      }
    } catch (e) {
      console.error("[notify-partner]", (e as Error).message);
    }
  });
}
