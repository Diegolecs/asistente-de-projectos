/**
 * Utilities for extracting exact device local date, time, weekday, and timezone.
 * Provides temporal anchoring so Gemini correctly interprets relative dates
 * like "hoy", "mañana", "ayer", "el viernes", "la próxima semana".
 */

export interface DeviceTimeContext {
  currentDate: string; // YYYY-MM-DD
  currentTime: string; // HH:mm:ss
  formattedDate: string; // e.g. "martes, 22 de septiembre de 2026"
  weekday: string; // e.g. "martes"
  timezone: string; // e.g. "America/Lima"
  timezoneOffsetMinutes: number;
  tomorrowDate: string; // YYYY-MM-DD
  yesterdayDate: string; // YYYY-MM-DD
}

const WEEKDAY_NAMES_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Returns current device date as YYYY-MM-DD in local time
 */
export function getDeviceLocalDate(dateObj = new Date()): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current device local time as HH:mm
 */
export function getDeviceLocalTime(dateObj = new Date()): string {
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Returns current device local time as HH:mm:ss
 */
export function getDeviceLocalTimeWithSeconds(dateObj = new Date()): string {
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Returns the device IANA timezone (e.g. 'America/Lima', 'America/New_York')
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Returns the Spanish weekday name (e.g. 'lunes', 'martes')
 */
export function getDeviceWeekday(dateObj = new Date()): string {
  return WEEKDAY_NAMES_ES[dateObj.getDay()];
}

/**
 * Returns date shifted by N days from given reference date
 */
export function addDays(dateStr: string, days: number): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    return getDeviceLocalDate(d);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return getDeviceLocalDate(d);
  }
}

/**
 * Formats a YYYY-MM-DD string into natural Spanish
 * e.g. "martes, 22 de septiembre de 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const weekday = WEEKDAY_NAMES_ES[d.getDay()];
    const monthName = MONTH_NAMES_ES[d.getMonth()];
    return `${weekday}, ${day} de ${monthName} de ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Constructs the full DeviceTimeContext payload for Gemini
 */
export function getDeviceFullContext(): DeviceTimeContext {
  const now = new Date();
  const currentDate = getDeviceLocalDate(now);
  const currentTime = getDeviceLocalTimeWithSeconds(now);
  const weekday = getDeviceWeekday(now);
  const timezone = getDeviceTimezone();
  const timezoneOffsetMinutes = -now.getTimezoneOffset();
  const tomorrowDate = addDays(currentDate, 1);
  const yesterdayDate = addDays(currentDate, -1);
  const formattedDate = formatDisplayDate(currentDate);

  return {
    currentDate,
    currentTime,
    formattedDate,
    weekday,
    timezone,
    timezoneOffsetMinutes,
    tomorrowDate,
    yesterdayDate,
  };
}

/**
 * Resolves natural Spanish relative expressions into a YYYY-MM-DD date.
 * If cannot resolve, returns null.
 */
export function resolveRelativeSpanishDate(
  expression: string,
  timeContext: DeviceTimeContext = getDeviceFullContext()
): string | null {
  if (!expression) return null;
  const expr = expression.trim().toLowerCase();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(expr)) {
    return expr;
  }

  // Exact matches
  if (expr === 'hoy' || expr === 'today') {
    return timeContext.currentDate;
  }
  if (expr === 'mañana' || expr === 'tomorrow') {
    return timeContext.tomorrowDate;
  }
  if (expr === 'pasado mañana') {
    return addDays(timeContext.currentDate, 2);
  }
  if (expr === 'ayer' || expr === 'yesterday') {
    return timeContext.yesterdayDate;
  }

  // Weekdays (e.g. "el jueves", "este viernes", "el próximo lunes")
  const weekdays: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
  };

  for (const [name, targetDay] of Object.entries(weekdays)) {
    if (expr.includes(name)) {
      const [year, month, day] = timeContext.currentDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const currentDay = d.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) {
        diff += 7; // Next occurrence
      }
      return addDays(timeContext.currentDate, diff);
    }
  }

  return null;
}
