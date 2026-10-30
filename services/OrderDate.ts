const ORDER_DATE = /^(\d{4})-(\d{2})-(\d{2}) /;

// Read by hand: Hermes does not promise Date.parse on this format, and the day must not shift with the phone's time zone.
export function formatOrderDate(orderDate: string): string {
  const match = ORDER_DATE.exec(orderDate);
  if (!match) {
    return "";
  }
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
