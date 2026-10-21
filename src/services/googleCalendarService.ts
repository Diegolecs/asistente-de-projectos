import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { CalendarEvent } from '../types';
import { calculateEndTime } from './calendarService';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Provider with required Google Calendar scope
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token management per security requirements (never stored in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleCalendarSyncResult {
  syncedEvents: CalendarEvent[];
  stats: {
    imported: number;
    updated: number;
    uploaded: number;
  };
}

class GoogleCalendarService {
  /**
   * Listen to Firebase auth state changes. Call on app mount.
   */
  initAuth(
    onSuccess?: (user: User, token: string) => void,
    onFailure?: () => void
  ) {
    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user && cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    });
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  getAccessToken(): string | null {
    return cachedAccessToken;
  }

  isConnected(): boolean {
    return Boolean(auth.currentUser && cachedAccessToken);
  }

  /**
   * Sign in with Google with Calendar events scope
   */
  async signIn(): Promise<{ user: User; accessToken: string }> {
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error('No se obtuvo el token de acceso de Google Calendar.');
      }

      cachedAccessToken = token;
      return { user: result.user, accessToken: token };
    } catch (err: any) {
      console.error('[Google Calendar Sign-in Error]:', err);
      throw err;
    } finally {
      isSigningIn = false;
    }
  }

  /**
   * Disconnect and clear cached token
   */
  async disconnect(): Promise<void> {
    try {
      await signOut(auth);
    } finally {
      cachedAccessToken = null;
    }
  }

  /**
   * Reads existing events from user's primary Google Calendar
   */
  async fetchEvents(timeMin?: string): Promise<any[]> {
    if (!cachedAccessToken) {
      throw new Error('No hay sesión activa con Google Calendar.');
    }

    const minDate = timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', minDate);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        cachedAccessToken = null;
        throw new Error('La sesión de Google Calendar ha expirado. Por favor inicia sesión nuevamente.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Error ${res.status} al leer Google Calendar`);
    }

    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  }

  /**
   * Converts a Google Calendar event object into a Project OS CalendarEvent
   */
  parseGoogleEventToLocal(gEvent: any): CalendarEvent | null {
    if (!gEvent || gEvent.status === 'cancelled') return null;

    const id = `event-gcal-${gEvent.id}`;
    const title = gEvent.summary || '(Sin título)';
    const description = gEvent.description || '';
    const location = gEvent.location || undefined;

    let date = '';
    let startTime = '09:00';
    let endTime = '10:00';
    let durationMinutes = 60;

    if (gEvent.start?.dateTime) {
      const startDt = new Date(gEvent.start.dateTime);
      const endDt = gEvent.end?.dateTime ? new Date(gEvent.end.dateTime) : new Date(startDt.getTime() + 60 * 60 * 1000);

      const yr = startDt.getFullYear();
      const mo = String(startDt.getMonth() + 1).padStart(2, '0');
      const da = String(startDt.getDate()).padStart(2, '0');
      date = `${yr}-${mo}-${da}`;

      startTime = `${String(startDt.getHours()).padStart(2, '0')}:${String(startDt.getMinutes()).padStart(2, '0')}`;
      endTime = `${String(endDt.getHours()).padStart(2, '0')}:${String(endDt.getMinutes()).padStart(2, '0')}`;
      durationMinutes = Math.max(15, Math.round((endDt.getTime() - startDt.getTime()) / (60 * 1000)));
    } else if (gEvent.start?.date) {
      // All day event
      date = gEvent.start.date;
      startTime = '09:00';
      endTime = '10:00';
      durationMinutes = 60;
    } else {
      return null;
    }

    return {
      id,
      title,
      description: description || undefined,
      date,
      startTime,
      endTime,
      durationMinutes,
      location,
      status: 'confirmado',
      createdAt: gEvent.created || new Date().toISOString(),
      updatedAt: gEvent.updated || new Date().toISOString(),
      externalId: gEvent.id,
      provider: 'google',
      syncStatus: 'synced',
    };
  }

  /**
   * Creates an event in Google Calendar from a Project OS CalendarEvent
   */
  async createGoogleEvent(event: CalendarEvent): Promise<string> {
    if (!cachedAccessToken) {
      throw new Error('No hay sesión activa con Google Calendar.');
    }

    const calculatedEnd = event.endTime || calculateEndTime(event.startTime, event.durationMinutes || 60);

    // Format RFC3339 start and end strings based on local timezone
    const startIso = new Date(`${event.date}T${event.startTime}:00`).toISOString();
    const endIso = new Date(`${event.date}T${calculatedEnd}:00`).toISOString();

    const body: any = {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: startIso,
      },
      end: {
        dateTime: endIso,
      },
    };

    if (event.location) {
      body.location = event.location;
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Error al crear evento en Google Calendar');
    }

    const created = await res.json();
    return created.id;
  }

  /**
   * Updates an existing event in Google Calendar
   */
  async updateGoogleEvent(externalId: string, event: CalendarEvent): Promise<void> {
    if (!cachedAccessToken) {
      throw new Error('No hay sesión activa con Google Calendar.');
    }

    const calculatedEnd = event.endTime || calculateEndTime(event.startTime, event.durationMinutes || 60);
    const startIso = new Date(`${event.date}T${event.startTime}:00`).toISOString();
    const endIso = new Date(`${event.date}T${calculatedEnd}:00`).toISOString();

    const body: any = {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: startIso,
      },
      end: {
        dateTime: endIso,
      },
    };

    if (event.location) {
      body.location = event.location;
    }

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(externalId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Error al actualizar evento en Google Calendar');
    }
  }

  /**
   * Deletes an event in Google Calendar
   */
  async deleteGoogleEvent(externalId: string): Promise<void> {
    if (!cachedAccessToken) return;

    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(externalId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
        },
      });

      if (!res.ok && res.status !== 404 && res.status !== 410) {
        console.warn(`[GCal Delete] Notice status: ${res.status}`);
      }
    } catch (e) {
      console.warn('[GCal Delete Error]:', e);
    }
  }

  /**
   * Full bidirectional synchronization:
   * 1. Reads existing events from Google Calendar.
   * 2. Imports new GCal events into Project OS without duplicates.
   * 3. Updates Project OS events that were edited in GCal.
   * 4. Uploads Project OS events (local_only) to GCal and links their externalId.
   */
  async syncBidirectional(localEvents: CalendarEvent[]): Promise<GoogleCalendarSyncResult> {
    if (!this.isConnected()) {
      throw new Error('Conecta tu cuenta de Google Calendar para sincronizar.');
    }

    const gEvents = await this.fetchEvents();
    const updatedEvents = [...localEvents];
    let imported = 0;
    let updated = 0;
    let uploaded = 0;

    // 1. Process Google Calendar events into local list
    for (const gEvent of gEvents) {
      if (gEvent.status === 'cancelled') {
        // If event was cancelled in GCal, remove from local if present
        const idx = updatedEvents.findIndex((e) => e.externalId === gEvent.id);
        if (idx >= 0) {
          updatedEvents.splice(idx, 1);
        }
        continue;
      }

      const parsed = this.parseGoogleEventToLocal(gEvent);
      if (!parsed) continue;

      const existingIndex = updatedEvents.findIndex(
        (e) => e.externalId === gEvent.id || (e.id === parsed.id)
      );

      if (existingIndex >= 0) {
        // Update local event properties from Google Calendar source
        const current = updatedEvents[existingIndex];
        updatedEvents[existingIndex] = {
          ...current,
          title: parsed.title,
          description: parsed.description ?? current.description,
          location: parsed.location ?? current.location,
          date: parsed.date,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          durationMinutes: parsed.durationMinutes,
          syncStatus: 'synced',
          updatedAt: new Date().toISOString(),
        };
        updated++;
      } else {
        // Add as new imported event
        updatedEvents.push(parsed);
        imported++;
      }
    }

    // 2. Upload local-only events to Google Calendar
    for (let i = 0; i < updatedEvents.length; i++) {
      const evt = updatedEvents[i];
      if (!evt.externalId && evt.status !== 'cancelado') {
        try {
          const gId = await this.createGoogleEvent(evt);
          updatedEvents[i] = {
            ...evt,
            externalId: gId,
            provider: 'google',
            syncStatus: 'synced',
            updatedAt: new Date().toISOString(),
          };
          uploaded++;
        } catch (uploadErr) {
          console.warn('[Sync Upload Notice]:', evt.title, uploadErr);
        }
      }
    }

    return {
      syncedEvents: updatedEvents,
      stats: { imported, updated, uploaded },
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();
