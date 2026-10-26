import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  FolderKanban,
  Settings,
  Plus,
  X,
  Layers,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  BrainCircuit,
  MessageSquare,
  CheckSquare,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { ViewType } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { OfflineIndicator } from '../pwa/OfflineIndicator';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenCreateModal: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, onOpenCreateModal }) => {
  const {
    currentView,
    setCurrentView,
    projects,
    activeProjectId,
    navigateToProject,
    aiStatus,
    allTasks,
    events,
    stats,
  } = useProjectContext();

  const [visualHeight, setVisualHeight] = useState<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const isChatView = currentView === 'general-chat' || currentView === 'project-chat';

  // Monitor dynamic visual viewport to handle mobile virtual keyboards accurately
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (vv) {
        setVisualHeight(vv.height);
        const heightDiff = window.innerHeight - vv.height;
        // When keyboard appears on Android / iOS, the visualViewport height drops significantly (> 120px)
        const keyboardActive = heightDiff > 120;
        setIsKeyboardOpen(keyboardActive);

        // Keep page scrolled to top to avoid header getting pushed off-screen
        if (keyboardActive && (window.scrollY !== 0 || window.scrollX !== 0)) {
          window.scrollTo(0, 0);
        }
      } else {
        setVisualHeight(window.innerHeight);
        setIsKeyboardOpen(false);
      }
    };

    handleViewportChange();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  // Automatically reset vertical scroll to top of main container when changing views
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentView, activeProjectId]);

  const pendingTasksCount = allTasks.filter((t) => t.status === 'pendiente').length;

  const handleNavClick = (view: ViewType) => {
    setCurrentView(view);
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProjectClick = (projectId: string) => {
    navigateToProject(projectId);
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      style={{
        height: visualHeight ? `${visualHeight}px` : undefined,
        maxHeight: visualHeight ? `${visualHeight}px` : undefined,
      }}
      className="h-screen h-[100dvh] bg-zinc-50 flex flex-col md:flex-row text-zinc-900 overflow-hidden"
    >
      <OfflineIndicator />

      {/* Desktop Sidebar */}
      <aside
        id="desktop-sidebar"
        className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-zinc-200/90 shrink-0 select-none h-full"
      >
        {/* Brand header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-2xs">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-950 tracking-tight leading-none text-base">
                Project OS
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${aiStatus.activeProvider === 'gemini' && aiStatus.hasGeminiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[11px] text-zinc-500 font-medium">
                  {aiStatus.activeProvider === 'gemini' && aiStatus.hasGeminiKey ? 'Gemini 3.8 Flash' : 'Motor Local (Offline)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="p-3.5">
          <button
            id="sidebar-btn-new-project"
            onClick={onOpenCreateModal}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 active:bg-black text-white font-medium text-xs shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 px-3 space-y-4 overflow-y-auto">
          {/* 1. GENERAL (Strategic Cross-Project Agent) */}
          <div className="space-y-1">
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Dirección
            </div>
            <button
              id="nav-link-general"
              onClick={() => handleNavClick('general-chat')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                currentView === 'general-chat'
                  ? 'bg-zinc-950 text-white shadow-xs font-semibold'
                  : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass
                  className={`w-4 h-4 ${
                    currentView === 'general-chat' ? 'text-blue-400' : 'text-zinc-400'
                  }`}
                />
                <span>General</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  currentView === 'general-chat'
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                Agente
              </span>
            </button>
          </div>

          {/* 2. PROYECTOS (Direct Chat Links for each project) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                Proyectos
              </span>
              <span className="text-[10px] font-mono text-zinc-400">{projects.length}</span>
            </div>

            <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <p className="text-xs text-zinc-400 px-3 py-2 italic">Sin proyectos aún</p>
              ) : (
                projects.map((proj) => {
                  const isSelected =
                    currentView === 'project-chat' && activeProjectId === proj.id;
                  return (
                    <button
                      key={proj.id}
                      id={`sidebar-proj-${proj.id}`}
                      onClick={() => handleProjectClick(proj.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left group ${
                        isSelected
                          ? 'bg-blue-50 text-blue-950 font-semibold border border-blue-200/60'
                          : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            proj.status === 'Activo'
                              ? 'bg-emerald-500 ring-2 ring-emerald-100'
                              : proj.status === 'Pausado'
                              ? 'bg-amber-400'
                              : proj.status === 'Completado'
                              ? 'bg-blue-400'
                              : 'bg-zinc-400'
                          }`}
                        />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isSelected
                            ? 'text-blue-600 translate-x-0.5'
                            : 'text-zinc-300 group-hover:text-zinc-500'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* Navigation Sections */}
            <div className="pt-2 border-t border-zinc-100 space-y-0.5">
              <button
                id="nav-link-dashboard"
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  currentView === 'dashboard'
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-zinc-400" />
                <span>Dashboard</span>
              </button>

              <button
                id="nav-link-projects-grid"
                onClick={() => handleNavClick('projects')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  currentView === 'projects'
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                }`}
              >
                <FolderKanban className="w-4 h-4 text-zinc-400" />
                <span>Proyectos</span>
              </button>

              <button
                id="nav-link-tasks"
                onClick={() => handleNavClick('tasks')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  currentView === 'tasks'
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span>Tareas</span>
                </div>
                {pendingTasksCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-semibold">
                    {pendingTasksCount}
                  </span>
                )}
              </button>

              <button
                id="nav-link-calendar"
                onClick={() => handleNavClick('calendar')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  currentView === 'calendar'
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
                  <span>Calendario</span>
                </div>
                {events.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {events.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 3. CONFIGURACIÓN */}
          <div className="space-y-1 pt-2 border-t border-zinc-100">
            <button
              id="nav-link-settings"
              onClick={() => handleNavClick('settings')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                currentView === 'settings'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Configuración</span>
              </div>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-100 space-y-2 bg-zinc-50/50">
          <PWAInstallButton variant="compact" />
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Persistencia Local Activa
            </span>
            <span>v1.2.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Begins directly with no top bar */}
      <main
        ref={mainRef}
        id="main-content-scroll"
        className={`flex-1 min-w-0 min-h-0 flex flex-col ${
          isChatView
            ? `overflow-hidden ${isKeyboardOpen ? 'pb-1' : 'pb-16'} md:pb-0`
            : 'overflow-y-auto overflow-x-hidden pb-24 md:pb-8 touch-pan-y overscroll-y-contain'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className={`max-w-7xl w-full mx-auto flex-1 flex flex-col ${
            isChatView ? 'p-2 sm:p-4 min-h-0 h-full' : 'p-3 sm:p-5'
          }`}
        >
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div
        id="mobile-bottom-nav"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-2 py-1 flex items-center justify-around transition-all ${
          isKeyboardOpen ? 'hidden' : ''
        }`}
      >
        <button
          onClick={() => handleNavClick('general-chat')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[48px] min-h-[44px] rounded-lg text-[10px] font-medium transition-colors ${
            currentView === 'general-chat' ? 'text-blue-600 font-bold' : 'text-zinc-500'
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          <span>General</span>
        </button>

        <button
          onClick={() => handleNavClick('projects')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[48px] min-h-[44px] rounded-lg text-[10px] font-medium transition-colors ${
            currentView === 'projects' ? 'text-blue-600 font-bold' : 'text-zinc-500'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <FolderKanban className="w-4 h-4 mb-0.5" />
            <span
              className={`absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-0.5 rounded-full text-[9px] font-bold font-mono flex items-center justify-center leading-none border transition-colors ${
                currentView === 'projects'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              {projects.length}
            </span>
          </div>
          <span>Proyectos</span>
        </button>

        <button
          onClick={() => handleNavClick('tasks')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[48px] min-h-[44px] rounded-lg text-[10px] font-medium transition-colors ${
            currentView === 'tasks' ? 'text-emerald-600 font-bold' : 'text-zinc-500'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <CheckSquare className="w-4 h-4 mb-0.5" />
            <span
              className={`absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-0.5 rounded-full text-[9px] font-bold font-mono flex items-center justify-center leading-none border transition-colors ${
                currentView === 'tasks'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              {allTasks.length}
            </span>
          </div>
          <span>Tareas</span>
        </button>

        <button
          onClick={() => handleNavClick('calendar')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[48px] min-h-[44px] rounded-lg text-[10px] font-medium transition-colors ${
            currentView === 'calendar' ? 'text-blue-600 font-bold' : 'text-zinc-500'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <CalendarIcon className="w-4 h-4 mb-0.5" />
            <span
              className={`absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-0.5 rounded-full text-[9px] font-bold font-mono flex items-center justify-center leading-none border transition-colors ${
                currentView === 'calendar'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              {events.length}
            </span>
          </div>
          <span>Calendario</span>
        </button>

        <button
          onClick={() => handleNavClick('settings')}
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[48px] min-h-[44px] rounded-lg text-[10px] font-medium transition-colors ${
            currentView === 'settings' ? 'text-blue-600 font-bold' : 'text-zinc-500'
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span>Ajustes</span>
        </button>
      </div>
    </div>
  );
};
