import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Edit2,
  Flag,
  Lightbulb,
  PauseCircle,
  PlayCircle,
  Plus,
  Scale,
  Trash2,
  Activity as ActivityIcon,
  ChevronRight,
  Target,
  Sparkles,
  Save,
  X,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import {
  getStatusBadgeClass,
  getCategoryBadgeClass,
  formatRelativeTime,
  formatDateSpanish,
} from '../../utils/formatters';
import { ItemModal, ItemType } from '../modals/ItemModal';
import { Milestone, Decision, Idea, Task } from '../../types';

interface ProjectDetailViewProps {
  onEditProject: () => void;
}

type TabType = 'tasks' | 'milestones' | 'decisions' | 'ideas' | 'activity';

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ onEditProject }) => {
  const {
    activeProject,
    setCurrentView,
    togglePauseProject,
    deleteProject,
    updateProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addDecision,
    updateDecision,
    deleteDecision,
    addIdea,
    updateIdea,
    deleteIdea,
    addTask,
    toggleTask,
    updateTask,
    deleteTask,
  } = useProjectContext();

  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [modalType, setModalType] = useState<ItemType | null>(null);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    title: string;
    description?: string;
    date?: string;
  } | null>(null);

  // Quick next-step inline editor
  const [isEditingNextStep, setIsEditingNextStep] = useState(false);
  const [nextStepInput, setNextStepInput] = useState('');

  // Quick task input inline
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Task filter (all vs pending vs completed)
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Delete project confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!activeProject) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-zinc-600">No se ha seleccionado ningún proyecto.</p>
        <button
          onClick={() => setCurrentView('projects')}
          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold"
        >
          Volver a Proyectos
        </button>
      </div>
    );
  }

  const statusStyle = getStatusBadgeClass(activeProject.status);
  const categoryStyle = getCategoryBadgeClass(activeProject.category);
  const isPaused = activeProject.status === 'Pausado';

  const completedTasksCount =
    activeProject.tasks?.filter((t) => t.status === 'completado').length || 0;
  const pendingTasksCount =
    activeProject.tasks?.filter((t) => t.status === 'pendiente').length || 0;

  const handleSaveNextStep = () => {
    updateProject(activeProject.id, { nextStep: nextStepInput });
    setIsEditingNextStep(false);
  };

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    addTask(activeProject.id, { title: quickTaskTitle.trim() });
    setQuickTaskTitle('');
  };

  const handleModalSubmit = (data: { title: string; description: string; date?: string }) => {
    if (!modalType) return;

    if (modalType === 'milestone') {
      if (editingItem) {
        updateMilestone(activeProject.id, editingItem.id, {
          title: data.title,
          description: data.description,
          date: data.date || '',
        });
      } else {
        addMilestone(activeProject.id, {
          title: data.title,
          description: data.description,
          date: data.date || new Date().toISOString().split('T')[0],
        });
      }
    } else if (modalType === 'decision') {
      if (editingItem) {
        updateDecision(activeProject.id, editingItem.id, {
          title: data.title,
          description: data.description,
          date: data.date || '',
        });
      } else {
        addDecision(activeProject.id, {
          title: data.title,
          description: data.description,
          date: data.date || new Date().toISOString().split('T')[0],
        });
      }
    } else if (modalType === 'idea') {
      if (editingItem) {
        updateIdea(activeProject.id, editingItem.id, {
          title: data.title,
          description: data.description,
          date: data.date || '',
        });
      } else {
        addIdea(activeProject.id, {
          title: data.title,
          description: data.description,
          date: data.date || new Date().toISOString().split('T')[0],
        });
      }
    } else if (modalType === 'task') {
      if (editingItem) {
        updateTask(activeProject.id, editingItem.id, {
          title: data.title,
          description: data.description,
        });
      } else {
        addTask(activeProject.id, {
          title: data.title,
          description: data.description,
        });
      }
    }

    setModalType(null);
    setEditingItem(null);
  };

  const filteredTasks = (activeProject.tasks || []).filter((task) => {
    if (taskFilter === 'pending') return task.status === 'pendiente';
    if (taskFilter === 'completed') return task.status === 'completado';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Navigation & Back */}
      <div className="flex items-center justify-between gap-4">
        <button
          id="btn-back-to-projects"
          onClick={() => setCurrentView('projects')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 py-1 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Volver a Proyectos</span>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Pause / Resume */}
          <button
            id="btn-toggle-pause-detail"
            onClick={() => togglePauseProject(activeProject.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              isPaused
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Reactivar' : 'Pausar'}</span>
          </button>

          {/* Edit */}
          <button
            id="btn-edit-project-detail"
            onClick={onEditProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-xl border border-rose-200">
              <span className="text-[11px] text-rose-700 font-medium px-1">¿Eliminar?</span>
              <button
                onClick={() => deleteProject(activeProject.id)}
                className="px-2 py-0.5 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Sí
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1 text-zinc-500 hover:text-zinc-800"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Eliminar proyecto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Project Header Banner */}
      <section className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-md border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
              >
                {activeProject.category}
              </span>
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                <span>{activeProject.status}</span>
              </div>
              <span className="text-xs text-zinc-600">
                Actualizado {formatRelativeTime(activeProject.updatedAt)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              {activeProject.name}
            </h1>

            <p className="text-sm text-zinc-600 max-w-3xl leading-relaxed">
              {activeProject.description || 'Sin descripción detallada.'}
            </p>
          </div>
        </div>

        {/* 2-Column Summary: Goal & Next Step */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Objetivo Principal */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              <Target className="w-4 h-4 text-blue-600" />
              <span>Objetivo Principal</span>
            </div>
            <p className="text-sm text-zinc-900 font-medium">
              {activeProject.mainGoal || 'No se ha definido un objetivo principal.'}
            </p>
          </div>

          {/* Próximo Paso */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/60">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 uppercase tracking-wider">
                <Compass className="w-4 h-4 text-blue-600" />
                <span>Próximo Paso</span>
              </div>
              {!isEditingNextStep && (
                <button
                  onClick={() => {
                    setNextStepInput(activeProject.nextStep || '');
                    setIsEditingNextStep(true);
                  }}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Modificar</span>
                </button>
              )}
            </div>

            {isEditingNextStep ? (
              <div className="space-y-2 mt-1">
                <input
                  type="text"
                  value={nextStepInput}
                  onChange={(e) => setNextStepInput(e.target.value)}
                  placeholder="¿Cuál es la siguiente acción?"
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveNextStep}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                  >
                    <Save className="w-3 h-3" />
                    <span>Guardar</span>
                  </button>
                  <button
                    onClick={() => setIsEditingNextStep(false)}
                    className="px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-950 font-medium">
                {activeProject.nextStep || 'No se ha especificado el próximo paso.'}
              </p>
            )}
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 border-t border-zinc-100 text-xs text-zinc-600">
          <div>
            <span className="text-zinc-600">Creado: </span>
            <span className="font-medium text-zinc-800">
              {formatDateSpanish(activeProject.createdAt)}
            </span>
          </div>
          <div>
            <span className="text-zinc-600">Última actualización: </span>
            <span className="font-medium text-zinc-800">
              {formatDateSpanish(activeProject.updatedAt)} ({formatRelativeTime(activeProject.updatedAt)})
            </span>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 pb-px scrollbar-none">
        <button
          id="tab-btn-tasks"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'tasks'
              ? 'border-zinc-900 text-zinc-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Pendientes</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'tasks'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {pendingTasksCount}
          </span>
        </button>

        <button
          id="tab-btn-milestones"
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'milestones'
              ? 'border-zinc-900 text-zinc-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Hitos</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
            {activeProject.milestones?.length || 0}
          </span>
        </button>

        <button
          id="tab-btn-decisions"
          onClick={() => setActiveTab('decisions')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'decisions'
              ? 'border-zinc-900 text-zinc-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Decisiones</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
            {activeProject.decisions?.length || 0}
          </span>
        </button>

        <button
          id="tab-btn-ideas"
          onClick={() => setActiveTab('ideas')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'ideas'
              ? 'border-zinc-900 text-zinc-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>Ideas</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
            {activeProject.ideas?.length || 0}
          </span>
        </button>

        <button
          id="tab-btn-activity"
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'activity'
              ? 'border-zinc-900 text-zinc-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
          }`}
        >
          <ActivityIcon className="w-4 h-4" />
          <span>Historial de Actividad</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
            {activeProject.activities?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Pendientes (Tasks) */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 animate-in fade-in duration-100">
          {/* Quick Task Creation & Filter */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-3">
            <form onSubmit={handleAddQuickTask} className="flex gap-2">
              <input
                id="input-quick-task"
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="Añadir una nueva tarea pendiente y pulsar Enter..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-sm outline-hidden transition placeholder:text-zinc-400"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </form>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    taskFilter === 'all'
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Todas ({activeProject.tasks?.length || 0})
                </button>
                <button
                  onClick={() => setTaskFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    taskFilter === 'pending'
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Pendientes ({pendingTasksCount})
                </button>
                <button
                  onClick={() => setTaskFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    taskFilter === 'completed'
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Completadas ({completedTasksCount})
                </button>
              </div>

              <button
                onClick={() => {
                  setEditingItem(null);
                  setModalType('task');
                }}
                className="text-zinc-600 hover:text-zinc-900 font-medium"
              >
                + Con descripción
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl divide-y divide-zinc-100 shadow-xs overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-600">
                {taskFilter === 'completed'
                  ? 'No hay tareas completadas todavía.'
                  : taskFilter === 'pending'
                  ? '¡No hay pendientes! Todas las tareas están completadas.'
                  : 'No hay pendientes registrados. Agrega uno arriba.'}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isDone = task.status === 'completado';
                return (
                  <div
                    key={task.id}
                    id={`task-row-${task.id}`}
                    className={`flex items-start gap-3 p-4 hover:bg-zinc-50/80 transition-colors group ${
                      isDone ? 'bg-zinc-50/40' : ''
                    }`}
                  >
                    <button
                      id={`btn-toggle-task-${task.id}`}
                      onClick={() => toggleTask(activeProject.id, task.id)}
                      className="mt-0.5 text-zinc-400 hover:text-blue-600 transition shrink-0"
                      title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug break-words ${
                          isDone ? 'line-through text-zinc-600' : 'font-medium text-zinc-900'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p
                          className={`text-xs mt-1 ${
                            isDone ? 'line-through text-zinc-600' : 'text-zinc-600'
                          }`}
                        >
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-zinc-600 mt-1.5">
                        <span>Creado: {formatRelativeTime(task.createdAt)}</span>
                        {task.completedAt && (
                          <span className="text-emerald-700">
                            · Completado {formatRelativeTime(task.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingItem(task);
                          setModalType('task');
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg"
                        title="Editar tarea"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTask(activeProject.id, task.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Hitos (Milestones) */}
      {activeTab === 'milestones' && (
        <div className="space-y-4 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Hitos del Proyecto</h2>
              <p className="text-xs text-zinc-600">Avances representativos alcanzados o programados.</p>
            </div>
            <button
              id="btn-add-milestone"
              onClick={() => {
                setEditingItem(null);
                setModalType('milestone');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Hito</span>
            </button>
          </div>

          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs">
            {(!activeProject.milestones || activeProject.milestones.length === 0) ? (
              <div className="text-center py-8 space-y-2">
                <Flag className="w-6 h-6 text-zinc-300 mx-auto" />
                <p className="text-xs text-zinc-600">No hay hitos definidos todavía.</p>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('milestone');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Registrar primer hito
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeProject.milestones.map((ms, index) => (
                  <div
                    key={ms.id}
                    id={`milestone-item-${ms.id}`}
                    className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 transition flex items-start justify-between gap-4 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                          {index + 1}
                        </span>
                        <h3 className="text-sm font-bold text-zinc-900">{ms.title}</h3>
                        <span className="text-[11px] text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                          {formatDateSpanish(ms.date)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 pl-7 leading-relaxed">
                        {ms.description || 'Sin descripción adicional.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => {
                          setEditingItem(ms);
                          setModalType('milestone');
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg"
                        title="Editar hito"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMilestone(activeProject.id, ms.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Eliminar hito"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Decisiones (Decisions) */}
      {activeTab === 'decisions' && (
        <div className="space-y-4 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Registro de Decisiones</h2>
              <p className="text-xs text-zinc-600">
                Historial documentado de por qué se tomaron determinadas decisiones estratégicas.
              </p>
            </div>
            <button
              id="btn-add-decision"
              onClick={() => {
                setEditingItem(null);
                setModalType('decision');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Decisión</span>
            </button>
          </div>

          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs">
            {(!activeProject.decisions || activeProject.decisions.length === 0) ? (
              <div className="text-center py-8 space-y-2">
                <Scale className="w-6 h-6 text-zinc-300 mx-auto" />
                <p className="text-xs text-zinc-600">No hay decisiones registradas aún.</p>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('decision');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Documentar la primera decisión
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeProject.decisions.map((dec) => (
                  <div
                    key={dec.id}
                    id={`decision-item-${dec.id}`}
                    className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 transition flex items-start justify-between gap-4 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-zinc-500 shrink-0" />
                        <h3 className="text-sm font-bold text-zinc-900">{dec.title}</h3>
                        <span className="text-[11px] text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
                          {formatDateSpanish(dec.date)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 pl-6 leading-relaxed">
                        {dec.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => {
                          setEditingItem(dec);
                          setModalType('decision');
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg"
                        title="Editar decisión"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteDecision(activeProject.id, dec.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Eliminar decisión"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Ideas */}
      {activeTab === 'ideas' && (
        <div className="space-y-4 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Banco de Ideas</h2>
              <p className="text-xs text-zinc-600">
                Iniciativas y mejoras conceptuales que no son tareas inmediatas.
              </p>
            </div>
            <button
              id="btn-add-idea"
              onClick={() => {
                setEditingItem(null);
                setModalType('idea');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anotar Idea</span>
            </button>
          </div>

          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs">
            {(!activeProject.ideas || activeProject.ideas.length === 0) ? (
              <div className="text-center py-8 space-y-2">
                <Lightbulb className="w-6 h-6 text-zinc-300 mx-auto" />
                <p className="text-xs text-zinc-600">No hay ideas anotadas todavía.</p>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('idea');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Agregar una nueva idea
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeProject.ideas.map((idea) => (
                  <div
                    key={idea.id}
                    id={`idea-item-${idea.id}`}
                    className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                          <h3 className="text-sm font-bold text-zinc-900">{idea.title}</h3>
                        </div>
                        <span className="text-[10px] text-zinc-600">
                          {formatDateSpanish(idea.date)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed pl-5">
                        {idea.description || 'Sin notas adicionales.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-zinc-100 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingItem(idea);
                          setModalType('idea');
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-md"
                        title="Editar idea"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteIdea(activeProject.id, idea.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                        title="Eliminar idea"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Actividad (Activity) */}
      {activeTab === 'activity' && (
        <div className="space-y-4 animate-in fade-in duration-100">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Historial de Cambios</h2>
            <p className="text-xs text-zinc-600">Registro cronológico de eventos relevantes del proyecto.</p>
          </div>

          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs">
            {(!activeProject.activities || activeProject.activities.length === 0) ? (
              <div className="text-center py-8 text-xs text-zinc-600">
                No hay actividad registrada en este proyecto.
              </div>
            ) : (
              <div className="space-y-4">
                {activeProject.activities.map((act) => (
                  <div
                    key={act.id}
                    id={`project-activity-${act.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50"
                  >
                    <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-900">{act.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-600 mt-1">
                        <span>{formatDateSpanish(act.timestamp)}</span>
                        <span>·</span>
                        <span>{new Date(act.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>({formatRelativeTime(act.timestamp)})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-item modal */}
      {modalType && (
        <ItemModal
          isOpen={!!modalType}
          type={modalType}
          editingItem={editingItem}
          onClose={() => {
            setModalType(null);
            setEditingItem(null);
          }}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
};
