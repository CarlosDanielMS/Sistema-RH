import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
})

// Interceptor: adiciona token JWT quando disponível
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rh_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor: trata erros globalmente
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rh_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
