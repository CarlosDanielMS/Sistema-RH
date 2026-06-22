import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  Users, Plus, ShieldCheck, User, Pencil, Trash2, Key,
  CheckCircle, XCircle, Loader2, X, Save, Eye, EyeOff,
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Modal } from '../components/ui/Modal'
import { formatDate } from '../utils/helpers'

interface UsuarioItem {
  id: number; nome: string; email: string; role: 'admin' | 'user'
  ativo: boolean; criado_em: string
}
interface FormCriar  { nome: string; email: string; senha: string; role: string }
interface FormEditar { nome: string; email: string; role: string; ativo: boolean }
interface FormSenha  { nova_senha: string }

export function Usuarios() {
  const qc = useQueryClient()
  const { isAdmin, user: eu } = useAuth()
  const nav = useNavigate()

  const [modalCriar,  setModalCriar]  = useState(false)
  const [editando,    setEditando]    = useState<UsuarioItem | null>(null)
  const [trocandoSenha, setTrocandoSenha] = useState<UsuarioItem | null>(null)
  const [mostrarSenha, setMostrarSenha]   = useState(false)

  if (!isAdmin) { nav('/dashboard'); return null }

  const { data: usuarios = [], isLoading } = useQuery<UsuarioItem[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/auth/usuarios').then(r => r.data),
  })

  const criar = useMutation({
    mutationFn: (d: FormCriar) => api.post('/auth/usuarios', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setModalCriar(false); resetCriar() },
  })
  const editar = useMutation({
    mutationFn: (d: FormEditar & { id: number }) => api.put(`/auth/usuarios/${d.id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setEditando(null) },
  })
  const trocarSenha = useMutation({
    mutationFn: ({ id, nova_senha }: { id: number; nova_senha: string }) =>
      api.put(`/auth/usuarios/${id}/senha`, { senha_atual: '', nova_senha }),
    onSuccess: () => { setTrocandoSenha(null); resetSenha() },
  })
  const excluir = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/usuarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const { register: regCriar,  handleSubmit: hsCriar,  reset: resetCriar,  formState: { errors: eCriar } }  = useForm<FormCriar>()
  const { register: regEditar, handleSubmit: hsEditar, reset: resetEditar, setValue: setEditar }             = useForm<FormEditar>()
  const { register: regSenha,  handleSubmit: hsSenha,  reset: resetSenha }                                  = useForm<FormSenha>()

  function abrirEditar(u: UsuarioItem) {
    setEditando(u)
    setEditar('nome', u.nome); setEditar('email', u.email)
    setEditar('role', u.role); setEditar('ativo', u.ativo)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Gerenciar Usuários</h1>
          <p className="page-subtitle">Controle de acesso e permissões do sistema</p>
        </div>
        <button onClick={() => setModalCriar(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Usuário', 'E-mail', 'Perfil', 'Status', 'Criado em', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usuarios.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.role === 'admin' ? 'bg-amber-500' : 'bg-primary-500'}`}>
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{u.nome}</p>
                        {u.id === eu?.id && <span className="text-xs text-primary-500">(você)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === 'admin'
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full w-fit"><ShieldCheck className="w-3 h-3" /> Admin</span>
                      : <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full w-fit"><User className="w-3 h-3" /> Usuário</span>}
                  </td>
                  <td className="px-4 py-3">
                    {u.ativo
                      ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5" /> Ativo</span>
                      : <span className="flex items-center gap-1 text-xs text-slate-400 font-medium"><XCircle className="w-3.5 h-3.5" /> Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(u.criado_em)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirEditar(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setTrocandoSenha(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-400 transition-colors" title="Redefinir senha">
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== eu?.id && (
                        <button
                          onClick={() => { if (confirm(`Excluir ${u.nome}?`)) excluir.mutate(u.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info de acesso */}
      <div className="card bg-slate-50 border-slate-200 text-sm text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-amber-500" /> Diferenças de acesso:</p>
        <p>• <strong>Admin</strong>: acesso completo — gerencia usuários, vê Monitor/Logs, altera qualquer dado</p>
        <p>• <strong>Usuário</strong>: acesso ao recrutamento — vagas, candidatos, pipeline, agenda, marketing (sem Monitor/Logs e sem gestão de usuários)</p>
      </div>

      {/* Modal: Criar Usuário */}
      <Modal open={modalCriar} onClose={() => { setModalCriar(false); resetCriar() }} title="Novo Usuário">
        <form onSubmit={hsCriar(d => criar.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" placeholder="Nome completo" {...regCriar('nome', { required: true })} />
          </div>
          <div>
            <label className="label">E-mail *</label>
            <input className="input" type="email" placeholder="email@empresa.com" {...regCriar('email', { required: true })} />
          </div>
          <div>
            <label className="label">Perfil</label>
            <select className="input" {...regCriar('role')}>
              <option value="user">Usuário</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Senha inicial *</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                {...regCriar('senha', { required: true, minLength: 6 })}
              />
              <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {eCriar.senha && <p className="text-xs text-red-500 mt-1">Mínimo 6 caracteres</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setModalCriar(false); resetCriar() }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={criar.isPending}>
              {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Criar</>}
            </button>
          </div>
          {criar.isError && <p className="text-xs text-red-500">{(criar.error as any)?.response?.data?.detail}</p>}
        </form>
      </Modal>

      {/* Modal: Editar Usuário */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Editar — ${editando?.nome}`}>
        <form onSubmit={hsEditar(d => editando && editar.mutate({ ...d, id: editando.id }))} className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input className="input" {...regEditar('nome')} />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" {...regEditar('email')} />
          </div>
          <div>
            <label className="label">Perfil</label>
            <select className="input" {...regEditar('role')}>
              <option value="user">Usuário</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" {...regEditar('ativo')} className="rounded" /> Conta ativa
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={editar.isPending}>
              {editar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Salvar</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Redefinir Senha */}
      <Modal open={!!trocandoSenha} onClose={() => { setTrocandoSenha(null); resetSenha() }} title={`Redefinir senha — ${trocandoSenha?.nome}`}>
        <form onSubmit={hsSenha(d => trocandoSenha && trocarSenha.mutate({ id: trocandoSenha.id, nova_senha: d.nova_senha }))} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Como admin você pode redefinir a senha sem precisar da senha atual.
          </div>
          <div>
            <label className="label">Nova senha *</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                {...regSenha('nova_senha', { required: true, minLength: 6 })}
              />
              <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setTrocandoSenha(null); resetSenha() }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={trocarSenha.isPending}>
              {trocarSenha.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Key className="w-4 h-4" /> Redefinir</>}
            </button>
          </div>
          {trocarSenha.isSuccess && <p className="text-xs text-emerald-600">✓ Senha redefinida com sucesso!</p>}
        </form>
      </Modal>
    </div>
  )
}
