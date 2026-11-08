/**
 * Review 2026-11-08 — long text never reads at a large size (a 150-character bullet grown to 47
 * units, an 80-character statement at display). The largest font size a text of `chars`
 * characters may take: past 100 characters about body/lead size, past 60 a heading, past 28 a title.
 * Growing (`growText`) and the statement ladder keep to it.
 */
export const LOUD_TEXT_CAPS: ReadonlyArray<{ chars: number; size: number }> = [
  { chars: 100, size: 40 },
  { chars: 60, size: 64 },
  { chars: 28, size: 96 },
]

export function loudTextCap(chars: number): number {
  for (const c of LOUD_TEXT_CAPS) if (chars > c.chars) return c.size
  return Infinity
}
