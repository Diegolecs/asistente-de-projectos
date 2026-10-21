import React, { useState, useEffect } from 'react';
import { ProjectProvider, useProjectContext, CreateProjectDTO } from './context/ProjectContext';
import { AppLayout } from './components/layout/AppLayout';
import { GeneralChatView } from './components/chat/GeneralChatView';
import { ProjectChatView } from './components/chat/ProjectChatView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ProjectDetailView } from './components/projects/ProjectDetailView';
import { TasksView } from './components/tasks/TasksView';
import { CalendarView } from './components/calendar/CalendarView';
import { SettingsView } from './components/settings/SettingsView';
import { ProjectModal } from './components/projects/ProjectModal';
import { Project } from './types';
import { nativeService } from './services/nativeService';

const MainContent: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    activeProject,
    createProject,
    updateProject,
    navigateToProject,
  } = useProjectContext();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    nativeService.initAppChrome();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleProjectModalSubmit = (data: CreateProjectDTO) => {
    if (editingProject) {
      updateProject(editingProject.id, data);
    } else {
      const created = createProject(data);
      // Automatically open the newly created project's chat
      navigateToProject(created.id);
    }
  };

  return (
    <AppLayout onOpenCreateModal={handleOpenCreateModal}>
      {/* 1. General Strategic Agent Chat */}
      {currentView === 'general-chat' && <GeneralChatView />}

      {/* 2. Project Chat (Primary project view) */}
      {currentView === 'project-chat' && <ProjectChatView />}

      {/* 3. Projects Portfolio Management */}
      {currentView === 'projects' && (
        <ProjectsView
          onOpenCreateModal={handleOpenCreateModal}
          onEditProject={handleEditProject}
        />
      )}

      {/* 4. Full Structured Project Detail View (Classical dashboard mode) */}
      {currentView === 'project-detail' && (
        <ProjectDetailView
          onEditProject={() => {
            if (activeProject) {
              handleEditProject(activeProject);
            }
          }}
        />
      )}

      {/* 5. Consolidated Tasks View */}
      {currentView === 'tasks' && <TasksView />}

      {/* 6. Calendar View with Google Calendar Export */}
      {currentView === 'calendar' && <CalendarView />}

      {/* 7. Metrics Dashboard */}
      {currentView === 'dashboard' && (
        <DashboardView onOpenCreateModal={handleOpenCreateModal} />
      )}

      {/* 8. Settings */}
      {currentView === 'settings' && <SettingsView />}

      {/* Create/Edit Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        editingProject={editingProject}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleProjectModalSubmit}
      />
    </AppLayout>
  );
};

export default function App() {
  return (
    <ProjectProvider>
      <MainContent />
    </ProjectProvider>
  );
}
