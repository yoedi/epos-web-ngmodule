/** Asia/Jakarta has no daylight saving time: always UTC+7. */
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Today's date in Asia/Jakarta as `YYYY-MM-DD`, the zone of the daily reports. */
export function jakartaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Calendar date picked in the date picker (local midnight) as `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM-DD` as a local-midnight Date, the form the date picker works with. */
export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}
