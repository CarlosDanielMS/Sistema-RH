import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBr from '@fullcalendar/core/locales/pt-br'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  X, Plus, Trash2, MapPin, Users, Calendar, User, Mail,
  Loader2, Clock, ChevronRight, Video,
} from 'lucide-react'
import { agendaService, EventoCreate, Evento } from '../services/agendaService'
import { candidatosService } from '../services/candidatosService'
import { useToast } from '../components/ui/Toast'

// ── Constantes ─────────────────────────────────────────────────────────────────
const TIPO_CORES: Record<string, string> = {
  entrevista: '#6366f1',
  reuniao:    '#0ea5e9',
  prazo:      '#ef4444',
  onboarding: '#10b981',
  feedback:   '#f59e0b',
  outro:      '#8b5cf6',
}

const TIPO_BG: Record<string, string> = {
  entrevista: 'bg-indigo-100 text-indigo-700',
  reuniao:    'bg-sky-100 text-sky-700',
  prazo:      'bg-red-100 text-red-700',
  onboarding: 'bg-emerald-100 text-emerald-700',
  feedback:   'bg-amber-100 text-amber-700',
  outro:      'bg-violet-100 text-violet-700',
}

const TIPO_LABELS: Record<string, string> = {
  entrevista: 'Entrevista',
  reuniao:    'Reunião',
  prazo:      'Prazo',
  onboarding: 'Onboarding',
  feedback:   'Feedback',
  outro:      'Outro',
}

type ViewMode = 'semana' | 'mes' | 'dia' | 'lista'

interface FormData extends EventoCreate {
  inicio_data: string; inicio_hora: string
  fim_data: string;   fim_hora: string
  candidato_id_str: string; enviar_email: boolean
}

const toLocal = (iso?: string) => {
  if (!iso) return { data: '', hora: '' }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

const combine = (data: string, hora: string) =>
  hora ? `${data}T${hora}:00` : `${data}T00:00:00`

const FC_VIEW: Record<ViewMode, string> = {
  semana: 'timeGridWeek',
  mes:    'dayGridMonth',
  dia:    'timeGridDay',
  lista:  'listWeek',
}

// ── Componente Lista (histórico) ───────────────────────────────────────────────
function ListaAgendamentos({ eventos, candidatos, onEditar }: {
  eventos: Evento[]; candidatos: any[]; onEditar: (e: Evento) => void
}) {
  const agora = new Date()
  const ordenados = [...eventos].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
  const proximos  = ordenados.filter(e => new Date(e.inicio) >= agora)
  const passados  = ordenados.filter(e => new Date(e.inicio) < agora).reverse()

  const renderEvento = (ev: Evento, passado = false) => {
    const cand = candidatos.find(c => c.id === ev.candidato_id)
    const ini  = new Date(ev.inicio)
    const fim  = ev.fim ? new Date(ev.fim) : null
    const durMin = fim ? Math.round((fim.getTime() - ini.getTime()) / 60000) : null
    const isLink = ev.local?.startsWith('http')

    return (
      <div
        key={ev.id}
        onClick={() => onEditar(ev)}
        className={`group flex gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
          passado ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-white border-slate-200 hover:border-primary-200'
        }`}
      >
        {/* Coluna da cor / tipo */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 w-12">
          <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: TIPO_CORES[ev.tipo] }} />
          <div className="text-center">
            <p className="text-xl font-bold text-slate-800 leading-none">
              {ini.getDate().toString().padStart(2, '0')}
            </p>
            <p className="text-xs text-slate-400 uppercase font-medium">
              {ini.toLocaleDateString('pt-BR', { month: 'short' })}
            </p>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm leading-tight">{ev.titulo}</h4>
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_BG[ev.tipo]}`}>
                {TIPO_LABELS[ev.tipo]}
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-1 justify-end">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {ev.dia_inteiro ? 'Dia inteiro' : ini.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {durMin && (
                <p className="text-xs text-slate-400">
                  {durMin >= 60 ? `${Math.floor(durMin / 60)}h${durMin % 60 > 0 ? durMin % 60 + 'min' : ''}` : `${durMin}min`}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {ev.local && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                {isLink
                  ? <><Video className="w-3 h-3 text-primary-500" /><a href={ev.local} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-primary-600 hover:underline truncate">{ev.local}</a></>
                  : <><MapPin className="w-3 h-3" /><span className="truncate">{ev.local}</span></>}
              </div>
            )}
            {cand && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <User className="w-3 h-3 text-indigo-400" />
                <span className="font-medium text-indigo-600">{cand.nome}</span>
                <span className="text-slate-400">·</span>
                <span className="truncate">{cand.email}</span>
              </div>
            )}
            {ev.participantes && !cand && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users className="w-3 h-3" />
                <span className="truncate">{ev.participantes}</span>
              </div>
            )}
            {ev.descricao && (
              <p className="text-xs text-slate-400 truncate">{ev.descricao}</p>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1 transition-colors" />
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p>Nenhum agendamento registrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {proximos.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary-500" /> Próximos ({proximos.length})
          </h3>
          <div className="space-y-2">{proximos.map(e => renderEvento(e, false))}</div>
        </div>
      )}

      {passados.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Histórico ({passados.length})
          </h3>
          <div className="space-y-2">{passados.map(e => renderEvento(e, true))}</div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export function Agenda() {
  const qc           = useQueryClient()
  const toast        = useToast()
  const calendarRef  = useRef<FullCalendar>(null)
  const [view, setView]         = useState<ViewMode>('semana')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState<Evento | null>(null)

  const { data: eventos = [] } = useQuery({
    queryKey: ['eventos'],
    queryFn: () => agendaService.listar(),
  })

  const { data: candidatos = [] } = useQuery({
    queryKey: ['candidatos'],
    queryFn: () => candidatosService.listar(),
  })

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormData>()

  const criar = useMutation({
    mutationFn: ({ payload, enviarEmail }: { payload: EventoCreate; enviarEmail: boolean }) =>
      agendaService.criar(payload, enviarEmail),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.invalidateQueries({ queryKey: ['historico'] })
      fecharModal()
      if (vars.enviarEmail && vars.payload.candidato_id) {
        toast.success('Evento criado e e-mail enviado ao candidato!')
      } else {
        toast.success('Evento criado com sucesso!')
      }
    },
    onError: (e: any) => {
      // Mesmo com erro de SMTP, o evento pode ter sido criado — invalida o cache
      qc.invalidateQueries({ queryKey: ['eventos'] })
      const msg = e?.response?.data?.detail || 'Erro ao criar evento.'
      toast.error(msg)
      fecharModal()
    },
  })

  const atualizar = useMutation({
    mutationFn: ({ id, payload, enviarEmail }: { id: number; payload: Partial<EventoCreate>; enviarEmail: boolean }) =>
      agendaService.atualizar(id, payload, enviarEmail),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.invalidateQueries({ queryKey: ['historico'] })
      fecharModal()
      toast.success('Evento atualizado!')
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      toast.error(e?.response?.data?.detail || 'Erro ao atualizar evento.')
      fecharModal()
    },
  })

  const excluir = useMutation({
    mutationFn: (id: number) => agendaService.excluir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      fecharModal()
      toast.success('Evento excluído.')
    },
    onError: () => toast.error('Erro ao excluir evento.'),
  })

  const abrirNovo = (data?: string) => {
    setEditando(null)
    const hoje = data || new Date().toISOString().split('T')[0]
    reset({ tipo: 'entrevista', dia_inteiro: false, inicio_data: hoje, inicio_hora: '09:00', fim_data: hoje, fim_hora: '10:00', candidato_id_str: '', enviar_email: true } as FormData)
    setModalOpen(true)
  }

  const abrirEdicao = (ev: Evento) => {
    setEditando(ev)
    const ini = toLocal(ev.inicio); const fim = toLocal(ev.fim ?? undefined)
    reset({
      titulo: ev.titulo, descricao: ev.descricao ?? '', tipo: ev.tipo,
      dia_inteiro: ev.dia_inteiro, local: ev.local ?? '', participantes: ev.participantes ?? '',
      candidato_id_str: ev.candidato_id ? String(ev.candidato_id) : '', enviar_email: false,
      inicio_data: ini.data, inicio_hora: ini.hora,
      fim_data: fim.data || ini.data, fim_hora: fim.hora || '10:00',
    } as FormData)
    setModalOpen(true)
  }

  const fecharModal = () => { setModalOpen(false); setEditando(null) }

  const candidatoSelId = watch('candidato_id_str')
  const tipoSel        = watch('tipo')
  const diaInteiro     = watch('dia_inteiro')
  const enviarEmail    = watch('enviar_email')
  const candidatoSel   = candidatos.find(c => String(c.id) === candidatoSelId)

  function handleCandChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value; setValue('candidato_id_str', id)
    const cand = candidatos.find(c => String(c.id) === id)
    if (cand) { setValue('participantes', cand.email); setValue('titulo', `${TIPO_LABELS[tipoSel] || 'Evento'} — ${cand.nome}`) }
  }

  const onSubmit = (data: FormData) => {
    const cId = data.candidato_id_str ? Number(data.candidato_id_str) : undefined
    const payload: EventoCreate = {
      titulo: data.titulo, descricao: data.descricao, tipo: data.tipo,
      dia_inteiro: data.dia_inteiro, local: data.local, participantes: data.participantes,
      candidato_id: cId,
      vaga_id: cId ? candidatos.find(c => c.id === cId)?.vaga_id ?? undefined : undefined,
      inicio: combine(data.inicio_data, data.dia_inteiro ? '' : data.inicio_hora),
      fim: data.dia_inteiro ? undefined : combine(data.fim_data, data.fim_hora),
    }
    if (editando) atualizar.mutate({ id: editando.id, payload, enviarEmail: data.enviar_email })
    else          criar.mutate({ payload, enviarEmail: data.enviar_email })
  }

  // Muda a view no calendário FullCalendar quando view muda
  const handleViewChange = (v: ViewMode) => {
    setView(v)
    if (v !== 'lista' && calendarRef.current) {
      calendarRef.current.getApi().changeView(FC_VIEW[v])
    }
  }

  const fcEvents = eventos.map(e => ({
    id: String(e.id),
    title: e.titulo,
    start: e.inicio,
    end: e.fim ?? undefined,
    allDay: e.dia_inteiro,
    backgroundColor: TIPO_CORES[e.tipo] ?? '#6366f1',
    borderColor: TIPO_CORES[e.tipo] ?? '#6366f1',
    extendedProps: { evento: e },
  }))

  const TABS: { key: ViewMode; label: string }[] = [
    { key: 'semana', label: 'Semana' },
    { key: 'mes',    label: 'Mês' },
    { key: 'dia',    label: 'Dia' },
    { key: 'lista',  label: 'Histórico' },
  ]

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Entrevistas, reuniões e compromissos do processo seletivo</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de view */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleViewChange(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => abrirNovo()}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo evento
          </button>
        </div>
      </div>

      {/* Legenda de tipos */}
      <div className="flex flex-wrap gap-3 items-center text-xs text-slate-500">
        {Object.entries(TIPO_LABELS).map(([tipo, label]) => (
          <span key={tipo} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIPO_CORES[tipo] }} />
            {label}
          </span>
        ))}
        <span className="border-l border-slate-200 pl-3 flex items-center gap-1">
          <User className="w-3 h-3 text-indigo-400" /> com candidato → e-mail automático
        </span>
      </div>

      {/* Vista Lista (histórico) */}
      {view === 'lista' ? (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-800">Histórico de Agendamentos</h2>
            <span className="text-xs text-slate-400">{eventos.length} eventos registrados</span>
          </div>
          <ListaAgendamentos eventos={eventos} candidatos={candidatos} onEditar={abrirEdicao} />
        </div>
      ) : (
        /* Calendário FullCalendar */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <style>{`
            .fc { font-family: inherit; }
            .fc-col-header-cell { background: #f8fafc; }
            .fc-col-header-cell-cushion { color: #334155; font-weight: 600; font-size: 12px; padding: 8px 4px; }
            .fc-timegrid-slot { height: 40px; }
            .fc-timegrid-slot-label { font-size: 11px; color: #94a3b8; padding: 0 8px; }
            .fc-timegrid-now-indicator-line { border-color: #ef4444; border-width: 2px; }
            .fc-timegrid-now-indicator-arrow { border-color: #ef4444; }
            .fc-event { border-radius: 6px; border: none !important; }
            .fc-toolbar { padding: 12px 16px; }
            .fc-toolbar-title { font-size: 15px; font-weight: 600; color: #1e293b; }
            .fc-button { border-radius: 8px !important; font-size: 12px !important; padding: 5px 12px !important; }
            .fc-button-primary { background: #6366f1 !important; border-color: #6366f1 !important; }
            .fc-button-primary:hover { background: #4f46e5 !important; }
            .fc-today-button { background: white !important; color: #334155 !important; border: 1px solid #e2e8f0 !important; }
            .fc-day-today { background: rgba(99,102,241,0.03) !important; }
            .fc-timegrid-col.fc-day-today { background: rgba(99,102,241,0.04) !important; }
            .fc-daygrid-event { border-radius: 4px; }
          `}</style>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            locale={ptBr}
            initialView={FC_VIEW[view]}
            timeZone="UTC"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            nowIndicator={true}
            allDaySlot={true}
            weekends={true}
            firstDay={0}
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' }}
            headerToolbar={{
              left:   'prev,next today',
              center: 'title',
              right:  '',
            }}
            events={fcEvents}
            selectable
            editable={false}
            height="auto"
            expandRows={true}
            stickyHeaderDates={true}
            dateClick={info => abrirNovo(info.dateStr)}
            eventClick={info => abrirEdicao(info.event.extendedProps.evento as Evento)}
            eventContent={(arg) => {
              const ev = arg.event.extendedProps.evento as Evento
              const isTimeGrid = arg.view.type.includes('timeGrid')
              return (
                <div className={`overflow-hidden rounded ${isTimeGrid ? 'px-1.5 py-1 h-full' : 'px-1 py-0.5'}`}>
                  <div className="flex items-center gap-1">
                    {ev.candidato_id && <User className="w-2.5 h-2.5 flex-shrink-0 opacity-90" />}
                    <span className={`font-medium truncate ${isTimeGrid ? 'text-xs' : 'text-xs'}`}>
                      {arg.event.title}
                    </span>
                  </div>
                  {isTimeGrid && ev.local && (
                    <div className="flex items-center gap-0.5 mt-0.5 opacity-80">
                      {ev.local.startsWith('http') ? <Video className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                      <span className="text-xs truncate">{ev.local}</span>
                    </div>
                  )}
                </div>
              )
            }}
          />
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                {editando ? 'Editar evento' : 'Novo evento'}
              </h2>
              <button onClick={fecharModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
              {/* Candidato */}
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                <label className="block text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Candidato vinculado
                </label>
                <select
                  value={candidatoSelId}
                  onChange={handleCandChange}
                  className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Sem candidato (evento interno)</option>
                  {candidatos.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} — {c.email}</option>
                  ))}
                </select>
                {candidatoSel && (
                  <>
                    <p className="text-xs text-indigo-700 bg-white px-3 py-2 rounded-lg border border-indigo-100">
                      <Mail className="w-3 h-3 inline mr-1" />{candidatoSel.email}
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-800">
                      <input type="checkbox" {...register('enviar_email')} className="w-4 h-4 accent-indigo-600" />
                      <Mail className="w-3.5 h-3.5" /> Enviar e-mail de confirmação
                    </label>
                  </>
                )}
              </div>

              {/* Tipo + Título */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select {...register('tipo')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.entries(TIPO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Título *</label>
                  <input {...register('titulo', { required: true })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Entrevista técnica" />
                </div>
              </div>

              {/* Dia inteiro */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('dia_inteiro')} className="w-4 h-4 accent-indigo-600" />
                <span className="text-sm text-slate-700">Dia inteiro</span>
              </label>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />{diaInteiro ? 'Data' : 'Início — data'}
                  </label>
                  <input type="date" {...register('inicio_data', { required: true })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {!diaInteiro && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Início — hora</label>
                    <input type="time" {...register('inicio_hora')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </div>

              {!diaInteiro && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fim — data</label>
                    <input type="date" {...register('fim_data')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fim — hora</label>
                    <input type="time" {...register('fim_hora')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              )}

              {/* Local */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" /> Local / Link da videochamada
                </label>
                <input {...register('local')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Sala 3 ou https://meet.google.com/..." />
              </div>

              {/* Participantes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  <Users className="w-3 h-3 inline mr-1" /> Participantes
                </label>
                <input {...register('participantes')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ana, Pedro, candidato@email.com" />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pauta / Observações</label>
                <textarea {...register('descricao')} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Tópicos da entrevista, instruções..." />
              </div>

              {candidatoSel && enviarEmail && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />
                  E-mail de confirmação será enviado para <strong>{candidatoSel.email}</strong>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center justify-between pt-2">
                {editando ? (
                  <button type="button" onClick={() => excluir.mutate(editando.id)} className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button type="button" onClick={fecharModal} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
                  <button type="submit" disabled={criar.isPending || atualizar.isPending} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-2">
                    {(criar.isPending || atualizar.isPending) ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : editando ? 'Salvar' : 'Criar evento'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
