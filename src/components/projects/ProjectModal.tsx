import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Project, ProjectCategory, ProjectStatus } from '../../types';
import { CreateProjectDTO } from '../../context/ProjectContext';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectDTO) => void;
  editingProject?: Project | null;
}

const CATEGORIES: ProjectCategory[] = ['Producto', 'Negocio', 'Personal', 'Experimento', 'Otro'];
const STATUSES: ProjectStatus[] = ['Idea', 'Planificación', 'Activo', 'Pausado', 'Completado', 'Archivado'];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingProject,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('Producto');
  const [status, setStatus] = useState<ProjectStatus>('Activo');
  const [mainGoal, setMainGoal] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name || '');
      setDescription(editingProject.description || '');
      setCategory(editingProject.category || 'Producto');
      setStatus(editingProject.status || 'Activo');
      setMainGoal(editingProject.mainGoal || '');
      setNextStep(editingProject.nextStep || '');
    } else {
      setName('');
      setDescription('');
      setCategory('Producto');
      setStatus('Activo');
      setMainGoal('');
      setNextStep('');
    }
    setError('');
  }, [editingProject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor escribe un nombre para el proyecto.');
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      category,
      status,
      mainGoal: mainGoal.trim(),
      nextStep: nextStep.trim(),
    });
    onClose();
  };

  return (
    <div
      id="project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        id="project-modal-dialog"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-6 animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {editingProject ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              {editingProject ? 'Actualiza los datos básicos del proyecto' : 'Registra un nuevo proyecto en tu sistema'}
            </p>
          </div>
          <button
            id="btn-close-project-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label htmlFor="field-project-name" className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Nombre del proyecto <span className="text-rose-500">*</span>
            </label>
            <input
              id="field-project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ej. CV Smart, Poker Trainer, Lead Finder..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition text-zinc-900 text-sm placeholder:text-zinc-400"
              autoFocus
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="field-project-desc" className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Descripción breve
            </label>
            <textarea
              id="field-project-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="En qué consiste el proyecto en una o dos frases..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition text-zinc-900 text-sm placeholder:text-zinc-400 resize-none"
            />
          </div>

          {/* Categoría & Estado (2 Columns on tablet/desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-project-category" className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Categoría
              </label>
              <select
                id="field-project-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition bg-white text-zinc-900 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="field-project-status" className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Estado inicial
              </label>
              <select
                id="field-project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition bg-white text-zinc-900 text-sm"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Objetivo Principal */}
          <div>
            <label htmlFor="field-project-goal" className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Objetivo principal
            </label>
            <input
              id="field-project-goal"
              type="text"
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              placeholder="Qué quiero conseguir con este proyecto..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition text-zinc-900 text-sm placeholder:text-zinc-400"
            />
          </div>

          {/* Próximo Paso */}
          <div>
            <label htmlFor="field-project-next-step" className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Próximo paso
            </label>
            <input
              id="field-project-next-step"
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="Qué debería hacer a continuación..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition text-zinc-900 text-sm placeholder:text-zinc-400"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-project"
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
