import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Mic, MicOff, X, AlertCircle } from 'lucide-react';
import { audioService } from '../../services/audioService';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  placeholder?: string;
  suggestions?: string[];
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  placeholder = 'Escribe tu mensaje...',
  suggestions = [],
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [voiceLevels, setVoiceLevels] = useState<number[]>(() => new Array(16).fill(0.04));

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Real-time reactive audio level polling during voice recording
  useEffect(() => {
    if (isRecording) {
      const updateWaveform = () => {
        const levels = audioService.getReactiveAudioLevels(16);
        setVoiceLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      animFrameRef.current = requestAnimationFrame(updateWaveform);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setVoiceLevels(new Array(16).fill(0.04));
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isRecording]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Clean up timer and recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioService.isRecording()) {
        audioService.cancelRecording();
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading || isTranscribing) return;
    onSendMessage(input.trim());
    setInput('');
    setAudioError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSuggestionClick = (text: string) => {
    setAudioError(null);
    onSendMessage(text);
  };

  // Start voice recording
  const handleStartRecording = async () => {
    setAudioError(null);
    try {
      await audioService.startRecording();
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[Voice Input Error]:', err);
      setAudioError(err.message || 'No se pudo acceder al micrófono');
      setIsRecording(false);
    }
  };

  // Cancel voice recording
  const handleCancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioService.cancelRecording();
    setIsRecording(false);
    setRecordDuration(0);
  };

  // Stop recording and send audio for transcription & immediate execution
  const handleFinishAndSendVoice = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsTranscribing(true);
    setAudioError(null);

    try {
      const audioBlob = await audioService.stopRecording();
      const result = await audioService.transcribeAudio(audioBlob);

      if (result.text && result.text.trim()) {
        const transcribedText = result.text.trim();
        // Send directly to the conversation agent
        onSendMessage(transcribedText);
      } else if (result.error) {
        setAudioError(result.error);
      } else {
        setAudioError('No se reconoció voz clara en el audio grabado.');
      }
    } catch (err: any) {
      console.warn('[Transcription Notice]:', err?.message);
      setAudioError(err.message || 'Error al procesar la grabación de voz.');
    } finally {
      setIsTranscribing(false);
      setRecordDuration(0);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      {/* Contextual quick suggestion chips */}
      {suggestions.length > 0 && !isRecording && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 px-1 scrollbar-none">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 shrink-0 mr-1">
            <Sparkles className="w-3 h-3 text-blue-500" />
            Sugerencias:
          </span>
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              id={`chat-sug-${idx}`}
              onClick={() => handleSuggestionClick(sug)}
              disabled={isLoading || isTranscribing}
              className="text-xs shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 hover:text-zinc-950 transition-colors shadow-2xs disabled:opacity-50"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Error notification banner if any */}
      {audioError && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span>{audioError}</span>
          </div>
          <button
            onClick={() => setAudioError(null)}
            className="text-red-500 hover:text-red-800 p-0.5 rounded-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main input container */}
      <div className="relative flex items-center gap-2 bg-white rounded-2xl border border-zinc-200/90 shadow-xs focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-950/5 p-2 transition-all">
        {/* RECORDING IN PROGRESS VIEW */}
        {isRecording ? (
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-2.5 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200 rounded-xl shadow-xs animate-in fade-in duration-200">
            {/* Listening indicator & Waveform */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white shadow-sm">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <Mic className="w-4 h-4 relative z-10 animate-pulse" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-950 tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                    Estoy escuchando tu voz...
                  </span>
                  <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-blue-200/80 text-blue-900">
                    {formatSeconds(recordDuration)}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium truncate">
                  Habla con naturalidad, transcribiremos y ejecutaremos tu orden
                </span>
              </div>
            </div>

            {/* Voice-Reactive Dynamic Waveform (Reacts in real time to microphone amplitude) */}
            <div
              className="flex items-center gap-1 h-7 px-3 py-1 bg-white/90 rounded-lg border border-blue-200 shadow-2xs select-none"
              title="Ondas reactivas al nivel real de tu voz"
            >
              {voiceLevels.map((level, i) => {
                // Height scales from minimum 4px (silence / stillness) to 26px (speaking)
                const heightPx = Math.max(4, Math.round(4 + level * 22));
                const opacity = 0.35 + level * 0.65;

                return (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-400 transition-[height,opacity] duration-75 ease-out"
                    style={{
                      height: `${heightPx}px`,
                      opacity,
                    }}
                  />
                );
              })}
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                id="chat-cancel-voice-btn"
                onClick={handleCancelRecording}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-blue-700 hover:bg-blue-100/80 transition-colors flex items-center gap-1"
                title="Descartar audio"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>

              <button
                type="button"
                id="chat-send-voice-btn"
                onClick={handleFinishAndSendVoice}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                title="Terminar y enviar audio a Project OS"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Terminar y Enviar</span>
              </button>
            </div>
          </div>
        ) : isTranscribing ? (
          /* TRANSCRIBING STATE */
          <div className="flex-1 flex items-center gap-2.5 px-3 py-2 text-xs text-blue-700 bg-blue-50/70 border border-blue-200/80 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            <span className="font-medium">Transcribiendo tu mensaje con IA...</span>
          </div>
        ) : (
          /* REGULAR TEXTAREA INPUT */
          <>
            <textarea
              ref={textareaRef}
              id="chat-input-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // Ensure textarea is kept visible above virtual keyboard on Android/iOS
                setTimeout(() => {
                  textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }, 150);
              }}
              placeholder={placeholder}
              disabled={isLoading || isTranscribing}
              rows={1}
              className="flex-1 max-h-36 sm:max-h-44 resize-none bg-transparent px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden leading-relaxed"
            />

            {/* Voice Dictation / Recording Button */}
            <button
              type="button"
              id="chat-voice-record-btn"
              onClick={handleStartRecording}
              disabled={isLoading || isTranscribing}
              className="shrink-0 w-9 h-9 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-2xs group"
              title="Grabar mensaje de voz (Speech-to-Text)"
              aria-label="Grabar audio"
            >
              <Mic className="w-4 h-4 group-hover:scale-110 transition-transform text-zinc-600 group-hover:text-red-600" />
            </button>

            {/* Send Text Button */}
            <button
              id="chat-input-send-btn"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || isTranscribing}
              className="shrink-0 w-9 h-9 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-2xs"
              aria-label="Enviar mensaje"
              title="Enviar mensaje"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </>
        )}
      </div>

      <div className="hidden sm:flex items-center justify-between text-[11px] text-zinc-400 mt-1.5 px-1">
        <span>Usa el micrófono para hablarle directamente al agente de Project OS.</span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-[10px] text-zinc-600">Enter</kbd> para enviar
        </span>
      </div>
    </div>
  );
};
