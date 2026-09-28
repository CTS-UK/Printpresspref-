export function fahrenheitFromCelsius(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

export function fahrenheitToShow(tempC: number, tempF: number | null): number {
  if (tempF == null) return fahrenheitFromCelsius(tempC);
  return tempF;
}

export function fahrenheitNote(tempC: number, tempF: number | null): string {
  const converted = fahrenheitFromCelsius(tempC);
  const shown = fahrenheitToShow(tempC, tempF);
  if (Math.abs(shown - converted) <= 1) {
    return "Set this if the controller is in Fahrenheit. It is the same target.";
  }
  return "Set this if the controller is in Fahrenheit. It is the chart figure, which does not round to the same whole number as the Celsius target.";
}

export function controllerSetpoint(targetC: number, offsetC: number): number {
  return Math.round(targetC + offsetC);
}

export function mmToCm(mm: number): string {
  const cm = mm / 10;
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest}s`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function londonMidnightUtc(now = new Date()): Date {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const utcMidnight = new Date(`${date}T00:00:00Z`);
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(utcMidnight);
  const [hour, minute] = clock.split(":").map(Number);
  return new Date(utcMidnight.getTime() - (hour * 60 + minute) * 60 * 1000);
}

export function sqliteUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
