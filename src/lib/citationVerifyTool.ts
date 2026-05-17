export function isCitationVerifyToolTitle(title: string): boolean {
  const t = title.toLowerCase()
  return t.includes('verify_claimed_pmids')
}
