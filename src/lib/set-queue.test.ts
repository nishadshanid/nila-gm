import { describe, expect, it } from "vitest";
import { dropSet, flushSets, queueSet, readPending } from "./set-queue";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const v = (reps: number, done = true) => ({
  reps,
  weight_kg: 40,
  duration_s: null,
  distance_m: null,
  is_warmup: false,
  done,
});

describe("set queue", () => {
  it("keeps the latest values per set", () => {
    const s = memory();
    expect(queueSet("w1", "a", v(8), s)).toBe(1);
    expect(queueSet("w1", "a", v(10), s)).toBe(1);
    expect(queueSet("w1", "b", v(6), s)).toBe(2);
    expect(readPending("w1", s).a.reps).toBe(10);
    expect(readPending("w2", s)).toEqual({});
  });

  it("drops a set and cleans up when empty", () => {
    const s = memory();
    queueSet("w1", "a", v(8), s);
    expect(dropSet("w1", "a", s)).toBe(0);
    expect(s.data.size).toBe(0);
  });

  it("sends everything when back online", async () => {
    const s = memory();
    queueSet("w1", "a", v(8), s);
    queueSet("w1", "b", v(6), s);
    const sent: string[] = [];
    const left = await flushSets("w1", async (id) => (sent.push(id), { ok: true }), s);
    expect(left).toBe(0);
    expect(sent).toEqual(["a", "b"]);
  });

  it("stops at the first network failure and keeps the rest", async () => {
    const s = memory();
    queueSet("w1", "a", v(8), s);
    queueSet("w1", "b", v(6), s);
    let calls = 0;
    const left = await flushSets(
      "w1",
      async () => {
        if (++calls === 2) throw new TypeError("Failed to fetch");
        return { ok: true };
      },
      s,
    );
    expect(left).toBe(1);
    expect(Object.keys(readPending("w1", s))).toEqual(["b"]);
  });

  it("survives broken storage", () => {
    const s = memory();
    s.setItem("nila-gym.pending-sets.w1", "not json");
    expect(readPending("w1", s)).toEqual({});
    expect(queueSet("w1", "a", v(1), null)).toBe(1);
  });
});
