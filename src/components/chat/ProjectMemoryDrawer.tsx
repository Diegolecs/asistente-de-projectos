import React, { useState } from 'react';
import {
  X,
  Target,
  CheckCircle2,
  Circle,
  Scale,
  Lightbulb,
  Flag,
  Clock,
  Plus,
  Edit2,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Project } from '../../types';
import { useProjectContext } from '../../context/ProjectContext';
import { getStatusBadgeClass, getCategoryBadgeClass, formatDateSpanish } from '../../utils/formatters';

interface ProjectMemoryDrawerProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'all' | 'tasks' | 'decisions' | 'ideas' | 'milestones';

export const ProjectMemoryDrawer: React.FC<ProjectMemoryDrawerProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const { toggleTask, addTask, updateProject } = useProjectContext();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(project.mainGoal);
  const [isEditingNextStep, setIsEditingNextStep] = useState(false);
  const [nextStepInput, setNextStepInput] = useState(project.nextStep);

  if (!isOpen) return null;

  const handleSaveGoal = () => {
    updateProject(project.id, { mainGoal: goalInput.trim() });
    setIsEditingGoal(false);
  };

  const handleSaveNextStep = () => {
    updateProject(project.id, { nextStep: nextStepInput.trim() });
    setIsEditingNextStep(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    addTask(project.id, { title: newTaskInput.trim() });
    setNewTaskInput('');
  };

  const pendingTasks = (project.tasks || []).filter((t) => t.status === 'pendiente');
  const completedTasks = (project.tasks || []).filter((t) => t.status === 'completado');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-zinc-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200/90 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-zinc-900 text-sm truncate leading-tight">
                Memoria: {project.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${getStatusBadgeClass(project.status)}`}>
                  {project.status}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${getCategoryBadgeClass(project.category)}`}>
                  {project.category}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200/60 transition"
              aria-label="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-200 px-4 bg-white text-xs font-medium overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'border-zinc-950 text-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Resumen General
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'border-zinc-950 text-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span>Tareas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-700">
              {pendingTasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'decisions'
                ? 'border-zinc-950 text-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span>Decisiones</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-700">
              {project.decisions?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'ideas'
                ? 'border-zinc-950 text-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Ideas ({project.ideas?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'milestones'
                ? 'border-zinc-950 text-zinc-950 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Hitos ({project.milestones?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Quick Pillars: Goal & Next Step (Always visible in Summary or full) */}
          {(activeTab === 'all' || activeTab === 'tasks') && (
            <div className="space-y-3">
              {/* Goal Card */}
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-600" />
                    Objetivo Principal
                  </span>
                  {!isEditingGoal && (
                    <button
                      onClick={() => setIsEditingGoal(true)}
                      className="text-zinc-400 hover:text-zinc-700 p-1"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {isEditingGoal ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 bg-white"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setIsEditingGoal(false)}
                        className="px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveGoal}
                        className="px-2.5 py-1 text-xs bg-zinc-900 text-white rounded-md flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-800 leading-relaxed font-medium">
                    {project.mainGoal || 'Sin objetivo principal definido.'}
                  </p>
                )}
              </div>

              {/* Next Step Card */}
              <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-1">
                  <span className="flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                    Próximo Paso Inmediato
                  </span>
                  {!isEditingNextStep && (
                    <button
                      onClick={() => setIsEditingNextStep(true)}
                      className="text-blue-500 hover:text-blue-800 p-1"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {isEditingNextStep ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={nextStepInput}
                      onChange={(e) => setNextStepInput(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 rounded-lg border border-blue-300 focus:outline-hidden focus:ring-1 focus:ring-blue-600 bg-white"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setIsEditingNextStep(false)}
                        className="px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveNextStep}
                        className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-md flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-blue-950 leading-relaxed font-semibold">
                    {project.nextStep || 'Sin próximo paso definido.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Task Add */}
          {(activeTab === 'all' || activeTab === 'tasks') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tareas ({pendingTasks.length} pendientes)
                </h3>
              </div>

              <form onSubmit={handleAddTask} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Agregar tarea rápida..."
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-zinc-200 focus:outline-hidden focus:border-zinc-400 bg-zinc-50/50"
                />
                <button
                  type="submit"
                  disabled={!newTaskInput.trim()}
                  className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {pendingTasks.length === 0 && completedTasks.length === 0 && (
                  <p className="text-xs text-zinc-400 italic py-2">No hay tareas registradas aún.</p>
                )}
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(project.id, task.id)}
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-50 cursor-pointer border border-transparent hover:border-zinc-200 group transition"
                  >
                    <Circle className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-zinc-800 font-medium leading-tight">
                      {task.title}
                    </span>
                  </div>
                ))}
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(project.id, task.id)}
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-50 cursor-pointer opacity-50 transition"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs text-zinc-500 line-through leading-tight">
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decisions Section */}
          {(activeTab === 'all' || activeTab === 'decisions') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  Decisiones Clave ({project.decisions?.length || 0})
                </h3>
              </div>

              <div className="space-y-2">
                {(!project.decisions || project.decisions.length === 0) ? (
                  <p className="text-xs text-zinc-400 italic py-2">No hay decisiones registradas aún.</p>
                ) : (
                  project.decisions.map((dec) => (
                    <div
                      key={dec.id}
                      className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-950">{dec.title}</span>
                        <span className="text-[10px] text-amber-800 font-mono">
                          {formatDateSpanish(dec.date)}
                        </span>
                      </div>
                      {dec.description && (
                        <p className="text-zinc-600 text-[11px] leading-relaxed">
                          {dec.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Ideas Section */}
          {(activeTab === 'all' || activeTab === 'ideas') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                  Ideas ({project.ideas?.length || 0})
                </h3>
              </div>

              <div className="space-y-2">
                {(!project.ideas || project.ideas.length === 0) ? (
                  <p className="text-xs text-zinc-400 italic py-2">No hay ideas guardadas aún.</p>
                ) : (
                  project.ideas.map((idea) => (
                    <div
                      key={idea.id}
                      className="bg-yellow-50/50 border border-yellow-200/70 rounded-xl p-3 text-xs space-y-1"
                    >
                      <span className="font-semibold text-zinc-950 block">{idea.title}</span>
                      {idea.description && (
                        <p className="text-zinc-600 text-[11px] leading-relaxed">
                          {idea.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Milestones Section */}
          {(activeTab === 'all' || activeTab === 'milestones') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-blue-600" />
                  Hitos ({project.milestones?.length || 0})
                </h3>
              </div>

              <div className="space-y-2">
                {(!project.milestones || project.milestones.length === 0) ? (
                  <p className="text-xs text-zinc-400 italic py-2">No hay hitos programados.</p>
                ) : (
                  project.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 text-xs flex items-start gap-2.5"
                    >
                      <Flag className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-900">{m.title}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {formatDateSpanish(m.date)}
                          </span>
                        </div>
                        {m.description && (
                          <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
