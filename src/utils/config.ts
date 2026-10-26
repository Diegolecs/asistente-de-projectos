/**
 * Configuration & API endpoint resolution for Project OS
 * Handles production Cloud Run backend fallback when running inside native Android/iOS Capacitor webviews
 */

export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env?.VITE_API_BASE_URL as string || '').replace(/\/$/, '');
  if (envUrl) return envUrl;

  // When running inside Capacitor Native Android or iOS app, window.location is 'https://localhost'.
  // Relative paths like '/api/chat' would attempt 'https://localhost/api/chat' which fails.
  // Fall back to the deployed production Cloud Run backend URL.
  if (typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.())) {
    return 'https://asistente-de-projectos-git-463126159599.europe-west1.run.app';
  }

  return '';
}
