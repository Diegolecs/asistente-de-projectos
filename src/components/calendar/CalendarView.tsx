import React, { useState, useMemo } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { CalendarEvent, EventStatus } from '../../types';
import { calendarService } from '../../services/calendarService';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Folder,
  Trash2,
  Edit2,
  ExternalLink,
  Download,
  CheckCircle2,
  Sparkles,
  X,
  CalendarDays,
  CalendarRange,
  List,
  RefreshCw,
} from 'lucide-react';

type CalendarSubView = 'day' | 'week' | 'month' | 'list';

export const CalendarView: React.FC = () => {
  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    projects,
    navigateToProject,
    setCurrentView,
    isGoogleCalendarConnected,
    googleCalendarUser,
    isSyncingCalendar,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncGoogleCalendar,
  } = useProjectContext();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarSubView>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isConnectingGCal, setIsConnectingGCal] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('16:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [newStatus, setNewStatus] = useState<EventStatus>('confirmado');

  // Helpers for date calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Navigate dates
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid calculation
  const monthDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateString = prevDate.toISOString().split('T')[0];
      days.push({
        dateString,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const currentMonthDate = new Date(year, month, d);
      const dateString = currentMonthDate.toISOString().split('T')[0];
      days.push({
        dateString,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
      });
    }

    // Next month padding to reach 35 or 42 grid cells
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateString = nextDate.toISOString().split('T')[0];
      days.push({
        dateString,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
      });
    }

    return days;
  }, [year, month]);

  // Week days calculation
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day); // Sunday start

    const todayStr = new Date().toISOString().split('T')[0];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      days.push({
        dateString,
        dayNumber: d.getDate(),
        dayName: dayNames[i],
        isToday: dateString === todayStr,
      });
    }
    return days;
  }, [currentDate]);

  // Events map by date string
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((evt) => {
      const existing = map.get(evt.date) || [];
      existing.push(evt);
      map.set(evt.date, existing);
    });
    return map;
  }, [events]);

  // All events sorted chronologically for list view
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date);
      if (dateComp !== 0) return dateComp;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [events]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate || !newStartTime) return;

    const proj = projects.find((p) => p.id === newProjectId);

    addEvent({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime || '17:00',
      location: newLocation.trim() || undefined,
      status: newStatus,
      projectId: proj?.id,
      projectName: proj?.name,
    });

    setNewTitle('');
    setNewLocation('');
    setNewDescription('');
    setNewProjectId('');
    setIsCreateModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editingEvent.title.trim()) return;

    const proj = projects.find((p) => p.id === editingEvent.projectId);

    updateEvent(editingEvent.id, {
      title: editingEvent.title.trim(),
      description: editingEvent.description?.trim(),
      date: editingEvent.date,
      startTime: editingEvent.startTime,
      endTime: editingEvent.endTime,
      location: editingEvent.location?.trim(),
      status: editingEvent.status,
      projectId: proj?.id,
      projectName: proj?.name,
    });

    setEditingEvent(null);
  };

  const handleExportGoogle = (event: CalendarEvent) => {
    const url = calendarService.generateGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadIcs = (event: CalendarEvent) => {
    calendarService.downloadIcsFile(event);
  };

  const handleConnectGoogle = async () => {
    setIsConnectingGCal(true);
    setSyncMessage(null);
    try {
      await connectGoogleCalendar();
      setSyncMessage('Google Calendar conectado exitosamente. Eventos sincronizados.');
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      setSyncMessage(`No se pudo conectar Google Calendar: ${err.message || err}`);
      setTimeout(() => setSyncMessage(null), 6000);
    } finally {
      setIsConnectingGCal(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncMessage(null);
    try {
      const stats = await syncGoogleCalendar();
      setSyncMessage(
        `Sincronización completada: ${stats.imported} importados, ${stats.updated} actualizados, ${stats.uploaded} enviados a Google Calendar.`
      );
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      setSyncMessage(`Error en la sincronización: ${err.message || err}`);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  const handleDeleteWithConfirmation = (event: CalendarEvent) => {
    if (event.externalId && isGoogleCalendarConnected) {
      const confirmed = window.confirm(
        `¿Eliminar el evento "${event.title}" de Project OS y de tu Google Calendar?`
      );
      if (!confirmed) return;
    }
    deleteEvent(event.id);
    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null);
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'confirmado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            <CheckCircle2 className="w-3 h-3" /> Confirmado
          </span>
        );
      case 'tentativo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40">
            <Clock className="w-3 h-3" /> Tentativo
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/40">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-400" />
            Calendario
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Agenda interna de eventos, llamadas y reuniones con sincronización y exportación a Google Calendar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('general-chat')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Agendar con la IA
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </button>
        </div>
      </div>

      {/* Google Calendar Synchronization Panel */}
      <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-zinc-900/40 border border-blue-900/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M19.5 4H18V2h-2v2H8V2H6v2H4.5C3.12 4 2 5.12 2 6.5v13C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 5.12 20.88 4 19.5 4z" />
              <path fill="#FFF" d="M4 9h16v10.5c0 .28-.22.5-.5.5h-15c-.28 0-.5-.22-.5-.5V9z" />
              <path fill="#EA4335" d="M9 14h2v2H9z" />
              <path fill="#FBBC05" d="M13 14h2v2h-2z" />
              <path fill="#34A853" d="M9 17h6v2H9z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-zinc-100">
                Sincronización Bidireccional con Google Calendar
              </h3>
              {isGoogleCalendarConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400">
                  Desconectado
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isGoogleCalendarConnected
                ? `Conectado como ${googleCalendarUser?.email || 'cuenta autorizada'}. Mantiene tus eventos de Project OS y Google Calendar sincronizados.`
                : 'Conecta tu cuenta para leer eventos existentes e intercambiar cambios bidireccionalmente sin duplicados.'}
            </p>
            {syncMessage && (
              <p className="text-xs text-blue-300 mt-1 font-medium animate-in fade-in">
                {syncMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {isGoogleCalendarConnected ? (
            <>
              <button
                onClick={handleSyncNow}
                disabled={isSyncingCalendar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                <span>{isSyncingCalendar ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
              </button>
              <button
                onClick={disconnectGoogleCalendar}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition"
              >
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={handleConnectGoogle}
              disabled={isConnectingGCal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isConnectingGCal ? 'Conectando...' : 'Conectar Google Calendar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation and View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
          >
            Hoy
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm font-semibold text-zinc-200 ml-2">
            {monthNames[month]} {year}
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Mes
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Semana
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'day'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Día
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </button>
        </div>
      </div>

      {/* VIEW: MONTH */}
      {viewMode === 'month' && (
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/60 shadow-lg">
          {/* Day names row */}
          <div className="grid grid-cols-7 border-b border-zinc-800/80 bg-zinc-900/60 text-center py-2.5">
            {dayNames.map((name) => (
              <span key={name} className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {name}
              </span>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-800/60">
            {monthDays.map((cell, idx) => {
              const dayEvents = eventsByDate.get(cell.dateString) || [];
              return (
                <div
                  key={idx}
                  className={`min-h-[105px] p-2 transition-colors ${
                    cell.isCurrentMonth ? 'bg-zinc-950/30' : 'bg-zinc-950/80 opacity-40'
                  } ${cell.isToday ? 'ring-1 ring-inset ring-blue-500/50 bg-blue-950/10' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        cell.isToday
                          ? 'bg-blue-600 text-white font-bold'
                          : cell.isCurrentMonth
                          ? 'text-zinc-300'
                          : 'text-zinc-600'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {dayEvents.length} ev
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="w-full text-left px-1.5 py-0.5 rounded bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/40 text-blue-200 text-[11px] truncate block transition-all"
                      >
                        <span className="font-mono text-[10px] text-blue-400 mr-1">
                          {evt.startTime}
                        </span>
                        {evt.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => {
                          setCurrentDate(new Date(cell.dateString));
                          setViewMode('day');
                        }}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 block px-1"
                      >
                        +{dayEvents.length - 3} más...
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: WEEK */}
      {viewMode === 'week' && (
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/60 shadow-lg">
          <div className="grid grid-cols-7 border-b border-zinc-800/80 bg-zinc-900/60 text-center py-2.5">
            {weekDays.map((d) => (
              <div key={d.dateString} className="px-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  {d.dayName}
                </span>
                <span
                  className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full ${
                    d.isToday ? 'bg-blue-600 text-white font-bold' : 'text-zinc-300'
                  }`}
                >
                  {d.dayNumber}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-zinc-800/60 min-h-[350px]">
            {weekDays.map((d) => {
              const dayEvents = eventsByDate.get(d.dateString) || [];
              return (
                <div
                  key={d.dateString}
                  className={`p-2.5 space-y-2 ${d.isToday ? 'bg-blue-950/10' : 'bg-zinc-950/30'}`}
                >
                  {dayEvents.length === 0 ? (
                    <span className="text-[11px] text-zinc-600 block text-center pt-8">Sin eventos</span>
                  ) : (
                    dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-blue-700/60 cursor-pointer transition-all shadow-sm group"
                      >
                        <span className="text-[10px] font-mono text-blue-400 block">
                          {evt.startTime} - {evt.endTime}
                        </span>
                        <h4 className="text-xs font-medium text-zinc-200 mt-0.5 line-clamp-2">
                          {evt.title}
                        </h4>
                        {evt.location && (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-1 truncate">
                            <MapPin className="w-2.5 h-2.5" /> {evt.location}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: DAY */}
      {viewMode === 'day' && (
        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {currentDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <span className="text-xs text-zinc-400">
                {(eventsByDate.get(currentDate.toISOString().split('T')[0]) || []).length} eventos agendados para este día
              </span>
            </div>
            <button
              onClick={() => {
                setNewDate(currentDate.toISOString().split('T')[0]);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar en este día
            </button>
          </div>

          <div className="space-y-3">
            {(eventsByDate.get(currentDate.toISOString().split('T')[0]) || []).length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No hay eventos para esta fecha.</p>
              </div>
            ) : (
              (eventsByDate.get(currentDate.toISOString().split('T')[0]) || []).map((evt) => (
                <div
                  key={evt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-400 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/40">
                        {evt.startTime} - {evt.endTime}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-100">{evt.title}</h3>
                      {getStatusBadge(evt.status)}
                    </div>
                    {evt.description && (
                      <p className="text-xs text-zinc-400">{evt.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 pt-1">
                      {evt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" /> {evt.location}
                        </span>
                      )}
                      {evt.projectName && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Folder className="w-3 h-3" /> {evt.projectName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0">
                    {evt.externalId ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/60 text-[11px] font-semibold"
                        title="Sincronizado con Google Calendar"
                      >
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        Google Calendar
                      </span>
                    ) : (
                      <button
                        onClick={() => handleExportGoogle(evt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
                        title="Agregar a Google Calendar"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        Google Calendar
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadIcs(evt)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Descargar archivo .ics"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingEvent(evt)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Editar evento"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWithConfirmation(evt)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW: LIST */}
      {viewMode === 'list' && (
        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-base font-bold text-zinc-100">Todos los Eventos Agendados</h2>
            <span className="text-xs text-zinc-400">{sortedEvents.length} eventos en total</span>
          </div>

          <div className="space-y-2">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                <CalendarIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No hay eventos agendados en el calendario.</p>
              </div>
            ) : (
              sortedEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                        {evt.date}
                      </span>
                      <span className="text-xs font-mono text-blue-400 bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded">
                        {evt.startTime} - {evt.endTime}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-100">{evt.title}</h3>
                      {getStatusBadge(evt.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-0.5">
                      {evt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-500" /> {evt.location}
                        </span>
                      )}
                      {evt.projectName && (
                        <button
                          onClick={() => evt.projectId && navigateToProject(evt.projectId)}
                          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          <Folder className="w-3 h-3 text-zinc-500" /> {evt.projectName}
                        </button>
                      )}
                      {evt.description && (
                        <span className="text-zinc-500 truncate max-w-md">{evt.description}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {evt.externalId ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/60 text-[11px] font-semibold"
                        title="Sincronizado con Google Calendar"
                      >
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        Google Calendar
                      </span>
                    ) : (
                      <button
                        onClick={() => handleExportGoogle(evt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
                        title="Agregar a Google Calendar"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        Google Calendar
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadIcs(evt)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Descargar archivo .ics"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingEvent(evt)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Editar evento"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWithConfirmation(evt)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle Evento Seleccionado */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-zinc-100">{selectedEvent.title}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span>
                  {selectedEvent.date} de {selectedEvent.startTime} a {selectedEvent.endTime}
                </span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.projectName && (
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-zinc-500" />
                  <span>Proyecto: {selectedEvent.projectName}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-zinc-500">Estado:</span>
                {getStatusBadge(selectedEvent.status)}
                {selectedEvent.externalId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/60 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" /> Sincronizado con Google Calendar
                  </span>
                )}
              </div>

              {selectedEvent.description && (
                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-zinc-500 block mb-1 font-medium">Notas:</span>
                  <p className="text-zinc-300 leading-relaxed bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                onClick={() => handleDeleteWithConfirmation(selectedEvent)}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadIcs(selectedEvent)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> .ics
                </button>
                {!selectedEvent.externalId && (
                  <button
                    onClick={() => handleExportGoogle(selectedEvent)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Agregar a Google Calendar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Evento */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                Nuevo Evento en Calendario
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Título del evento / reunión *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Reunión con Juan, Llamada con cliente"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Hora inicio *
                  </label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Hora fin</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Google Meet, Oficina..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Estado</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as EventStatus)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    <option value="confirmado" className="bg-zinc-900 text-zinc-200">
                      Confirmado
                    </option>
                    <option value="tentativo" className="bg-zinc-900 text-zinc-200">
                      Tentativo
                    </option>
                    <option value="cancelado" className="bg-zinc-900 text-zinc-200">
                      Cancelado
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Proyecto relacionado (opcional)
                </label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
                >
                  <option value="" className="bg-zinc-900 text-zinc-200">
                    Ninguno (evento global)
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Descripción o notas
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Puntos a tratar, agenda..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
                >
                  Crear Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Evento */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                Editar Evento
              </h2>
              <button
                onClick={() => setEditingEvent(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={editingEvent.date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Hora inicio</label>
                  <input
                    type="time"
                    required
                    value={editingEvent.startTime}
                    onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Hora fin</label>
                  <input
                    type="time"
                    value={editingEvent.endTime}
                    onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={editingEvent.location || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Estado</label>
                  <select
                    value={editingEvent.status}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, status: e.target.value as EventStatus })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    <option value="confirmado" className="bg-zinc-900 text-zinc-200">
                      Confirmado
                    </option>
                    <option value="tentativo" className="bg-zinc-900 text-zinc-200">
                      Tentativo
                    </option>
                    <option value="cancelado" className="bg-zinc-900 text-zinc-200">
                      Cancelado
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Proyecto relacionado
                </label>
                <select
                  value={editingEvent.projectId || ''}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      projectId: e.target.value || undefined,
                      projectName: projects.find((p) => p.id === e.target.value)?.name,
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 cursor-pointer"
                >
                  <option value="" className="bg-zinc-900 text-zinc-200">
                    Ninguno
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Notas</label>
                <textarea
                  rows={2}
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
