import { CalendarEvent, EventStatus } from '../types';

const STORAGE_KEY = 'project_os_calendar_events_v1';

/**
 * Helper to compute initial demo events relative to the current device date
 */
export function getInitialDemoEvents(): CalendarEvent[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const dayAfter = new Date(now.getTime() + 86400000 * 2);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  return [
    {
      id: 'event-demo-1',
      title: 'Revisión de arquitectura y memoria de Project OS',
      description: 'Sesión de trabajo para verificar el flujo de function calling y consistencia de estado.',
      date: todayStr,
      startTime: '16:00',
      endTime: '17:00',
      durationMinutes: 60,
      location: 'Google Meet',
      status: 'confirmado',
      projectId: 'proj-cv-smart',
      projectName: 'CV Smart',
      createdAt: new Date().toISOString(),
      provider: 'local',
      syncStatus: 'local_only',
    },
    {
      id: 'event-demo-2',
      title: 'Reunión de alineación con equipo beta',
      description: 'Revisar feedback de usuarios iniciales sobre exportación de PDFs y tiempos de respuesta.',
      date: tomorrowStr,
      startTime: '11:00',
      endTime: '12:00',
      durationMinutes: 60,
      location: 'Videollamada',
      status: 'confirmado',
      projectId: 'proj-cv-smart',
      projectName: 'CV Smart',
      createdAt: new Date().toISOString(),
      provider: 'local',
      syncStatus: 'local_only',
    },
    {
      id: 'event-demo-3',
      title: 'Planificación estratégica semanal',
      description: 'Definir prioridades de proyectos, resolver bloqueos y actualizar próximos pasos.',
      date: dayAfterStr,
      startTime: '10:00',
      endTime: '11:30',
      durationMinutes: 90,
      location: 'Oficina / Sala Principal',
      status: 'confirmado',
      createdAt: new Date().toISOString(),
      provider: 'local',
      syncStatus: 'local_only',
    },
  ];
}

/**
 * Formats a date (YYYY-MM-DD) and time (HH:mm) into Google Calendar UTC / local compact format:
 * YYYYMMDDTHHmm00
 */
export function formatToGoogleDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = (timeStr || '09:00').replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Calculates end time based on start time and duration in minutes
 */
export function calculateEndTime(startTime: string, durationMinutes: number = 60): string {
  try {
    const [h, m] = startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '17:00';
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch {
    return '17:00';
  }
}

/**
 * Generates direct Google Calendar event creation URL
 * Reference: Google Calendar Web URL Scheme
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const endTime = event.endTime || calculateEndTime(event.startTime, event.durationMinutes || 60);

  const startFormatted = formatToGoogleDateTime(event.date, event.startTime);
  const endFormatted = formatToGoogleDateTime(event.date, endTime);

  let details = event.description || '';
  if (event.projectName) {
    details = `[Proyecto Project OS: ${event.projectName}]\n\n${details}`.trim();
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startFormatted}/${endFormatted}`,
    details: details,
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates and triggers download of standard RFC 5545 iCalendar (.ics) file
 */
export function downloadIcsFile(event: CalendarEvent): void {
  const endTime = event.endTime || calculateEndTime(event.startTime, event.durationMinutes || 60);
  const startFormatted = formatToGoogleDateTime(event.date, event.startTime);
  const endFormatted = formatToGoogleDateTime(event.date, endTime);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Project OS//Calendario Interno//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@project-os.internal`,
    `DTSTAMP:${formatToGoogleDateTime(new Date().toISOString().split('T')[0], '00:00')}Z`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
    `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${(event.location || '').replace(/\n/g, ' ')}`,
    `STATUS:${event.status === 'cancelado' ? 'CANCELLED' : event.status === 'tentativo' ? 'TENTATIVE' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Checks for event conflicts on a specific date and time range
 */
export function checkAvailability(
  events: CalendarEvent[],
  date: string,
  startTime: string,
  endTime?: string,
  excludeEventId?: string
): { available: boolean; conflicts: CalendarEvent[] } {
  const calculatedEnd = endTime || calculateEndTime(startTime, 60);

  const dayEvents = events.filter(
    (e) => e.date === date && e.status !== 'cancelado' && (!excludeEventId || e.id !== excludeEventId)
  );

  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const newStartMin = toMinutes(startTime);
  const newEndMin = toMinutes(calculatedEnd);

  const conflicts = dayEvents.filter((e) => {
    const eStart = toMinutes(e.startTime);
    const eEnd = toMinutes(e.endTime || calculateEndTime(e.startTime, e.durationMinutes || 60));
    // Check overlap: start1 < end2 && start2 < end1
    return newStartMin < eEnd && eStart < newEndMin;
  });

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

class CalendarStorageService {
  generateGoogleCalendarUrl(event: CalendarEvent): string {
    return generateGoogleCalendarUrl(event);
  }

  downloadIcsFile(event: CalendarEvent): void {
    downloadIcsFile(event);
  }

  loadEvents(): CalendarEvent[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const initial = getInitialDemoEvents();
        this.saveEvents(initial);
        return initial;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        const initial = getInitialDemoEvents();
        this.saveEvents(initial);
        return initial;
      }
      return parsed;
    } catch (e) {
      console.error('Error loading calendar events from LocalStorage:', e);
      return getInitialDemoEvents();
    }
  }

  saveEvents(events: CalendarEvent[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error('Error saving calendar events to LocalStorage:', e);
    }
  }

  saveEvent(event: CalendarEvent): CalendarEvent[] {
    const events = this.loadEvents();
    const index = events.findIndex((e) => e.id === event.id);
    if (index >= 0) {
      events[index] = { ...event, updatedAt: new Date().toISOString() };
    } else {
      events.push({ ...event, createdAt: event.createdAt || new Date().toISOString() });
    }
    this.saveEvents(events);
    return events;
  }

  deleteEvent(id: string): CalendarEvent[] {
    const events = this.loadEvents();
    const filtered = events.filter((e) => e.id !== id);
    this.saveEvents(filtered);
    return filtered;
  }
}

export const calendarService = new CalendarStorageService();
