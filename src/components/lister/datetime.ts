// Small date/time helpers for the lister screens (local time).

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function splitISO(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return { date: toDateInput(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** Next occurrence of a weekday (0 = Sunday), at least one day ahead. */
function nextWeekday(weekday: number, extraWeeks = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + extraWeeks * 7);
  return d;
}

export function quickDates(): { label: string; value: string }[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [
    { label: "Tomorrow", value: toDateInput(tomorrow) },
    { label: "This Sat", value: toDateInput(nextWeekday(6)) },
    { label: "This Sun", value: toDateInput(nextWeekday(0)) },
    { label: "Next Sat", value: toDateInput(nextWeekday(6, 1)) },
    { label: "Next Sun", value: toDateInput(nextWeekday(0, 1)) },
  ];
}

export const TIME_PRESETS: { label: string; start: string; end: string }[] = [
  { label: "11 AM - 1 PM", start: "11:00", end: "13:00" },
  { label: "12 - 3 PM", start: "12:00", end: "15:00" },
  { label: "1 - 4 PM", start: "13:00", end: "16:00" },
  { label: "2 - 4 PM", start: "14:00", end: "16:00" },
  { label: "4 - 6 PM", start: "16:00", end: "18:00" },
];
