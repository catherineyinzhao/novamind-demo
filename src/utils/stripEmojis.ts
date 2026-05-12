/**
 * Removes emoji / pictographic symbols for controlled Live UI copy.
 * Uses Unicode Extended_Pictographic (covers most emoji sequences when applied globally).
 */
export function stripEmojis(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, '')
}
