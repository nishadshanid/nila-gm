import { describe, expect, it } from "vitest";
import { clean } from "./clean-env";

describe("clean", () => {
  it("strips the usual copy-paste slips", () => {
    expect(clean(' "https://x.supabase.co" ')).toBe("https://x.supabase.co");
    expect(clean("'abc'\n")).toBe("abc");
    expect(clean("abc\r\n")).toBe("abc");
    expect(clean(undefined)).toBe("");
  });

  it("leaves normal values and inner quotes alone", () => {
    expect(clean("https://x.supabase.co")).toBe("https://x.supabase.co");
    expect(clean('a"b')).toBe('a"b');
  });
});
