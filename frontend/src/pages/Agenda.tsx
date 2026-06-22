import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { X, Plus, Trash2, MapPin, Users, Calendar, User, Mail, CheckCircle, Loader2 } from 'lucide-react'
import { agendaService, EventoCreate, Evento } from '../services/agendaService'
import { candidatosService } from '../services/candidatosService'

const TIPO_CORES: Record<string, string> = {
  entrevista: '#6366f1',
  reuniao:    '#0ea5e9',
  prazo:      '#ef4444',
  onboarding: '#10b981',
  feedback:   '#f59e0b',
  outro:      '#8b5cf6',
}

const TIPO_LABELS: Record<string, string> = {
  entrevista: 'Entrevista',
  reuniao:    'Reunião',
  prazo:      'Prazo',
  onboarding: 'Onboarding',
  feedback:   'Feedback',
  outro:      'Outro',
}

interface FormData extends EventoCreate {
  inicio_data: string
  inicio_hora: string
  fim_data: string
  fim_hora: string
  candidato_id_str: string
  enviar_email: boolean
}

const toLocalDateTimeInputs = (iso?: string) => {
  if (!iso) return { data: '', hora: '' }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

const combineDateTime = (data: string, hora: string) =>
  hora ? `${data}T${hora}:00` : `${data}T00:00:00`

export function Agenda() {
  const qc = useQueryClient()
  const calendarRef = useRef<FullCalendar>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [emailEnviado, setEmailEnviado] = useState(false)

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] })
      qc.invalidateQueries({ queryKey: ['historico'] })
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
    },
  })

  const excluir = useMutation({
    mutationFn: (id: number) => agendaService.excluir(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['eventos'] }); fecharModal() },
  })

  const abrirNovoEvento = (data?: string) => {
    setEditando(null)
    setEmailEnviado(false)
    const hoje = data || new Date().toISOString().split('T')[0]
    reset({
      tipo: 'entrevista',
      dia_inteiro: false,
      inicio_data: hoje,
      inicio_hora: '09:00',
      fim_data: hoje,
      fim_hora: '10:00',
      candidato_id_str: '',
      enviar_email: true,
    } as FormData)
    setModalOpen(true)
  }

  const abrirEdicao = (evento: Evento) => {
    setEditando(evento)
    setEmailEnviado(false)
    const ini = toLocalDateTimeInputs(evento.inicio)
    const fim = toLocalDateTimeInputs(evento.fim ?? undefined)
    reset({
      titulo: evento.titulo,
      descricao: evento.descricao ?? '',
      tipo: evento.tipo,
      dia_inteiro: evento.dia_inteiro,
      local: evento.local ?? '',
      participantes: evento.participantes ?? '',
      candidato_id_str: evento.candidato_id ? String(evento.candidato_id) : '',
      enviar_email: false,
      inicio_data: ini.data,
      inicio_hora: ini.hora,
      fim_data: fim.data || ini.data,
      fim_hora: fim.hora || '10:00',
    } as FormData)
    setModalOpen(true)
  }

  const fecharModal = () => { setModalOpen(false); setEditando(null); setEmailEnviado(false) }

  // Ao selecionar candidato: preenche participantes com email e sugere título
  const candidatoSelecionadoId = watch('candidato_id_str')
  const tipoSelecionado = watch('tipo')
  const candidatoSelecionado = candidatos.find(c => String(c.id) === candidatoSelecionadoId)

  function handleCandidatoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    setValue('candidato_id_str', id)
    const cand = candidatos.find(c => String(c.id) === id)
    if (cand) {
      // Auto-preenche participantes com o email do candidato
      setValue('participantes', cand.email)
      // Sugere título se estiver vazio
      const tipoLabel = TIPO_LABELS[tipoSelecionado] || 'Evento'
      setValue('titulo', `${tipoLabel} — ${cand.nome}`)
    }
  }

  const onSubmit = (data: FormData) => {
    const candidatoId = data.candidato_id_str ? Number(data.candidato_id_str) : undefined
    const payload: EventoCreate = {
      titulo: data.titulo,
      descricao: data.descricao,
      tipo: data.tipo,
      dia_inteiro: data.dia_inteiro,
      local: data.local,
      participantes: data.participantes,
      candidato_id: candidatoId,
      vaga_id: candidatoId
        ? candidatos.find(c => c.id === candidatoId)?.vaga_id ?? undefined
        : undefined,
      inicio: combineDateTime(data.inicio_data, data.dia_inteiro ? '' : data.inicio_hora),
      fim: data.dia_inteiro ? undefined : combineDateTime(data.fim_data, data.fim_hora),
    }

    if (editando) {
      atualizar.mutate({ id: editando.id, payload, enviarEmail: data.enviar_email })
    } else {
      criar.mutate({ payload, enviarEmail: data.enviar_email })
    }
  }

  const fcEvents = eventos.map(e => ({
    id: String(e.id),
    title: e.titulo,
    start: e.inicio,
    end: e.fim ?? undefined,
    allDay: e.dia_inteiro,
    backgroundColor: TIPO_CORES[e.tipo] ?? '#6366f1',
    borderColor: e.candidato_id ? '#fff' : (TIPO_CORES[e.tipo] ?? '#6366f1'),
    extendedProps: { evento: e },
    // Evento com candidato vinculado fica com borda branca para destacar
    classNames: e.candidato_id ? ['has-candidato'] : [],
  }))

  const diaInteiro = watch('dia_inteiro')
  const enviarEmail = watch('enviar_email')

  // Eventos desta semana com candidato
  const hoje = new Date()
  const eventosComCandidato = eventos.filter(e => e.candidato_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Entrevistas e reuniões do processo seletivo
            {eventosComCandidato.length > 0 && (
              <span className="ml-2 text-xs font-medium text-indigo-600">
                · {eventosComCandidato.length} com candidatos vinculados
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => abrirNovoEvento()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo evento
        </button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 items-center">
        {Object.entries(TIPO_LABELS).map(([tipo, label]) => (
          <span key={tipo} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIPO_CORES[tipo] }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-slate-500 border-l border-slate-200 pl-4">
          <User className="w-3 h-3 text-indigo-500" />
          Eventos com candidato enviam e-mail automático
        </span>
      </div>

      {/* Calendário */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <style>{`.has-candidato { outline: 2px solid rgba(255,255,255,0.6); outline-offset: -2px; }`}</style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          locale="pt-br"
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          events={fcEvents}
          selectable
          editable={false}
          height="auto"
          dateClick={info => abrirNovoEvento(info.dateStr)}
          eventClick={info => abrirEdicao(info.event.extendedProps.evento as Evento)}
          eventClassNames="cursor-pointer"
          buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' }}
          eventContent={(arg) => {
            const ev = arg.event.extendedProps.evento as Evento
            return (
              <div className="px-1 py-0.5 flex items-center gap-1 overflow-hidden">
                {ev.candidato_id && <User className="w-3 h-3 flex-shrink-0 opacity-80" />}
                <span className="text-xs font-medium truncate">{arg.event.title}</span>
              </div>
            )
          }}
        />
      </div>

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

              {/* ── CANDIDATO (campo novo — destaque) ── */}
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                <label className="block text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Candidato vinculado
                </label>
                <select
                  value={candidatoSelecionadoId}
                  onChange={handleCandidatoChange}
                  className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Sem candidato (evento interno)</option>
                  {candidatos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} — {c.email}
                    </option>
                  ))}
                </select>

                {candidatoSelecionado && (
                  <div className="flex items-center gap-2 text-xs text-indigo-700 bg-white px-3 py-2 rounded-lg border border-indigo-100">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>E-mail: <strong>{candidatoSelecionado.email}</strong></span>
                  </div>
                )}

                {candidatoSelecionado && (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-indigo-800">
                    <input
                      type="checkbox"
                      {...register('enviar_email')}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <Mail className="w-3.5 h-3.5" />
                    Enviar e-mail de confirmação ao candidato
                  </label>
                )}
              </div>

              {/* Tipo + Título */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    {...register('tipo')}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(TIPO_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Título *</label>
                  <input
                    {...register('titulo', { required: true })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Entrevista técnica"
                  />
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
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {diaInteiro ? 'Data' : 'Início — data'}
                  </label>
                  <input type="date" {...register('inicio_data', { required: true })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                {!diaInteiro && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Início — hora</label>
                    <input type="time" {...register('inicio_hora')}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </div>

              {!diaInteiro && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fim — data</label>
                    <input type="date" {...register('fim_data')}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fim — hora</label>
                    <input type="time" {...register('fim_hora')}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              )}

              {/* Local */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" /> Local / Link
                </label>
                <input {...register('local')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Sala 3 ou https://meet.google.com/..." />
              </div>

              {/* Participantes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  <Users className="w-3 h-3 inline mr-1" /> Participantes
                </label>
                <input {...register('participantes')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ana, Pedro, candidato@email.com" />
                {candidatoSelecionado && (
                  <p className="text-xs text-slate-400 mt-1">
                    E-mail do candidato inserido automaticamente
                  </p>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descrição / Pauta</label>
                <textarea {...register('descricao')} rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Tópicos da entrevista, instruções, observações..." />
              </div>

              {/* Preview do e-mail que será enviado */}
              {candidatoSelecionado && enviarEmail && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <p className="font-semibold mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> E-mail será enviado para:
                  </p>
                  <p>{candidatoSelecionado.email}</p>
                  <p className="mt-1 text-emerald-600">Com os detalhes do evento: tipo, data, local e descrição.</p>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center justify-between pt-2">
                {editando ? (
                  <button type="button" onClick={() => excluir.mutate(editando.id)}
                    className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm font-medium">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button type="button" onClick={fecharModal}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button type="submit"
                    disabled={criar.isPending || atualizar.isPending}
                    className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2">
                    {(criar.isPending || atualizar.isPending)
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                      : editando ? 'Salvar' : 'Criar evento'}
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
