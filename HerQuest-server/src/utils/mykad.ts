export function normalizeMyKad(value: string): string | null {
  if (!/^(?:\d{12}|\d{6}-\d{2}-\d{4})$/.test(value)) return null;
  return value.replace(/-/g, "");
}

export function isMyKadEligible(mykadNumber: string): boolean {
  return Number(mykadNumber[mykadNumber.length - 1]) % 2 === 0;
}
