import React, { useState } from 'react';
import {
  RotateCcw,
  Trash2,
  Database,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useProjectContext } from '../../context/ProjectContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const SettingsView: React.FC = () => {
  const { projects, resetToDemo, clearAllData, stats, aiStatus } = useProjectContext();
  const { isInstalled } = usePWAInstall();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const totalTasks = projects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
  const totalMilestones = projects.reduce((acc, p) => acc + (p.milestones?.length || 0), 0);
  const totalDecisions = projects.reduce((acc, p) => acc + (p.decisions?.length || 0), 0);

  const handleClearAll = () => {
    clearAllData();
    setShowClearConfirm(false);
    setStatusMessage('Todos los datos locales han sido eliminados correctamente.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleResetDemo = () => {
    resetToDemo();
    setShowResetConfirm(false);
    setStatusMessage('Se han restaurado los datos de demostración con éxito.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200/70">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          Configuración
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Ajustes del sistema y gestión del almacenamiento local de Project OS.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* App Identity Card */}
      <section className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-xs">
            <Layers className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-950">Project OS</h2>
            <p className="text-xs text-zinc-600">
              Sistema Personal de Gestión de Proyectos, Productos y Negocios
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-100 text-xs">
          <div className="p-3 bg-zinc-50 rounded-xl">
            <span className="text-zinc-600 block mb-1">Versión actual</span>
            <span className="font-semibold text-zinc-900">v1.0.0 (Fase 1)</span>
          </div>
          <div className="p-3 bg-zinc-50 rounded-xl">
            <span className="text-zinc-600 block mb-1">Almacenamiento</span>
            <span className="font-semibold text-zinc-900">LocalStorage Centralizado</span>
          </div>
          <div className="p-3 bg-zinc-50 rounded-xl">
            <span className="text-zinc-600 block mb-1">Modo PWA</span>
            <span className="font-semibold text-zinc-900">
              {isInstalled ? 'Instalado como app' : 'Disponible para instalar'}
            </span>
          </div>
        </div>
      </section>

      {/* AI Architecture & Engine Status */}
      <section className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-zinc-900">Arquitectura de Inteligencia Artificial</h2>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            Fase 2 · AI-First
          </span>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          Project OS desacopla la interfaz de usuario del proveedor de IA siguiendo el patrón:
          <code className="mx-1 px-1.5 py-0.5 rounded bg-zinc-100 font-mono text-[11px] text-zinc-800 border border-zinc-200">
            Application UI → AIService → AIProvider
          </code>
          Todas las llamadas a modelos externos se realizan de forma segura en el backend (`/api/chat`), manteniendo las claves protegidas y permitiendo conmutar entre Gemini y el motor local sin modificar la vista.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1">
            <span className="text-zinc-500 font-medium block">Proveedor Activo</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-zinc-900">
                {aiStatus.hasGeminiKey ? 'Gemini API (@google/genai)' : 'Motor Local Inteligente'}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 block">
              Modelo: {aiStatus.model}
            </span>
          </div>

          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-1">
            <span className="text-zinc-500 font-medium block">Extracción de Memoria</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-semibold text-zinc-900">Automática en conversación</span>
            </div>
            <span className="text-[11px] text-zinc-500 block">
              Identifica decisiones, tareas, hitos y próximos pasos.
            </span>
          </div>
        </div>
      </section>

      {/* Local Storage & Data Summary */}
      <section className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-zinc-700" />
          <h2 className="text-base font-bold text-zinc-900">Resumen de Datos Locales</h2>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Tus datos se guardan directamente en el almacenamiento de este navegador. La arquitectura
          mantiene separada la capa de persistencia para permitir migración transparente a bases de
          datos remotas en fases posteriores.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 border border-zinc-200/80 rounded-xl">
            <span className="text-[11px] text-zinc-600 block">Proyectos</span>
            <span className="text-xl font-bold text-zinc-900">{stats.total}</span>
          </div>
          <div className="p-3 border border-zinc-200/80 rounded-xl">
            <span className="text-[11px] text-zinc-600 block">Tareas</span>
            <span className="text-xl font-bold text-zinc-900">{totalTasks}</span>
          </div>
          <div className="p-3 border border-zinc-200/80 rounded-xl">
            <span className="text-[11px] text-zinc-600 block">Hitos</span>
            <span className="text-xl font-bold text-zinc-900">{totalMilestones}</span>
          </div>
          <div className="p-3 border border-zinc-200/80 rounded-xl">
            <span className="text-[11px] text-zinc-600 block">Decisiones</span>
            <span className="text-xl font-bold text-zinc-900">{totalDecisions}</span>
          </div>
        </div>
      </section>

      {/* PWA Section */}
      <section className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-zinc-700" />
          <h2 className="text-base font-bold text-zinc-900">Aplicación Web Progresiva (PWA)</h2>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Instala Project OS como una aplicación nativa en Windows, Android o iOS para acceso directo
          sin barras de navegación del navegador, ejecución a pantalla completa y soporte sin conexión.
        </p>
        <div className="pt-2 max-w-xs">
          <PWAInstallButton variant="full" />
        </div>
      </section>

      {/* Data Management Operations */}
      <section className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-zinc-900">Gestión de Datos</h2>
          <p className="text-xs text-zinc-600 mt-0.5">
            Opciones para restaurar el contenido inicial o restablecer el sistema.
          </p>
        </div>

        <div className="space-y-4 pt-1">
          {/* Restore Demo Data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Restaurar datos de demostración</h3>
              <p className="text-xs text-zinc-600 mt-0.5">
                Vuelve a cargar los proyectos de ejemplo (CV Smart, Poker Trainer, Driving Trainer y Lead Finder).
              </p>
            </div>
            <button
              id="btn-restore-demo"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-800 transition shadow-2xs self-start sm:self-auto shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Demo</span>
            </button>
          </div>

          {/* Delete All Data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50/40">
            <div>
              <h3 className="text-sm font-semibold text-rose-900">Borrar todos los datos locales</h3>
              <p className="text-xs text-rose-700/80 mt-0.5">
                Elimina permanentemente todos los proyectos, hitos, tareas y actividades almacenados en este navegador.
              </p>
            </div>
            <button
              id="btn-clear-all"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-semibold transition shadow-2xs self-start sm:self-auto shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Borrar Todo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation Dialog for Clear All */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">¿Borrar todos los datos?</h3>
                <p className="text-xs text-zinc-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Se eliminarán de forma inmediata todos los {projects.length} proyectos registrados junto
              con sus hitos, decisiones, ideas y tareas en este navegador.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-all"
                onClick={handleClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Sí, borrar todos los datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Restore Demo */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">¿Restaurar datos de demostración?</h3>
                <p className="text-xs text-zinc-500">Reemplazará los proyectos existentes.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Esta acción reestablecerá los 4 proyectos de ejemplo (CV Smart, Poker Trainer, Driving
              Trainer y Lead Finder) con sus tareas e hitos modelo.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-restore-demo"
                onClick={handleResetDemo}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Sí, restaurar demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
