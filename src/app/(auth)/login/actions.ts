"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginState = { error?: string; email?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = schema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "invalid_credentials") return { error: "Wrong email or password.", email };
    if (error.code === "email_not_confirmed") {
      return { error: "This account isn't confirmed yet. Confirm it in Supabase → Users.", email };
    }
    // Anything else is a setup problem (wrong Supabase key or URL, Supabase down), not
    // the password: say so, so it can be fixed.
    console.error("[login] Supabase sign-in failed", error.status, error.code, error.message);
    return {
      error: `Couldn't reach the login service (${error.message}). Check the Supabase settings on the server.`,
      email,
    };
  }

  redirect("/");
}
