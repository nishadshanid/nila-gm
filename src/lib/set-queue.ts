import type { SetValuesInput } from "@/lib/workout-schema";

/**
 * Sets saved on this phone while there was no signal, waiting to be sent.
 * Kept per workout in localStorage so they survive the app being closed.
 * Only the latest values of each set matter, so the queue is keyed by set id.
 */
export type Pending = Record<string, SetValuesInput>;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const key = (workoutId: string) => `nila-gym.pending-sets.${workoutId}`;

function store(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readPending(workoutId: string, s: Store | null = store()): Pending {
  try {
    return JSON.parse(s?.getItem(key(workoutId)) ?? "{}") as Pending;
  } catch {
    return {};
  }
}

function write(workoutId: string, pending: Pending, s: Store | null) {
  try {
    if (Object.keys(pending).length) s?.setItem(key(workoutId), JSON.stringify(pending));
    else s?.removeItem(key(workoutId));
  } catch {}
}

/** Remembers a set's latest values to send later. Returns how many sets are waiting. */
export function queueSet(
  workoutId: string,
  setId: string,
  values: SetValuesInput,
  s: Store | null = store(),
): number {
  const pending = { ...readPending(workoutId, s), [setId]: values };
  write(workoutId, pending, s);
  return Object.keys(pending).length;
}

/** Forgets a set (it was sent, or deleted). Returns how many are still waiting. */
export function dropSet(workoutId: string, setId: string, s: Store | null = store()): number {
  const pending = readPending(workoutId, s);
  delete pending[setId];
  write(workoutId, pending, s);
  return Object.keys(pending).length;
}

/**
 * Tries to send everything waiting. `send` throws when there's still no network;
 * then it stops and keeps the rest. Returns how many are still waiting.
 */
export async function flushSets(
  workoutId: string,
  send: (setId: string, values: SetValuesInput) => Promise<{ ok: boolean }>,
  s: Store | null = store(),
): Promise<number> {
  for (const [setId, values] of Object.entries(readPending(workoutId, s))) {
    try {
      // A rejected save (e.g. the set was deleted) won't succeed later either.
      await send(setId, values);
    } catch {
      break;
    }
    dropSet(workoutId, setId, s);
  }
  return Object.keys(readPending(workoutId, s)).length;
}
