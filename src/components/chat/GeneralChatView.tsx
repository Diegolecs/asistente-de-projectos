import React, { useRef, useEffect } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { isProjectOSIntent } from '../../utils/intentDetection';

export const GeneralChatView: React.FC = () => {
  const {
    generalMessages,
    sendGeneralMessage,
    isAiThinking,
    clearGeneralChat,
    projects,
  } = useProjectContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lastUserMsg = [...generalMessages].reverse().find((m) => m.role === 'user');
  const isLastProjectRelated = lastUserMsg
    ? isProjectOSIntent(lastUserMsg.content, projects.map((p) => p.name))
    : false;
  const thinkingLabel = isLastProjectRelated
    ? 'Consultando portfolio y proyectos...'
    : 'Pensando...';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [generalMessages, isAiThinking]);

  const generalSuggestions = [
    '¿Qué proyecto debería priorizar hoy según sus próximos pasos?',
    'Dame un resumen ejecutivo del estado de todos mis proyectos.',
    '¿En qué proyecto tengo mayores riesgos o cuellos de botella?',
    'Ayúdame a balancear el esfuerzo entre mis proyectos activos.',
  ];

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 max-w-4xl mx-auto w-full relative">
      {/* Messages Scroll Area - Begins immediately with the conversation */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-2 space-y-2.5 touch-pan-y overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {generalMessages.length > 0 && (
          <div className="flex justify-center pt-0.5 pb-2">
            <button
              onClick={clearGeneralChat}
              className="text-[11px] text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5"
              title="Reiniciar conversación"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar conversación</span>
            </button>
          </div>
        )}

        {generalMessages.length === 0 && (
          <div className="text-center py-12 sm:py-16 px-4 max-w-md mx-auto space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100/60 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                Chat Principal con tu Agente
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Pregúntame sobre prioridades, estado de proyectos, crea tareas o solicita un análisis estratégico de tu portfolio.
              </p>
            </div>
          </div>
        )}

        {generalMessages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}

        {/* Thinking Indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-3 my-4 max-w-3xl mx-auto w-full">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-2.5 text-xs text-zinc-500 flex items-center gap-2 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>{thinkingLabel}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Chat Input */}
      <div className="shrink-0 pt-2 pb-0 sm:pb-1">
        <ChatInput
          onSendMessage={sendGeneralMessage}
          isLoading={isAiThinking}
          placeholder="Pregunta o reflexiona sobre tus proyectos, prioridades y foco..."
          suggestions={generalSuggestions}
        />
      </div>
    </div>
  );
};
