/**
 * Audio Service for Project OS
 * Handles voice recording with MediaRecorder, transcription via Gemini,
 * and text-to-speech playback with msedge-tts backend.
 */

// Supported MIME types for MediaRecorder across Chrome, Safari, Firefox, Edge
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
  ];

  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return ''; // fallback to browser default
}

export interface AudioPlaybackCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private isCurrentlyRecording = false;

  // Real-time speech recognition assist for whisper detection
  private recognitionInstance: any = null;
  private recognitionTranscript = '';
  private recognitionError: string | null = null;

  // Real-time Audio Analysis for reactive microphone waveform
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private frequencyDataArray: Uint8Array<ArrayBuffer> | null = null;

  // TTS Playback state
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentPlayingId: string | null = null;
  private currentBlobUrl: string | null = null;
  private currentCallbacks: AudioPlaybackCallbacks | null = null;
  private listeners: Set<(playingId: string | null) => void> = new Set();

  /**
   * Subscribe to global playback state changes
   */
  subscribePlayback(listener: (playingId: string | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentPlayingId);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyPlaybackChange(): void {
    this.listeners.forEach((listener) => listener(this.currentPlayingId));
  }

  public getPlayingId(): string | null {
    return this.currentPlayingId;
  }

  /**
   * Check if microphone recording is supported by current browser
   */
  public isRecordingSupported(): boolean {
    return typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined');
  }

  /**
   * Start recording microphone audio
   */
  public async startRecording(): Promise<void> {
    if (this.isCurrentlyRecording) {
      this.cancelRecording();
    }

    if (!this.isRecordingSupported()) {
      throw new Error('La grabación de audio no está soportada en este navegador.');
    }

    try {
      this.audioChunks = [];
      // Configure audio capture for high sensitivity: avoid aggressive noise cancellation
      // that suppresses soft whispers, and enable autoGainControl to boost quiet voices
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Prevents whispers from being swallowed as noise
          autoGainControl: true,   // Dynamically boosts soft whispers and murmurs
        },
      });

      this.mediaStream = stream;

      // Start parallel Web Speech Recognition for instant, high-precision whisper capture
      this.recognitionTranscript = '';
      this.recognitionError = null;
      try {
        const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechClass) {
          const rec = new SpeechClass();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'es-419';
          rec.onresult = (evt: any) => {
            let fullText = '';
            for (let i = 0; i < evt.results.length; i++) {
              if (evt.results[i][0]?.transcript) {
                fullText += evt.results[i][0].transcript + ' ';
              }
            }
            if (fullText.trim()) {
              this.recognitionTranscript = fullText.trim();
            }
          };
          rec.onerror = (evt: any) => {
            console.warn('[AudioService] SpeechRecognition error notice:', evt?.error || evt);
            this.recognitionError = String(evt?.error || 'speech_recognition_error');
          };
          rec.start();
          this.recognitionInstance = rec;
        }
      } catch (speechErr: any) {
        console.info('[AudioService] Native SpeechRecognition not active:', speechErr);
        this.recognitionError = speechErr?.message || 'not_supported';
      }

      // Initialize real-time Web Audio API analyzer for reactive voice feedback
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioContext = new AudioCtxClass();
          this.analyserNode = this.audioContext.createAnalyser();
          this.analyserNode.fftSize = 64; // 32 frequency bins
          this.analyserNode.smoothingTimeConstant = 0.3;
          this.analyserNode.minDecibels = -90;
          this.analyserNode.maxDecibels = -5;
          this.sourceNode = this.audioContext.createMediaStreamSource(stream);
          this.sourceNode.connect(this.analyserNode);
          this.frequencyDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        }
      } catch (audioCtxErr) {
        console.warn('[AudioService] AudioContext Analyser initialization notice:', audioCtxErr);
      }

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // Slice every 250ms for reliable chunks
      this.isCurrentlyRecording = true;
    } catch (err: any) {
      this.cleanupStream();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Permiso de micrófono denegado. Permite el acceso al micrófono en los ajustes de tu navegador.');
      }
      throw new Error(`Error al iniciar la grabación de audio: ${err.message || err}`);
    }
  }

  /**
   * Returns real-time reactive volume/frequency levels for a given number of waveform bars.
   * Normalized between 0.0 (silence) and 1.0 (loud speech).
   * Highly sensitive to whispers and murmurs.
   */
  public getReactiveAudioLevels(barsCount = 16): number[] {
    if (!this.analyserNode || !this.frequencyDataArray || !this.isCurrentlyRecording) {
      return new Array(barsCount).fill(0.04);
    }

    try {
      this.analyserNode.getByteFrequencyData(this.frequencyDataArray);

      const binCount = this.analyserNode.frequencyBinCount;
      const step = Math.max(1, Math.floor(binCount / barsCount));
      const levels: number[] = [];

      for (let i = 0; i < barsCount; i++) {
        const binIdx = Math.min(i * step, binCount - 1);
        const rawVal = this.frequencyDataArray[binIdx] || 0;

        // Lower threshold to 4 so whispers visibly animate the waveform
        if (rawVal < 4) {
          levels.push(0.03); // Quiet / silence
        } else {
          // Normalize active human voice amplitude smoothly
          const normalized = Math.min(1.0, Math.max(0.08, (rawVal - 4) / 160));
          levels.push(normalized);
        }
      }

      return levels;
    } catch {
      return new Array(barsCount).fill(0.04);
    }
  }

  /**
   * Stop recording and return the recorded audio Blob
   */
  public stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isCurrentlyRecording) {
        this.cleanupStream();
        return reject(new Error('No hay una grabación de audio activa.'));
      }

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.cleanupStream();
          this.isCurrentlyRecording = false;
          resolve(audioBlob);
        } catch (err) {
          this.cleanupStream();
          this.isCurrentlyRecording = false;
          reject(err);
        }
      };

      this.mediaRecorder.onerror = (e: any) => {
        this.cleanupStream();
        this.isCurrentlyRecording = false;
        reject(e.error || new Error('Error durante la grabación de audio.'));
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.cleanupStream();
        this.isCurrentlyRecording = false;
        reject(err);
      }
    });
  }

  /**
   * Cancel and discard current recording
   */
  public cancelRecording(): void {
    if (this.mediaRecorder && this.isCurrentlyRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (_) {
        // ignore
      }
    }
    this.cleanupStream();
    this.audioChunks = [];
    this.isCurrentlyRecording = false;
  }

  public isRecording(): boolean {
    return this.isCurrentlyRecording;
  }

  private cleanupStream(): void {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch (_) {}
      this.recognitionInstance = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch (_) {}
      this.analyserNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
    this.frequencyDataArray = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
  }

  /**
   * Convert Blob to Base64 string
   */
  public async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // strip data URL prefix (e.g. "data:audio/webm;base64,")
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Send audio Blob to backend or client provider for transcription
   */
  public async transcribeAudio(blob: Blob): Promise<{ text: string; error?: string; isSilence?: boolean }> {
    const tStart = performance.now();
    const audioBase64 = await this.blobToBase64(blob);
    const tPrep = performance.now();
    const prepMs = Math.round(tPrep - tStart);

    const mimeType = blob.type || 'audio/webm';
    const localHint = this.recognitionTranscript.trim();

    // Fast-path: Check if local SpeechRecognition captured a complete, usable phrase (>= 3 words)
    const isUsableClientHint = Boolean(localHint && localHint.split(/\s+/).length >= 3);

    // Single primary server endpoint (/api/transcribe-audio or VITE_API_BASE_URL)
    const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string) || '';
    const endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/transcribe-audio` : '/api/transcribe-audio';

    const tNetworkStart = performance.now();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          clientHint: localHint,
        }),
      });

      const tNetworkEnd = performance.now();
      const networkMs = Math.round(tNetworkEnd - tNetworkStart);
      const totalMs = Math.round(tNetworkEnd - tStart);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const serverMs = data.metrics?.totalServerMs || 'N/A';
        const modelUsed = data.metrics?.modelUsed || 'unknown';

        // Safe diagnostic latency metrics logging (NO private text or audio logged)
        console.log(`[Audio Timings] Prep: ${prepMs}ms | Network+Server: ${networkMs}ms (Server Transcribe: ${serverMs}ms, Model: ${modelUsed}) | Overall Total: ${totalMs}ms`);

        let text = typeof data.text === 'string' ? data.text.trim() : '';
        if (!text && localHint) {
          text = localHint;
        }
        if (data.isSilence || (!text && data.message)) {
          return { text: '', isSilence: true, error: data.message || 'No se detectó voz clara en el audio.' };
        }
        return { text };
      } else {
        console.warn(`[AudioService] Server transcribe error status: ${response.status} (${networkMs}ms)`);
      }
    } catch (fetchErr) {
      console.warn('[AudioService] Server transcribe endpoint unreachable or network error:', fetchErr);
    }

    // Controlled Recovery Flow: Use local SpeechRecognition if server was unreachable or failed
    if (isUsableClientHint || localHint) {
      console.log('[AudioService] Recovered using local SpeechRecognition hint.');
      return { text: localHint };
    }

    // Contextual diagnostic errors when recovery fails
    if (this.recognitionError) {
      if (this.recognitionError === 'not-allowed' || this.recognitionError === 'service-not-allowed') {
        return {
          text: '',
          error: 'Servicio de voz no disponible en este navegador. Configura VITE_API_BASE_URL o habilita los permisos de micrófono.'
        };
      }
      if (this.recognitionError === 'network') {
        return {
          text: '',
          error: 'Error de red al procesar el reconocimiento de voz. Comprueba tu conexión a internet.'
        };
      }
      if (this.recognitionError === 'no-speech') {
        return {
          text: '',
          isSilence: true,
          error: 'No se detectó habla en el audio grabado. Por favor, habla de nuevo.'
        };
      }
    }

    const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
    if (isNative) {
      return {
        text: '',
        error: 'No se pudo conectar al servidor de transcripción en Android. Configura VITE_API_BASE_URL en la aplicación.'
      };
    }

    return {
      text: '',
      isSilence: true,
      error: 'No se reconoció voz clara en el audio grabado.'
    };
  }

  /**
   * Stop current voice synthesis playback
   */
  public stopPlayback(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement = null;
    }

    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    // Cancel browser speech synthesis if active
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.currentCallbacks?.onEnd) {
      this.currentCallbacks.onEnd();
    }

    this.currentPlayingId = null;
    this.currentCallbacks = null;
    this.notifyPlaybackChange();
  }

  /**
   * Play Text-To-Speech for a message using msedge-tts backend (with browser speech fallback)
   */
  public async playTts(
    id: string,
    text: string,
    callbacks?: AudioPlaybackCallbacks
  ): Promise<void> {
    // If currently playing this specific message, toggle stop
    if (this.currentPlayingId === id) {
      this.stopPlayback();
      return;
    }

    // Stop previous audio playback first
    this.stopPlayback();

    this.currentPlayingId = id;
    this.currentCallbacks = callbacks || null;
    this.notifyPlaybackChange();

    try {
      // 1. Attempt server msedge-tts endpoint
      const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string || '').replace(/\/$/, '');
      const ttsUrl = baseUrl ? `${baseUrl}/api/tts` : '/api/tts';

      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: 'es-MX-JorgeNeural',
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS server respondió con código ${response.status}`);
      }

      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      this.currentBlobUrl = blobUrl;

      const audio = new Audio(blobUrl);
      this.currentAudioElement = audio;

      audio.onplay = () => {
        callbacks?.onStart?.();
      };

      audio.onended = () => {
        this.stopPlayback();
      };

      audio.onerror = (e) => {
        console.warn('[AudioService] Error reproduciendo audio buffer, activando fallback local:', e);
        this.fallbackSpeechSynthesis(text, callbacks);
      };

      await audio.play();
    } catch (err: any) {
      console.warn('[AudioService] Server TTS falló, recurriendo a Web Speech API:', err?.message);
      this.fallbackSpeechSynthesis(text, callbacks);
    }
  }

  /**
   * Client-side fallback using window.speechSynthesis
   */
  private fallbackSpeechSynthesis(text: string, callbacks?: AudioPlaybackCallbacks): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      const err = new Error('Síntesis de voz no disponible.');
      callbacks?.onError?.(err);
      this.stopPlayback();
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown before speaking
    const clean = text
      .replace(/[*_#`[\]()]/g, '')
      .replace(/•|-/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-MX';
    utterance.rate = 1.05;

    // Pick best Spanish voice if available
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find((v) => v.lang.startsWith('es-MX') || v.lang.startsWith('es-ES') || v.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      this.stopPlayback();
    };

    utterance.onerror = (e) => {
      callbacks?.onError?.(new Error(e.error || 'Error en síntesis'));
      this.stopPlayback();
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const audioService = new AudioService();
