/**
 * Cleans a setting's value, tolerating the usual copy-paste slips in hosting
 * dashboards: surrounding spaces, line breaks and quotes ("…" or '…').
 */
export function clean(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^(["'])([\s\S]*)\1$/, "$2")
    .trim();
}
