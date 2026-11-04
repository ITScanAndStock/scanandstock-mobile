const MOVEMENT_DATE = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;

// The API writes a UTC time without a zone, read by hand as the web reads it: Hermes does not promise Date.parse on this format.
function readUtc(text: string): Date | null {
  const match = MOVEMENT_DATE.exec(text);
  if (!match) {
    return null;
  }
  const [day, month, year, hour, minute, second] = match.slice(1).map(Number);
  if (minute > 59 || second > 59) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

function localDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatMovementDate(text: string | undefined, now: Date): string {
  const date = text === undefined ? null : readUtc(text);
  if (!date) {
    return "";
  }
  const daysAgo = localDayNumber(now) - localDayNumber(date);
  if (daysAgo === 0) {
    return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
  }
  if (daysAgo === 1) {
    return "hier";
  }
  const dayAndMonth = `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}`;
  if (date.getFullYear() === now.getFullYear()) {
    return dayAndMonth;
  }
  return `${dayAndMonth}/${date.getFullYear()}`;
}
