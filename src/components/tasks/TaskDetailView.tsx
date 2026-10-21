import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Folder,
  Trash2,
  CheckCircle2,
  Circle,
  Plus,
  Camera,
  Image as ImageIcon,
  X,
  FileText,
  ListChecks,
  AlertCircle,
  Maximize2,
  Edit2,
  Check,
} from 'lucide-react';
import { Task, TaskChecklistItem, TaskAttachment, TaskPriority, TaskStatus } from '../../types';
import { useProjectContext } from '../../context/ProjectContext';
import { soundEffects } from '../../utils/soundEffects';
import { nativeService } from '../../services/nativeService';

interface TaskDetailViewProps {
  task: Task & { projectName: string };
  onBack: () => void;
}

/**
 * Helper to compress images on the client before saving as Base64 to LocalStorage.
 * Keeps image quality high while reducing size to < 200KB per photo.
 */
function compressImage(file: File, maxDimension = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, onBack }) => {
  const { updateTaskFull, updateTaskStatus, deleteTask, projects } = useProjectContext();

  // Local state initialized with task data
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'media');
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [dueTime, setDueTime] = useState(task.dueTime || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [notes, setNotes] = useState(task.notes || '');
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(task.checklist || []);
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);

  // New checklist item input
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');

  // Modals & Camera state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Sync back to context whenever key values change
  const saveTaskUpdates = (overrides?: Partial<Task>) => {
    setIsSaving(true);
    const updatedData: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      status,
      notes: notes.trim() || undefined,
      checklist,
      attachments,
      ...overrides,
    };

    updateTaskFull(task.projectId, task.id, updatedData);
    setTimeout(() => setIsSaving(false), 400);
  };

  const handleBack = () => {
    saveTaskUpdates({
      title: title.trim(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      checklist,
      attachments,
      priority,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      status,
    });
    onBack();
  };

  // Status Change with celebration, chime and native haptics
  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    if (newStatus === 'completado' && status !== 'completado') {
      soundEffects.playTaskCompletedChime();
      nativeService.hapticImpact('heavy');
    } else {
      nativeService.hapticImpact('light');
    }
    updateTaskStatus(task.projectId, task.id, newStatus);
  };

  // --- Checklist Management ---
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    const newItem: TaskChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newChecklistTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const nextList = [...checklist, newItem];
    setChecklist(nextList);
    setNewChecklistTitle('');
    saveTaskUpdates({ checklist: nextList });
  };

  const handleToggleChecklistItem = (itemId: string) => {
    const nextList = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(nextList);
    saveTaskUpdates({ checklist: nextList });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    const nextList = checklist.filter((item) => item.id !== itemId);
    setChecklist(nextList);
    saveTaskUpdates({ checklist: nextList });
  };

  const handleSaveChecklistEdit = (itemId: string) => {
    if (!editingChecklistText.trim()) return;
    const nextList = checklist.map((item) =>
      item.id === itemId ? { ...item, title: editingChecklistText.trim() } : item
    );
    setChecklist(nextList);
    setEditingChecklistId(null);
    setEditingChecklistText('');
    saveTaskUpdates({ checklist: nextList });
  };

  // --- Attachment Management ---
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const dataUrl = await compressImage(file);
      const newAttachment: TaskAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name || `Foto ${new Date().toLocaleTimeString()}`,
        dataUrl,
        createdAt: new Date().toISOString(),
        source: 'upload',
      };

      const nextAttachments = [newAttachment, ...attachments];
      setAttachments(nextAttachments);
      saveTaskUpdates({ attachments: nextAttachments });
    } catch (err) {
      console.warn('Error reading image file:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Mobile native camera capture input
  const handleNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const dataUrl = await compressImage(file);
      const newAttachment: TaskAttachment = {
        id: `att-cam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: `Foto ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        dataUrl,
        createdAt: new Date().toISOString(),
        source: 'camera',
      };

      const nextAttachments = [newAttachment, ...attachments];
      setAttachments(nextAttachments);
      saveTaskUpdates({ attachments: nextAttachments });
    } catch (err) {
      console.warn('Error saving camera capture:', err);
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Native or Web Pick Photo handler
  const handlePickPhoto = async () => {
    if (nativeService.isNative()) {
      try {
        const dataUrl = await nativeService.pickNativePhoto();
        if (dataUrl) {
          const newAttachment: TaskAttachment = {
            id: `att-img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: `Foto ${new Date().toLocaleTimeString()}`,
            dataUrl,
            createdAt: new Date().toISOString(),
            source: 'upload',
          };
          const nextAttachments = [newAttachment, ...attachments];
          setAttachments(nextAttachments);
          saveTaskUpdates({ attachments: nextAttachments });
          nativeService.hapticImpact('light');
        }
      } catch (err) {
        console.warn('Native pick photo error:', err);
      }
      return;
    }
    fileInputRef.current?.click();
  };

  // Native or Web Take Photo handler
  const handleTakePhoto = async () => {
    if (nativeService.isNative()) {
      try {
        const dataUrl = await nativeService.takeNativePhoto();
        if (dataUrl) {
          const newAttachment: TaskAttachment = {
            id: `att-cam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: `Foto ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            dataUrl,
            createdAt: new Date().toISOString(),
            source: 'camera',
          };
          const nextAttachments = [newAttachment, ...attachments];
          setAttachments(nextAttachments);
          saveTaskUpdates({ attachments: nextAttachments });
          nativeService.hapticImpact('medium');
        }
      } catch (err) {
        console.warn('Native take photo error:', err);
      }
      return;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && cameraInputRef.current) {
      cameraInputRef.current.click();
    } else {
      startWebRtcCamera();
    }
  };

  // Schedule native notification when due date/time is set
  const scheduleNotificationIfDue = (dueDateVal: string, dueTimeVal?: string) => {
    if (!nativeService.isNative() || !dueDateVal) return;
    try {
      const timeVal = dueTimeVal || '09:00';
      const scheduledDate = new Date(`${dueDateVal}T${timeVal}:00`);
      if (scheduledDate.getTime() > Date.now()) {
        const notifId = Math.abs(task.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100000);
        nativeService.scheduleTaskNotification({
          id: notifId,
          title: title || task.title,
          body: `Recordatorio de tarea: "${title || task.title}"`,
          scheduledAt: scheduledDate,
        });
      }
    } catch (e) {
      console.warn('Error scheduling notification', e);
    }
  };

  // WebRTC Camera Modal for desktop or browser fallback
  const startWebRtcCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta captura de cámara directa.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('[Camera error]:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes del navegador.'
          : 'No se pudo acceder a la cámara del dispositivo.'
      );
    }
  };

  const stopWebRtcCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const capturePhotoFromWebRtc = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    const newAttachment: TaskAttachment = {
      id: `att-cam-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `Foto ${new Date().toLocaleTimeString()}`,
      dataUrl,
      createdAt: new Date().toISOString(),
      source: 'camera',
    };

    const nextAttachments = [newAttachment, ...attachments];
    setAttachments(nextAttachments);
    saveTaskUpdates({ attachments: nextAttachments });
    stopWebRtcCamera();
  };

  const handleDeleteAttachment = (id: string) => {
    const nextAttachments = attachments.filter((att) => att.id !== id);
    setAttachments(nextAttachments);
    saveTaskUpdates({ attachments: nextAttachments });
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Compute checklist stats
  const totalChecklist = checklist.length;
  const completedChecklist = checklist.filter((c) => c.completed).length;
  const progressPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const currentProject = projects.find((p) => p.id === task.projectId);

  return (
    <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 py-2 space-y-5 animate-in fade-in duration-200">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Regresar a la lista de tareas"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Tareas</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
              <Folder className="w-3.5 h-3.5 text-blue-500" />
              <span>{currentProject?.name || task.projectName}</span>
            </span>

            {isSaving && (
              <span className="text-[11px] text-zinc-400 font-medium animate-pulse">
                Guardando cambios...
              </span>
            )}
          </div>
        </div>

        {/* 3-State Illuminated Buttons right in the header bar */}
        <div className="flex items-center gap-1 self-end sm:self-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          <button
            onClick={() => handleStatusChange('pendiente')}
            className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              status === 'pendiente'
                ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                : 'text-zinc-500 hover:text-red-500 hover:bg-zinc-200/60'
            }`}
          >
            Pendiente
          </button>
          <button
            onClick={() => handleStatusChange('en_progreso')}
            className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              status === 'en_progreso'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                : 'text-zinc-500 hover:text-amber-600 hover:bg-zinc-200/60'
            }`}
          >
            En Progreso
          </button>
          <button
            onClick={() => handleStatusChange('completado')}
            className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              status === 'completado'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                : 'text-zinc-500 hover:text-emerald-600 hover:bg-zinc-200/60'
            }`}
          >
            Completada
          </button>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-4 sm:p-6 space-y-6">
        {/* Title & Priority Section */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Título de la Tarea
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveTaskUpdates()}
                placeholder="Escribe el título de la tarea..."
                className="w-full text-base sm:text-lg font-bold text-zinc-900 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-blue-500 focus:outline-hidden pb-1 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 self-start">
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-zinc-400 font-medium">Prioridad:</span>
                <select
                  value={priority}
                  onChange={(e) => {
                    const p = e.target.value as TaskPriority;
                    setPriority(p);
                    saveTaskUpdates({ priority: p });
                  }}
                  className="bg-transparent font-semibold text-zinc-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time Picker */}
          <div className="flex items-center gap-4 flex-wrap pt-1 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  saveTaskUpdates({ dueDate: e.target.value });
                  scheduleNotificationIfDue(e.target.value, dueTime);
                }}
                className="bg-transparent text-xs text-zinc-800 focus:outline-hidden cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => {
                  setDueTime(e.target.value);
                  saveTaskUpdates({ dueTime: e.target.value });
                  scheduleNotificationIfDue(dueDate, e.target.value);
                }}
                className="bg-transparent text-xs text-zinc-800 focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Description */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Descripción general
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => saveTaskUpdates()}
              rows={2}
              placeholder="Añade una descripción o contexto general para esta tarea..."
              className="w-full bg-zinc-50/70 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-800 focus:outline-hidden focus:border-zinc-400 focus:bg-white resize-none transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* SECTION: Checklist Interno */}
        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Checklist Interno
              </h3>
            </div>
            {totalChecklist > 0 && (
              <span className="text-[11px] font-mono font-semibold text-zinc-500">
                {completedChecklist} de {totalChecklist} ({progressPercent}%)
              </span>
            )}
          </div>

          {/* Progress bar */}
          {totalChecklist > 0 && (
            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Checklist items list */}
          <div className="space-y-1.5">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between gap-2.5 p-2 rounded-xl bg-zinc-50/80 hover:bg-zinc-100/70 border border-zinc-200/70 transition-colors"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className="text-zinc-400 hover:text-emerald-600 transition-colors shrink-0"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  {editingChecklistId === item.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingChecklistText}
                        onChange={(e) => setEditingChecklistText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveChecklistEdit(item.id);
                        }}
                        autoFocus
                        className="flex-1 bg-white border border-blue-400 rounded-lg px-2 py-0.5 text-xs text-zinc-900 focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleSaveChecklistEdit(item.id)}
                        className="p-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`text-xs cursor-pointer select-none truncate ${
                        item.completed ? 'line-through text-zinc-400' : 'text-zinc-800 font-medium'
                      }`}
                    >
                      {item.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingChecklistId(item.id);
                      setEditingChecklistText(item.title);
                    }}
                    className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                    title="Editar elemento"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="p-1 text-zinc-400 hover:text-red-600 rounded"
                    title="Eliminar elemento"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add item form */}
          <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              placeholder="Añadir un elemento al checklist..."
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-400 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!newChecklistTitle.trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold disabled:opacity-40 transition-colors shrink-0 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </form>
        </div>

        {/* SECTION: Notas Internas */}
        <div className="pt-4 border-t border-zinc-100 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Notas Internas
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400">
            Espacio de texto libre específico de esta tarea. Todo lo que escribas se guarda automáticamente.
          </p>
          <textarea
            value={notes}
            onChange={(e) => {
              const val = e.target.value;
              setNotes(val);
              saveTaskUpdates({ notes: val });
            }}
            onBlur={() => saveTaskUpdates()}
            rows={5}
            placeholder="Escribe notas detalladas, acuerdos, números de referencia o borradores aquí..."
            className="w-full bg-zinc-50/70 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-800 focus:outline-hidden focus:border-zinc-400 focus:bg-white resize-y font-mono leading-relaxed transition-all"
          />
        </div>

        {/* SECTION: Imágenes y Fotografías */}
        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Imágenes y Fotografías ({attachments.length})
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Adjunta fotos del dispositivo o captura directamente con la cámara.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Native file upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={handlePickPhoto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:scale-[1.02]"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Adjuntar Imagen</span>
              </button>

              {/* Mobile direct camera capture input */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNativeCameraCapture}
                className="hidden"
              />

              {/* Take Photo button (handles native mobile capture and desktop WebRTC) */}
              <button
                type="button"
                onClick={handleTakePhoto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02]"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tomar Foto</span>
              </button>
            </div>
          </div>

          {/* Attachments Grid */}
          {attachments.length === 0 ? (
            <div className="border border-dashed border-zinc-200 rounded-xl p-6 text-center bg-zinc-50/40">
              <Camera className="w-6 h-6 text-zinc-400 mx-auto mb-1.5 opacity-60" />
              <p className="text-xs font-medium text-zinc-600">No hay fotos adjuntas a esta tarea</p>
              <p className="text-[11px] text-zinc-400">
                Puedes subir recibos, bocetos, fotos del trabajo o capturas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="group relative bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 aspect-square shadow-2xs"
                >
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                    onClick={() => setPreviewImage(att.dataUrl)}
                  />

                  {/* Overlay controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1 rounded-md bg-black/60 text-white hover:bg-red-600 transition-colors"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-white text-[10px]">
                      <span className="truncate max-w-[80%] font-medium">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setPreviewImage(att.dataUrl)}
                        className="p-1 hover:text-blue-300"
                        title="Ver en grande"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Task Action */}
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`¿Estás seguro de eliminar la tarea "${task.title}"?`)) {
                deleteTask(task.projectId, task.id);
                onBack();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Tarea</span>
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-1.5 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 shadow-2xs"
          >
            Listo / Volver
          </button>
        </div>
      </div>

      {/* Lightbox / Modal de Previsualización de Imagen */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Detalle"
              className="max-w-full max-h-[80vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* WebRTC Live Camera Capture Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-white border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Cámara en Vivo</h3>
              </div>
              <button onClick={stopWebRtcCamera} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Aviso de Cámara</p>
                  <p className="mt-0.5">{cameraError}</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={stopWebRtcCamera}
                className="px-3 py-1.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhotoFromWebRtc}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capturar Foto</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
