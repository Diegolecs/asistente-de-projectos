import React from 'react';
import { TaskStatus } from '../../types';
import { nativeService } from '../../services/nativeService';

interface TaskStatusCockpitProps {
  status: TaskStatus;
  onChangeStatus: (newStatus: TaskStatus) => void;
  disabled?: boolean;
}

/**
 * Three vertically-stacked illuminated control panel buttons integrated directly into
 * the right border of the task card (NO secondary container or floating box).
 *
 * ROJO (Top) -> Pendiente
 * AMARILLO (Center) -> En progreso
 * VERDE (Bottom) -> Completada
 */
export const TaskStatusCockpit: React.FC<TaskStatusCockpitProps> = ({
  status,
  onChangeStatus,
  disabled = false,
}) => {
  const isRed = status === 'pendiente';
  const isYellow = status === 'en_progreso';
  const isGreen = status === 'completado';

  return (
    <div
      className="flex flex-col w-12 sm:w-14 shrink-0 border-l border-zinc-200/90 divide-y divide-zinc-200/90 select-none self-stretch"
      title="Control de estado integrado (Rojo: Pendiente, Amarillo: En progreso, Verde: Completada)"
    >
      {/* 1. ROJO - Arriba: Pendiente */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          nativeService.hapticImpact('light');
          onChangeStatus('pendiente');
        }}
        title="Marcar como Pendiente (Rojo)"
        className={`flex-1 min-h-[28px] text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center transition-all duration-150 cursor-pointer ${
          isRed
            ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.3),0_0_12px_rgba(239,68,68,0.7)]'
            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-red-500'
        }`}
      >
        <span className="drop-shadow-xs">PEND</span>
      </button>

      {/* 2. AMARILLO - Centro: En progreso */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          nativeService.hapticImpact('light');
          onChangeStatus('en_progreso');
        }}
        title="Marcar En Progreso (Amarillo)"
        className={`flex-1 min-h-[28px] text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center transition-all duration-150 cursor-pointer ${
          isYellow
            ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-[inset_0_0_10px_rgba(255,255,255,0.4),0_0_12px_rgba(245,158,11,0.7)]'
            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-amber-600'
        }`}
      >
        <span className="drop-shadow-xs">PROG</span>
      </button>

      {/* 3. VERDE - Abajo: Completada */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          nativeService.hapticImpact('heavy');
          onChangeStatus('completado');
        }}
        title="Completar Tarea (Verde)"
        className={`flex-1 min-h-[28px] text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center transition-all duration-150 cursor-pointer ${
          isGreen
            ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.3),0_0_12px_rgba(16,185,129,0.7)]'
            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-400 hover:text-emerald-600'
        }`}
      >
        <span className="drop-shadow-xs">LISTO</span>
      </button>
    </div>
  );
};
