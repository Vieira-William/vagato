import { format, parseISO, isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Tipos de Evento e Cores ─────────────────────────────────────────────────
const EVENT_TYPES = {
  interview: {
    regex: /interview|entrevista|technical.*screen|behavioral|hiring|recruiter/i,
    color: '#4F46E5', label: 'Entrevista',
  },
  meeting: {
    regex: /meeting|reunião|reuniao|call|sync|1:1|standup|daily|one.on.one/i,
    color: '#8B5CF6', label: 'Reunião',
  },
  deadline: {
    regex: /deadline|prazo|entrega|due|vencimento/i,
    color: '#EF4444', label: 'Prazo',
  },
  block: {
    regex: /almoço|almoco|lunch|gym|academia|médico|medico|dentista|pessoal|personal/i,
    color: '#6B7280', label: 'Bloqueio',
  },
  personal: {
    regex: /review|portfólio|portfolio|estud|curso|prep|focus|foco/i,
    color: '#10B981', label: 'Pessoal',
  },
};

export function classifyEvent(title) {
  for (const [type, config] of Object.entries(EVENT_TYPES)) {
    if (config.regex.test(title)) return { type, color: config.color, label: config.label };
  }
  return { type: 'generic', color: '#F59E0B', label: 'Evento' };
}

// ─── Posicionamento na Timeline ──────────────────────────────────────────────
export function getTimePosition(dateString, startHour = 8, endHour = 18) {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  const hours = date.getHours() + date.getMinutes() / 60;
  const totalHours = endHour - startHour;
  return Math.max(0, Math.min(100, ((hours - startHour) / totalHours) * 100));
}

export function getEventHeight(start, end, startHour = 8, endHour = 18) {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  const durationMinutes = differenceInMinutes(endDate, startDate);
  const totalMinutes = (endHour - startHour) * 60;
  return Math.max(3, (durationMinutes / totalMinutes) * 100);
}

// ─── Agrupamento por Dia ─────────────────────────────────────────────────────
export function groupEventsByDay(events) {
  const grouped = {};
  events.forEach(event => {
    const dayKey = format(parseISO(event.start), 'yyyy-MM-dd');
    if (!grouped[dayKey]) grouped[dayKey] = [];
    grouped[dayKey].push(event);
  });
  return grouped;
}

export function getDayLabel(dateStr) {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  const dayName = format(date, 'EEE', { locale: ptBR }).toUpperCase();
  const dayNum = format(date, 'd');
  return `${dayName} ${dayNum}`;
}

export function getDayLabelFull(dateStr) {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

// ─── Detecção de Sobreposições ───────────────────────────────────────────────
export function detectOverlaps(events) {
  if (!events.length) return events.map(e => ({ ...e, overlapIndex: 0, overlapCount: 1 }));

  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
  const result = sorted.map(e => ({ ...e, overlapIndex: 0, overlapCount: 1 }));

  for (let i = 0; i < result.length; i++) {
    const overlapping = [i];
    for (let j = i + 1; j < result.length; j++) {
      const iEnd = new Date(result[i].end);
      const jStart = new Date(result[j].start);
      if (jStart < iEnd) {
        overlapping.push(j);
      }
    }
    if (overlapping.length > 1) {
      overlapping.forEach((idx, pos) => {
        result[idx].overlapCount = Math.max(result[idx].overlapCount, overlapping.length);
        result[idx].overlapIndex = Math.max(result[idx].overlapIndex, pos);
      });
    }
  }

  return result;
}

// ─── Helpers de formato ──────────────────────────────────────────────────────
export function formatEventTime(dateStr) {
  return format(parseISO(dateStr), 'HH:mm');
}

export function formatEventRange(start, end) {
  return `${format(parseISO(start), 'HH:mm')} – ${format(parseISO(end), 'HH:mm')}`;
}

export function formatEventDate(dateStr) {
  return format(parseISO(dateStr), "EEE, d 'de' MMM", { locale: ptBR });
}

export function isAllDayEvent(event) {
  return !event.start?.includes('T');
}

// ─── Posicionamento Horizontal (Gantt-style) ────────────────────────────────
export function getHorizontalPosition(dateString, startHour = 8, endHour = 18) {
  return getTimePosition(dateString, startHour, endHour);
}

export function getEventWidth(start, end, startHour = 8, endHour = 18) {
  return getEventHeight(start, end, startHour, endHour);
}

// ─── Próximo Evento ──────────────────────────────────────────────────────────
export function getNextEvent(events) {
  const now = new Date();
  const upcoming = events
    .filter(e => {
      if (isAllDayEvent(e)) return false;
      try { return parseISO(e.start) > now; } catch { return false; }
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  return upcoming[0] || null;
}

export function getMinutesUntil(dateStr) {
  const diff = differenceInMinutes(parseISO(dateStr), new Date());
  if (diff < 1) return 'agora';
  if (diff < 60) return `em ${diff}min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `em ${h}h${m}min` : `em ${h}h`;
}
