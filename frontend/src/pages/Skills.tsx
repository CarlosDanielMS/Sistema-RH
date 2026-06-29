import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, Loader2, Zap, RefreshCw, Brain } from 'lucide-react'
import api from '../services/api'

interface Msg { role: 'user' | 'assistant'; content: string; latencia?: number }

const SUGESTOES = [
  'Como estruturo uma entrevista técnica justa e sem vieses?',
  'Quais critérios devo usar para avaliar um candidato para dev sênior?',
  'O score do candidato está em 65. Devo aproveitá-lo mesmo assim?',
  'Como identificar viés de confirmação no meu processo seletivo?',
  'Quais perguntas são proibidas em uma entrevista de emprego?',
  'Como dar um feedback de reprovação respeitoso e útil ao candidato?',
]

export function Skills() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [statusIA, setStatusIA] = useState<{ ativo: boolean; modelo: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/openrh/status').then(r => setStatusIA(r.data)).catch(() => null)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, carregando])

  async function enviar(texto: string) {
    const msg = texto.trim()
    if (!msg || carregando) return

    const novaMsgUser: Msg = { role: 'user', content: msg }
    setMsgs(prev => [...prev, novaMsgUser])
    setInput('')
    setCarregando(true)

    try {
      const historico = msgs.map(m => ({ role: m.role, content: m.content }))
      const res = await api.post('/openrh/chat', {
        mensagem: msg,
        historico,
      })
      const resposta: Msg = {
        role: 'assistant',
        content: res.data.resposta,
        latencia: res.data.latencia_s,
      }
      setMsgs(prev => [...prev, resposta])
    } catch (e: any) {
      const errMsg = e?.response?.data?.detail || 'Erro ao conectar com a IA. Verifique a chave Groq em Monitor / Logs.'
      setMsgs(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}` }])
    } finally {
      setCarregando(false)
    }
  }

  function limpar() { setMsgs([]) }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-3xl space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="page-title mb-0">OpenRH</h1>
            <p className="page-subtitle">Assistente IA focado em recrutamento e resolução de problemas de RH</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIA && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${statusIA.ativo ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${statusIA.ativo ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {statusIA.ativo ? 'IA online' : 'IA offline'}
            </div>
          )}
          {msgs.length > 0 && (
            <button onClick={limpar} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Nova conversa
            </button>
          )}
        </div>
      </div>

      {/* Área principal do chat */}
      <div className="flex-1 card p-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Estado inicial — sugestões */}
          {msgs.length === 0 && !carregando && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Brain className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="font-semibold text-slate-800">Como posso ajudar?</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Sou especialista em recrutamento, seleção e equidade. Faça qualquer pergunta sobre seus processos ou peça orientação sobre candidatos.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Sugestões para começar
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGESTOES.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => enviar(s)}
                      className="text-left text-sm p-3 rounded-xl bg-slate-50 hover:bg-primary-50 border border-slate-100 hover:border-primary-200 text-slate-600 hover:text-primary-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mensagens */}
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${m.role === 'assistant' ? 'bg-primary-100' : 'bg-slate-200'}`}>
                {m.role === 'assistant'
                  ? <Bot className="w-4 h-4 text-primary-600" />
                  : <User className="w-4 h-4 text-slate-500" />}
              </div>
              <div className={`max-w-lg ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'assistant'
                    ? 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm'
                    : 'bg-primary-600 text-white rounded-tr-sm'
                }`}>
                  {m.content}
                </div>
                {m.latencia && (
                  <span className="text-xs text-slate-300 px-1">{m.latencia}s</span>
                )}
              </div>
            </div>
          ))}

          {/* Digitando... */}
          {carregando && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-100 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">OpenRH está pensando...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Faça uma pergunta sobre recrutamento, candidatos ou decisões..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar(input)}
              disabled={carregando}
            />
            <button
              onClick={() => enviar(input)}
              disabled={carregando || !input.trim()}
              className="btn-primary px-4 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            OpenRH — Assistente especializado em recrutamento e gestão de pessoas
          </p>
        </div>
      </div>
    </div>
  )
}
