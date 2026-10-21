import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  PlayCircle,
  PauseCircle,
  Edit2,
  Trash2,
  Filter,
  X,
  ArrowUpRight,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { Project, ProjectCategory, ProjectStatus } from '../../types';
import { getStatusBadgeClass, getCategoryBadgeClass, formatRelativeTime } from '../../utils/formatters';

interface ProjectsViewProps {
  onOpenCreateModal: () => void;
  onEditProject: (project: Project) => void;
}

const CATEGORIES: ('Todas' | ProjectCategory)[] = [
  'Todas',
  'Producto',
  'Negocio',
  'Personal',
  'Experimento',
  'Otro',
];

const STATUSES: ('Todos' | ProjectStatus)[] = [
  'Todos',
  'Activo',
  'Planificación',
  'Pausado',
  'Idea',
  'Completado',
  'Archivado',
];

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onOpenCreateModal,
  onEditProject,
}) => {
  const { projects, navigateToProject, togglePauseProject, deleteProject } = useProjectContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | ProjectCategory>('Todas');
  const [selectedStatus, setSelectedStatus] = useState<'Todos' | ProjectStatus>('Todos');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Category filter
      if (selectedCategory !== 'Todas' && p.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'Todos' && p.status !== selectedStatus) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDesc = (p.description || '').toLowerCase().includes(query);
        const matchesGoal = (p.mainGoal || '').toLowerCase().includes(query);
        const matchesNextStep = (p.nextStep || '').toLowerCase().includes(query);
        return matchesName || matchesDesc || matchesGoal || matchesNextStep;
      }
      return true;
    });
  }, [projects, selectedCategory, selectedStatus, searchTerm]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProject(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200/70">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Proyectos ({projects.length})
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Administra, filtra y mantén al día tus iniciativas personales y de negocio.
          </p>
        </div>
        <button
          id="btn-projects-new"
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white font-medium text-sm shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Proyecto</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            id="input-search-projects"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, descripción, objetivo o próximo paso..."
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-sm outline-hidden transition placeholder:text-zinc-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Estado:
            </span>
            {STATUSES.map((st) => {
              const isSelected = selectedStatus === st;
              return (
                <button
                  key={st}
                  id={`filter-status-${st}`}
                  onClick={() => setSelectedStatus(st)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-zinc-900 text-white font-semibold shadow-2xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider shrink-0 mr-1">
              Categoría:
            </span>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`filter-category-${cat}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-10 text-center space-y-3">
          <FolderKanban className="w-8 h-8 text-zinc-400 mx-auto" />
          <h2 className="text-base font-semibold text-zinc-800">
            No se encontraron proyectos
          </h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'Todas' || selectedStatus !== 'Todos'
              ? 'Prueba ajustando los filtros de búsqueda o eliminando el texto filtrado.'
              : 'Empieza registrando tu primer proyecto para gestionar sus hitos y tareas.'}
          </p>
          {(searchTerm || selectedCategory !== 'Todas' || selectedStatus !== 'Todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('Todas');
                setSelectedStatus('Todos');
              }}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const statusStyle = getStatusBadgeClass(project.status);
            const categoryStyle = getCategoryBadgeClass(project.category);
            const isPaused = project.status === 'Pausado';
            const completedTasks = project.tasks?.filter((t) => t.status === 'completado').length || 0;
            const totalTasks = project.tasks?.length || 0;
            const milestonesCount = project.milestones?.length || 0;
            const decisionsCount = project.decisions?.length || 0;
            const ideasCount = project.ideas?.length || 0;

            return (
              <div
                key={project.id}
                id={`project-card-${project.id}`}
                onClick={() => navigateToProject(project.id)}
                className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative"
              >
                <div>
                  {/* Category & Status badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                    >
                      {project.category}
                    </span>
                    <div
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      <span>{project.status}</span>
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="font-bold text-zinc-900 text-lg group-hover:text-blue-600 transition-colors flex items-center justify-between">
                    <span>{project.name}</span>
                    <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 shrink-0" />
                  </h3>

                  <p className="text-xs text-zinc-600 line-clamp-2 mt-1.5 leading-relaxed">
                    {project.description || 'Sin descripción.'}
                  </p>

                  {/* Goal & Next step */}
                  {project.mainGoal && (
                    <div className="mt-3.5 text-xs text-zinc-700">
                      <span className="font-semibold text-zinc-900">Objetivo: </span>
                      <span className="line-clamp-2 text-zinc-600">{project.mainGoal}</span>
                    </div>
                  )}

                  {project.nextStep && (
                    <div className="mt-3 p-2.5 bg-zinc-50 border border-zinc-200/70 rounded-xl">
                      <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">
                        Próximo paso
                      </div>
                      <p className="text-xs font-medium text-zinc-800 line-clamp-2">
                        {project.nextStep}
                      </p>
                    </div>
                  )}

                  {/* Quick counter chips */}
                  <div className="flex items-center gap-3 mt-4 text-[11px] text-zinc-600">
                    <span>{milestonesCount} hitos</span>
                    <span>·</span>
                    <span>{totalTasks} tareas ({completedTasks} completadas)</span>
                    <span>·</span>
                    <span>{decisionsCount} decisiones</span>
                  </div>
                </div>

                {/* Card Actions & Footer */}
                <div
                  className="mt-5 pt-3.5 border-t border-zinc-100 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-zinc-600">
                    Act: {formatRelativeTime(project.updatedAt)}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Pause / Reactivate Button */}
                    <button
                      id={`btn-pause-project-${project.id}`}
                      onClick={() => togglePauseProject(project.id)}
                      title={isPaused ? 'Reactivar proyecto' : 'Pausar proyecto'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isPaused
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      {isPaused ? (
                        <PlayCircle className="w-4 h-4" />
                      ) : (
                        <PauseCircle className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit button */}
                    <button
                      id={`btn-edit-project-${project.id}`}
                      onClick={() => onEditProject(project)}
                      title="Editar proyecto"
                      className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete button with confirmation */}
                    {deleteConfirmId === project.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 p-0.5 rounded-lg border border-rose-200">
                        <button
                          onClick={(e) => handleDelete(project.id, e)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 rounded"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-0.5 text-zinc-400 hover:text-zinc-600 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`btn-delete-project-${project.id}`}
                        onClick={() => setDeleteConfirmId(project.id)}
                        title="Eliminar proyecto"
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
