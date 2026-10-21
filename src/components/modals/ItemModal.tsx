import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export type ItemType = 'milestone' | 'decision' | 'idea' | 'task';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ItemType;
  editingItem?: {
    id: string;
    title: string;
    description?: string;
    date?: string;
  } | null;
  onSubmit: (data: { title: string; description: string; date?: string }) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  type,
  editingItem,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  const typeConfig: Record<ItemType, { title: string; descPlaceholder: string; hasDate: boolean }> = {
    milestone: {
      title: editingItem ? 'Editar Hito' : 'Nuevo Hito',
      descPlaceholder: 'Describe el avance clave alcanzado o esperado...',
      hasDate: true,
    },
    decision: {
      title: editingItem ? 'Editar Decisión' : 'Nueva Decisión Importante',
      descPlaceholder: 'Explica por qué se tomó esta decisión y qué alternativas se descartaron...',
      hasDate: true,
    },
    idea: {
      title: editingItem ? 'Editar Idea' : 'Nueva Idea',
      descPlaceholder: 'Anota cualquier concepto o función potencial para el futuro...',
      hasDate: true,
    },
    task: {
      title: editingItem ? 'Editar Pendiente' : 'Nueva Tarea Pendiente',
      descPlaceholder: 'Detalles u observaciones opcionales de la tarea...',
      hasDate: false,
    },
  };

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || '');
      setDescription(editingItem.description || '');
      setDate(editingItem.date || new Date().toISOString().split('T')[0]);
    } else {
      setTitle('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setError('');
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor indica un título.');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      date: typeConfig[type].hasDate ? date : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-150 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <h2 className="text-sm font-bold text-zinc-900">{typeConfig[type].title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {error && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Título <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ej. Título descriptivo..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden text-sm"
              autoFocus
            />
          </div>

          {typeConfig[type].hasDate && (
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Descripción {type === 'task' ? '(opcional)' : ''}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={typeConfig[type].descPlaceholder}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
