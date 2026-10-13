import { clean } from "@/lib/clean-env";

function required(name: string, value: string | undefined): string {
  const v = clean(value);
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

function requiredUrl(name: string, value: string | undefined): string {
  const v = required(name, value).replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/]+/.test(v)) {
    throw new Error(
      `${name} should look like https://<project>.supabase.co (check it in your hosting settings)`,
    );
  }
  return v;
}

// NEXT_PUBLIC_* vars must be referenced literally so Next.js can inline them.
export const SUPABASE_URL = requiredUrl(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
