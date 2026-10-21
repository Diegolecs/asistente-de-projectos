import React, { useState, useEffect } from 'react';
import {
  Bot,
  User,
  CheckCircle2,
  Lightbulb,
  Scale,
  Target,
  ArrowRight,
  AlertTriangle,
  BrainCircuit,
  Volume2,
  VolumeX,
  Loader2,
  Square,
} from 'lucide-react';
import { ChatMessage, ChatMemoryItem } from '../../types';
import { audioService } from '../../services/audioService';

interface ChatMessageItemProps {
  message: ChatMessage;
  onViewMemory?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, onViewMemory }) => {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Subscribe to audioService playback updates to keep playback state synchronized
  useEffect(() => {
    const unsubscribe = audioService.subscribePlayback((playingId) => {
      setIsPlaying(playingId === message.id);
      if (playingId !== message.id) {
        setIsLoadingAudio(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [message.id]);

  const handleToggleVoice = async () => {
    if (isPlaying) {
      audioService.stopPlayback();
      setIsPlaying(false);
      setIsLoadingAudio(false);
      return;
    }

    setIsLoadingAudio(true);

    try {
      await audioService.playTts(message.id, message.content, {
        onStart: () => {
          setIsLoadingAudio(false);
          setIsPlaying(true);
        },
        onEnd: () => {
          setIsLoadingAudio(false);
          setIsPlaying(false);
        },
        onError: (err) => {
          console.warn('[Audio Playback Error]:', err);
          setIsLoadingAudio(false);
          setIsPlaying(false);
        },
      });
    } catch (err) {
      console.warn('[Audio Playback Exception]:', err);
      setIsLoadingAudio(false);
      setIsPlaying(false);
    }
  };

  // Helper to render simple markdown formatting (bold, lists, code)
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, lineIdx) => {
      // Bullet list items
      if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.replace(/^[•\-\*]\s+/, '');
        return (
          <li key={lineIdx} className="ml-4 list-disc text-sm my-0.5 leading-relaxed">
            {renderInlineMarkdown(itemText)}
          </li>
        );
      }

      // Numbered list items
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        return (
          <li key={lineIdx} className="ml-4 list-decimal text-sm my-0.5 leading-relaxed">
            {renderInlineMarkdown(numberedMatch[2])}
          </li>
        );
      }

      // Empty lines
      if (!line.trim()) {
        return <div key={lineIdx} className="h-2" />;
      }

      // Regular paragraph
      return (
        <p key={lineIdx} className="text-sm leading-relaxed my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Inline markdown parser (bold, italic, code)
  const renderInlineMarkdown = (text: string) => {
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold **text**
      const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/);
      if (boldMatch) {
        if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
        parts.push(
          <strong key={key++} className="font-semibold text-zinc-950">
            {boldMatch[2]}
          </strong>
        );
        remaining = boldMatch[3];
        continue;
      }

      // Inline code `code`
      const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/);
      if (codeMatch) {
        if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
        parts.push(
          <code
            key={key++}
            className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 font-mono text-xs text-zinc-800"
          >
            {codeMatch[2]}
          </code>
        );
        remaining = codeMatch[3];
        continue;
      }

      // Italics *text*
      const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/);
      if (italicMatch) {
        if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
        parts.push(
          <em key={key++} className="italic text-zinc-800">
            {italicMatch[2]}
          </em>
        );
        remaining = italicMatch[3];
        continue;
      }

      // Remaining plain text
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    return parts;
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start group`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
          isUser
            ? 'bg-zinc-900 text-white'
            : 'bg-blue-600 text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-2xs ${
            isUser
              ? 'bg-zinc-950 text-white rounded-tr-xs'
              : 'bg-white border border-zinc-200/90 text-zinc-900 rounded-tl-xs'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</p>
          ) : (
            <div className="space-y-0.5">{renderFormattedContent(message.content)}</div>
          )}
        </div>

        {/* Embedded Memory Updates card (if any were detected by the agent) */}
        {!isUser && message.memoryUpdates && message.memoryUpdates.length > 0 && (
          <div className="mt-2.5 w-full bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/60 mb-2">
              <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                <BrainCircuit className="w-3.5 h-3.5 text-blue-600" />
                <span>Memoria del Proyecto sincronizada</span>
              </div>
              {onViewMemory && (
                <button
                  onClick={onViewMemory}
                  className="text-blue-700 hover:text-blue-900 font-medium hover:underline flex items-center gap-1"
                >
                  <span>Ver memoria</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {message.memoryUpdates.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-blue-100">
                  <span className="shrink-0 mt-0.5">
                    {item.type === 'decision' && <Scale className="w-3.5 h-3.5 text-amber-600" />}
                    {item.type === 'task' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {item.type === 'idea' && <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />}
                    {item.type === 'next_step' && <Target className="w-3.5 h-3.5 text-blue-600" />}
                    {item.type === 'problem' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-zinc-900 block truncate">
                      {item.title}
                    </span>
                    {item.description && (
                      <span className="text-zinc-500 text-[11px] block line-clamp-1">
                        {item.description}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0">
                    {item.type === 'decision' ? 'Decisión' : item.type === 'task' ? 'Tarea' : item.type === 'next_step' ? 'Próximo Paso' : 'Idea'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: Timestamp and Voice playback action */}
        <div className="flex items-center gap-2.5 mt-1 px-1">
          <span className="text-[10px] text-zinc-400">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Voice listen button for Assistant responses */}
          {!isUser && (
            <button
              onClick={handleToggleVoice}
              disabled={isLoadingAudio}
              className={`text-[11px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full transition-all border ${
                isPlaying
                  ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                  : isLoadingAudio
                  ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-900 bg-white hover:bg-zinc-100 border-zinc-200/80 shadow-2xs'
              }`}
              title={isPlaying ? 'Detener voz' : 'Escuchar respuesta de voz'}
              aria-label={isPlaying ? 'Detener reproducción de voz' : 'Escuchar respuesta en voz alta'}
            >
              {isLoadingAudio ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                  <span>Cargando...</span>
                </>
              ) : isPlaying ? (
                <>
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Detener</span>
                  {/* Subtle playing wave */}
                  <span className="flex items-center gap-0.5 ml-0.5">
                    <span className="w-0.5 h-2 bg-white rounded-full animate-[pulse_0.5s_infinite]"></span>
                    <span className="w-0.5 h-3 bg-white rounded-full animate-[pulse_0.7s_infinite]"></span>
                    <span className="w-0.5 h-1.5 bg-white rounded-full animate-[pulse_0.4s_infinite]"></span>
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3" />
                  <span>Escuchar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
