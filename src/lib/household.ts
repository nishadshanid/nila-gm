import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Person, Profile } from "@/lib/types";

export type Household = {
  me: Profile;
  partner: Profile | null;
  /** Both of you, me first: just what client components need. */
  people: Person[];
};

/** You and your partner (if their account exists). Cached per request. */
export const getHousehold = cache(async (): Promise<Household> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw new Error(`Could not load profiles: ${error.message}`);

  const profiles = (data ?? []) as Profile[];
  const me = profiles.find((p) => p.id === user.id);
  if (!me) {
    throw new Error(
      "No profile row for this user. Run the Supabase migrations (npx supabase db push).",
    );
  }
  const partner = profiles.find((p) => p.id !== user.id) ?? null;
  const people = [me, partner]
    .filter((p): p is Profile => p !== null)
    .map(({ id, name, color }) => ({ id, name, color }));
  return { me, partner, people };
});
