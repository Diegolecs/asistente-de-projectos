import React from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  ArrowRight,
  Plus,
  Activity as ActivityIcon,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { getStatusBadgeClass, getCategoryBadgeClass, formatRelativeTime } from '../../utils/formatters';

interface DashboardViewProps {
  onOpenCreateModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenCreateModal }) => {
  const { stats, recentProjects, allActivities, navigateToProject, setCurrentView } =
    useProjectContext();

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Welcome & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200/70">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Panel de Proyectos
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Resumen general de proyectos, hitos activos y próximas acciones.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="dash-btn-create-project"
            onClick={onOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white font-medium text-sm shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Metrics Section: 5 clear stat cards */}
      <section aria-label="Métricas generales">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          <div
            id="stat-total"
            onClick={() => setCurrentView('projects')}
            className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-zinc-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
              <FolderKanban className="w-4 h-4 text-zinc-600 group-hover:text-zinc-700 transition" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-zinc-950">{stats.total}</div>
            <p className="text-[11px] text-zinc-600 mt-1">Proyectos registrados</p>
          </div>

          <div
            id="stat-active"
            onClick={() => setCurrentView('projects')}
            className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Activos</span>
              <PlayCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{stats.active}</div>
            <p className="text-[11px] text-zinc-600 mt-1">En ejecución directa</p>
          </div>

          <div
            id="stat-planning"
            onClick={() => setCurrentView('projects')}
            className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-blue-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Planificación</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.planning}</div>
            <p className="text-[11px] text-zinc-600 mt-1">Estructurando alcance</p>
          </div>

          <div
            id="stat-paused"
            onClick={() => setCurrentView('projects')}
            className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-amber-300 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Pausados</span>
              <PauseCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-700">{stats.paused}</div>
            <p className="text-[11px] text-zinc-600 mt-1">En espera temporal</p>
          </div>

          <div
            id="stat-completed"
            onClick={() => setCurrentView('projects')}
            className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-zinc-400 transition cursor-pointer col-span-2 sm:col-span-1 group"
          >
            <div className="flex items-center justify-between text-zinc-700 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Completados</span>
              <CheckCircle2 className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-zinc-800">{stats.completed}</div>
            <p className="text-[11px] text-zinc-600 mt-1">Finalizados con éxito</p>
          </div>
        </div>
      </section>

      {/* Main Grid: Recent Projects (Left/Wide) + Recent Activity (Right/Narrow) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Proyectos Recientes */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">Proyectos Recientes</h2>
              <span className="text-xs text-zinc-600 font-medium">({recentProjects.length})</span>
            </div>
            <button
              onClick={() => setCurrentView('projects')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group py-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-8 text-center space-y-3">
              <p className="text-zinc-600 text-sm">Aún no tienes proyectos registrados.</p>
              <button
                onClick={onOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Crear mi primer proyecto</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentProjects.map((project) => {
                const statusStyle = getStatusBadgeClass(project.status);
                const categoryStyle = getCategoryBadgeClass(project.category);
                const completedTasks = project.tasks?.filter((t) => t.status === 'completado').length || 0;
                const totalTasks = project.tasks?.length || 0;

                return (
                  <div
                    key={project.id}
                    id={`recent-project-card-${project.id}`}
                    onClick={() => navigateToProject(project.id)}
                    className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header: Category & Status */}
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

                      {/* Project Title & Description */}
                      <h3 className="font-bold text-zinc-900 text-base group-hover:text-blue-600 transition-colors flex items-center justify-between">
                        <span>{project.name}</span>
                        <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 shrink-0" />
                      </h3>
                      <p className="text-xs text-zinc-600 line-clamp-2 mt-1.5 leading-relaxed">
                        {project.description || 'Sin descripción.'}
                      </p>

                      {/* Next Step Box */}
                      {project.nextStep && (
                        <div className="mt-4 p-2.5 bg-zinc-50 border border-zinc-200/70 rounded-xl">
                          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">
                            Próximo paso
                          </div>
                          <p className="text-xs font-medium text-zinc-800 line-clamp-2">
                            {project.nextStep}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-600">
                      <span>Act: {formatRelativeTime(project.updatedAt)}</span>
                      {totalTasks > 0 && (
                        <span className="font-medium">
                          {completedTasks}/{totalTasks} tareas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Actividad Reciente */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-zinc-500" />
              <h2 className="text-lg font-bold text-zinc-900">Actividad Reciente</h2>
            </div>
            <span className="text-[11px] text-zinc-600">Cambios relevantes</span>
          </div>

          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            {allActivities.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-xs">
                No hay actividad registrada recientemente.
              </div>
            ) : (
              <div className="space-y-3.5">
                {allActivities.map((act) => (
                  <div
                    key={act.id}
                    id={`activity-item-${act.id}`}
                    onClick={() => act.projectId && navigateToProject(act.projectId)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200/70 transition cursor-pointer group"
                  >
                    <div className="mt-0.5 w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {act.projectName && (
                        <div className="text-[11px] font-semibold text-zinc-900 group-hover:text-blue-600 transition truncate">
                          {act.projectName}
                        </div>
                      )}
                      <p className="text-xs text-zinc-700 leading-snug break-words">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-zinc-600 mt-1 block">
                        {formatRelativeTime(act.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
