import React, { useState, useMemo } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { TaskStatusCockpit } from './TaskStatusCockpit';
import { TaskDetailView } from './TaskDetailView';
import { soundEffects } from '../../utils/soundEffects';
import {
  CheckSquare,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Trash2,
  Edit2,
  Folder,
  X,
  CheckCircle2,
  Filter,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const {
    projects,
    allTasks,
    addTask,
    updateTaskStatus,
    updateTaskFull,
    deleteTask,
    navigateToProject,
    setCurrentView,
  } = useProjectContext();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<(Task & { projectName: string }) | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Celebration state for completing a task with visual feedback & sound
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(true);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>(projects[0]?.id || '');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('media');

  // Filter tasks based on query, project, and priority
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        const matchProj = task.projectName.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchProj) return false;
      }
      return true;
    });
  }, [allTasks, selectedProjectId, priorityFilter, searchQuery]);

  // Separate active tasks (pending & in-progress) and completed tasks
  const activeTasks = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.status !== 'completado' || t.id === celebratingTaskId
    );
  }, [filteredTasks, celebratingTaskId]);

  const completedTasks = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.status === 'completado' && t.id !== celebratingTaskId
    );
  }, [filteredTasks, celebratingTaskId]);

  // Counts
  const counts = useMemo(() => {
    const pending = allTasks.filter((t) => t.status === 'pendiente').length;
    const inProgress = allTasks.filter((t) => t.status === 'en_progreso').length;
    const completed = allTasks.filter((t) => t.status === 'completado').length;
    return { all: allTasks.length, pending, inProgress, completed };
  }, [allTasks]);

  // If a task is selected, show its dedicated workspace detail view
  const selectedTask = useMemo(() => {
    return selectedTaskId ? allTasks.find((t) => t.id === selectedTaskId) : null;
  }, [allTasks, selectedTaskId]);

  if (selectedTask) {
    return (
      <TaskDetailView
        task={selectedTask}
        onBack={() => setSelectedTaskId(null)}
      />
    );
  }

  /**
   * Handles changing status with special celebration flow on completion
   */
  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'completado' && task.status !== 'completado') {
      // 1. Mark task as celebrating
      setCelebratingTaskId(task.id);

      // 2. Play achievement chime via Web Audio API
      soundEffects.playTaskCompletedChime();

      // 3. Keep task visible during the celebration animation, then transition to completed
      setTimeout(() => {
        updateTaskStatus(task.projectId, task.id, 'completado');
        setCelebratingTaskId(null);
      }, 700);
    } else {
      updateTaskStatus(task.projectId, task.id, newStatus);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProjectId) return;

    addTask(newProjectId, {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      dueDate: newDueDate || undefined,
      dueTime: newDueTime || undefined,
      priority: newPriority,
    });

    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setNewDueTime('');
    setNewPriority('media');
    setIsCreateModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim()) return;

    updateTaskFull(editingTask.projectId, editingTask.id, {
      title: editingTask.title.trim(),
      description: editingTask.description?.trim(),
      dueDate: editingTask.dueDate || undefined,
      dueTime: editingTask.dueTime || undefined,
      priority: editingTask.priority || 'media',
      status: editingTask.status,
    });

    setEditingTask(null);
  };

  const getPriorityBadge = (priority?: TaskPriority) => {
    switch (priority) {
      case 'alta':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            Alta
          </span>
        );
      case 'baja':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
            Baja
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Media
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 py-2 space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Tareas</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
              {counts.pending + counts.inProgress} activas · {counts.completed} listas
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Gestión visual con selectores estilo avión/panel de control e interacción rápida.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('general-chat')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Pedir al Agente</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-3 rounded-2xl border border-zinc-200/90 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tarea, detalle o proyecto..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Project filter */}
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1 text-xs text-zinc-700">
            <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-xs text-zinc-900 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Todos los proyectos ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1 text-xs text-zinc-700">
            <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-transparent text-xs text-zinc-900 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Prioridad</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: ACTIVAS (Pendientes y En Progreso) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Tareas Activas ({activeTasks.length})
          </h2>
          <span className="text-[11px] text-zinc-400 font-medium">
            Pulsa el botón verde para completar con celebración
          </span>
        </div>

        {activeTasks.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-zinc-200 rounded-2xl bg-white/60 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
            <p className="text-xs font-semibold text-zinc-800">No hay tareas pendientes en este filtro</p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              ¡Buen trabajo! O puedes crear una nueva tarea para continuar avanzando.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => {
              const isCelebrating = celebratingTaskId === task.id;
              const displayStatus: TaskStatus = isCelebrating ? 'completado' : task.status;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`relative group bg-white rounded-2xl border transition-all duration-300 flex flex-row items-stretch overflow-hidden shadow-2xs cursor-pointer ${
                    isCelebrating
                      ? 'animate-celebrate border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-400'
                      : 'border-zinc-200/90 hover:border-zinc-300 hover:shadow-xs'
                  }`}
                >
                  {/* Celebration Sparkles Overlay */}
                  {isCelebrating && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden rounded-2xl z-20">
                      <div className="absolute -top-1 left-1/4 animate-sparkle text-amber-400 font-bold text-lg">
                        ✨
                      </div>
                      <div className="absolute top-2 right-1/3 animate-sparkle text-emerald-500 font-bold text-xl" style={{ animationDelay: '0.1s' }}>
                        ⭐
                      </div>
                      <div className="absolute bottom-1 left-1/2 animate-sparkle text-amber-500 font-bold text-base" style={{ animationDelay: '0.2s' }}>
                        🎉
                      </div>
                    </div>
                  )}

                  {/* Left Content */}
                  <div className="min-w-0 flex-1 p-3.5 sm:p-4 space-y-1.5 flex flex-col justify-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-semibold tracking-tight transition-colors ${
                          isCelebrating ? 'text-emerald-800' : 'text-zinc-900 group-hover:text-blue-600'
                        }`}
                      >
                        {task.title}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>

                    {task.description && (
                      <p className="text-xs text-zinc-500 line-clamp-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5 flex-wrap">
                      {/* Project Badge */}
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-500">
                        <Folder className="w-3 h-3 text-zinc-400" />
                        <span>{task.projectName}</span>
                      </span>

                      {/* Due Date & Time */}
                      {task.dueDate && (
                        <span className="inline-flex items-center gap-1 text-zinc-500">
                          <CalendarIcon className="w-3 h-3 text-zinc-400" />
                          <span>{task.dueDate}</span>
                          {task.dueTime && <span>({task.dueTime})</span>}
                        </span>
                      )}

                      {/* Detail button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskId(task.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-blue-600 transition-opacity ml-1 flex items-center gap-0.5"
                        title="Abrir detalle de tarea"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Detalle</span>
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.projectId, task.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-opacity ml-1 flex items-center gap-0.5"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Side: 3-State Aircraft Cockpit Buttons integrated directly into the right edge */}
                  <TaskStatusCockpit
                    status={displayStatus}
                    onChangeStatus={(s) => handleStatusChange(task, s)}
                    disabled={isCelebrating}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: TAREAS COMPLETADAS (Sección Inferior con Transición Fluida) */}
      <div className="pt-3 border-t border-zinc-200/90 space-y-2.5">
        <button
          onClick={() => setIsCompletedSectionOpen(!isCompletedSectionOpen)}
          className="w-full flex items-center justify-between px-1 py-1 text-left text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="uppercase tracking-wider">Tareas Completadas ({completedTasks.length})</span>
          </div>
          {isCompletedSectionOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {isCompletedSectionOpen && completedTasks.length > 0 && (
          <div className="space-y-2 animate-in fade-in duration-300">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="group bg-zinc-50/80 rounded-2xl border border-zinc-200/70 flex flex-row items-stretch overflow-hidden text-zinc-500 hover:bg-zinc-100/60 transition-colors shadow-2xs cursor-pointer"
              >
                <div className="min-w-0 flex-1 p-3 sm:p-3.5 space-y-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium line-through text-zinc-400 group-hover:text-zinc-600">
                      {task.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      Completada
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span>{task.projectName}</span>
                    {task.dueDate && <span>Venció: {task.dueDate}</span>}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(task.projectId, task.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-opacity ml-1"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Right Side: Cockpit buttons directly integrated into the right edge */}
                <TaskStatusCockpit
                  status="completado"
                  onChangeStatus={(s) => handleStatusChange(task, s)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear Tarea */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Nueva Tarea
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Título de la tarea *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Revisar contrato de proveedor"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Proyecto asignado *
                </label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-400 focus:bg-white cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Fecha límite</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Hora límite</label>
                  <input
                    type="time"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Prioridad</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-400"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Notas adicionales</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detalles sobre lo que se debe hacer..."
                  rows={2}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 shadow-2xs"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Tarea */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Editar Tarea
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Fecha límite</label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Hora límite</label>
                  <input
                    type="time"
                    value={editingTask.dueTime || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueTime: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Prioridad</label>
                <select
                  value={editingTask.priority || 'media'}
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-hidden"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Notas</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={2}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 shadow-2xs"
                >
                  Actualizar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
