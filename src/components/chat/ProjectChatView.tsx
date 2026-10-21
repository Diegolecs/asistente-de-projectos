import React, { useState, useRef, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { ProjectMemoryDrawer } from './ProjectMemoryDrawer';
import { isProjectOSIntent } from '../../utils/intentDetection';

export const ProjectChatView: React.FC = () => {
  const {
    activeProject,
    sendProjectMessage,
    isAiThinking,
    setCurrentView,
  } = useProjectContext();

  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lastUserMsg = [...(activeProject?.messages || [])].reverse().find((m) => m.role === 'user');
  const isLastProjectRelated = (lastUserMsg && activeProject)
    ? isProjectOSIntent(lastUserMsg.content, [activeProject.name])
    : false;
  const thinkingLabel = isLastProjectRelated
    ? `Consultando ${activeProject?.name}...`
    : 'Pensando...';

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeProject?.messages, isAiThinking]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Ningún proyecto seleccionado</h2>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm">
            Selecciona un proyecto del menú lateral para conversar con su agente especializado o crea uno nuevo.
          </p>
        </div>
        <button
          onClick={() => setCurrentView('projects')}
          className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition"
        >
          Ver todos los proyectos
        </button>
      </div>
    );
  }

  const handleSendMessage = (text: string) => {
    sendProjectMessage(activeProject.id, text);
  };

  const projectSuggestions = [
    `¿Qué deberíamos hacer para avanzar: "${activeProject.nextStep || 'el próximo paso'}"?`,
    'Quiero discutir una decisión importante sobre la arquitectura.',
    'Tengo una nueva idea para añadir al proyecto.',
    'Ayúdame a desglosar las tareas inmediatas para esta semana.',
  ];

  const totalDecisions = activeProject.decisions?.length || 0;
  const pendingTasks = (activeProject.tasks || []).filter((t) => t.status === 'pendiente').length;

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 max-w-4xl mx-auto w-full relative">
      {/* Clean minimal top corner bar: project title left, Memoria access button top-right */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1 mb-1 border-b border-zinc-200/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <h2 className="text-xs font-bold text-zinc-900 truncate">
            {activeProject.name}
          </h2>
          <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">
            ({activeProject.category})
          </span>
        </div>

        {/* Esquina superior derecha: Acceso interactivo a Herramientas / Memoria */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="btn-open-project-tools"
            onClick={() => setIsMemoryOpen(true)}
            className="group relative inline-flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/90 hover:border-zinc-300 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer active:scale-[0.98]"
            title="Herramientas y memoria estructurada del proyecto"
          >
            <span className="w-5 h-5 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors shadow-2xs">
              <Layers className="w-3 h-3 text-blue-400 group-hover:text-white transition-colors" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">
                Herramientas
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                Memoria
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 transition-transform group-hover:translate-y-0.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-2 space-y-2 touch-pan-y overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {(!activeProject.messages || activeProject.messages.length === 0) && (
          <div className="text-center py-16 px-4 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-zinc-900 text-base">
              Conversación con {activeProject.name}
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Habla libremente como con un socio o consultor. La IA detectará decisiones clave, tareas y próximos pasos para guardarlos en la memoria del proyecto.
            </p>
          </div>
        )}

        {activeProject.messages?.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onViewMemory={() => setIsMemoryOpen(true)}
          />
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
      <div className="shrink-0 pt-2 pb-1">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isAiThinking}
          placeholder={`Habla libremente sobre ${activeProject.name}...`}
          suggestions={projectSuggestions}
        />
      </div>

      {/* Structured Memory Drawer */}
      <ProjectMemoryDrawer
        project={activeProject}
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
      />
    </div>
  );
};
