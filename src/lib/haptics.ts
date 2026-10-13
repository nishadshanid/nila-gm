/** A short buzz on phones that support it (Android); silently nothing elsewhere. */
export function tapFeedback() {
  try {
    navigator.vibrate?.(12);
  } catch {}
}
