import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

export class NativeService {
  /**
   * Check if running natively inside Android or iOS
   */
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Returns current platform ('android' | 'ios' | 'web')
   */
  public getPlatform(): string {
    return Capacitor.getPlatform();
  }

  /**
   * Configure Android Status Bar for Project OS dark aesthetic
   */
  public async initAppChrome(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#090d16' });
    } catch (e) {
      console.warn('NativeService: Error setting status bar', e);
    }
  }

  /**
   * Take a photo directly from Android native camera
   */
  public async takeNativePhoto(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      return image.dataUrl || null;
    } catch (e: any) {
      // User cancelled or camera denied
      if (e?.message?.includes('User cancelled')) {
        return null;
      }
      console.warn('NativeService: Camera error', e);
      throw e;
    }
  }

  /**
   * Pick photo from device native gallery / files
   */
  public async pickNativePhoto(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });
      return image.dataUrl || null;
    } catch (e: any) {
      if (e?.message?.includes('User cancelled')) {
        return null;
      }
      console.warn('NativeService: Gallery error', e);
      throw e;
    }
  }

  /**
   * Trigger native haptic feedback (tactile vibration)
   */
  public async hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    if (!this.isNative()) return;
    try {
      let impactStyle = ImpactStyle.Light;
      if (style === 'medium') impactStyle = ImpactStyle.Medium;
      if (style === 'heavy') impactStyle = ImpactStyle.Heavy;
      await Haptics.impact({ style: impactStyle });
    } catch (e) {
      // Ignore if not supported on hardware
    }
  }

  /**
   * Request notification & alarm permissions
   */
  public async requestNotificationPermissions(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (e) {
      console.warn('NativeService: Notification permission error', e);
      return false;
    }
  }

  /**
   * Schedule a native notification / alarm for a task with date and time
   */
  public async scheduleTaskNotification(params: {
    id: number;
    title: string;
    body: string;
    scheduledAt: Date;
  }): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const hasPerm = await this.requestNotificationPermissions();
      if (!hasPerm) return false;

      // Don't schedule in past
      if (params.scheduledAt.getTime() <= Date.now()) {
        return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: params.id,
            title: `Project OS: ${params.title}`,
            body: params.body,
            schedule: { at: params.scheduledAt },
            sound: 'beep.wav',
            smallIcon: 'ic_launcher_round',
            iconColor: '#3b82f6',
          },
        ],
      });
      return true;
    } catch (e) {
      console.warn('NativeService: Error scheduling notification', e);
      return false;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelTaskNotification(notificationId: number): Promise<void> {
    if (!this.isNative()) return;
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
    } catch (e) {
      console.warn('NativeService: Error cancelling notification', e);
    }
  }
}

export const nativeService = new NativeService();
