import { mockHttp } from './http'
import type { ApiResponse } from './http'

export type SortDirection = 'asc' | 'desc'

export interface User {
  id: number
  name: string
  position: string
  location: string
  age: number
  birthdate: string // ISO yyyy-mm-dd
}

export interface UserFilters {
  name?: string
  position?: string
  location?: string
  ageMin?: number
  ageMax?: number
  birthdateFrom?: string // yyyy-mm-dd
  birthdateTo?: string // yyyy-mm-dd
}

export interface UserQuery {
  filters?: UserFilters

  sortBy?: keyof Pick<User, 'name' | 'position' | 'location' | 'age' | 'birthdate'>
  sortOrder?: SortDirection

  ordering?: Array<{
    field: keyof Pick<User, 'name' | 'position' | 'location' | 'age' | 'birthdate'>
    direction: SortDirection
  }>

  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  current_page: number
  last_page: number
  per_page: number
  total: number
  data: T[]
}

export interface CreateUserPayload {
  name: string
  position: string
  location: string
  age: number
  birthdate: string
}

export interface UpdateUserPayload extends CreateUserPayload {
  id: number
}

const STORAGE_KEY = 'db.users.v1'

let _cacheUsers: User[] | null = null
let _cacheAt = 0
const CACHE_TTL_MS = 2000

function invalidateCache() {
  _cacheUsers = null
  _cacheAt = 0
}

function loadUsersCached(): User[] {
  const now = Date.now()
  if (_cacheUsers && now - _cacheAt < CACHE_TTL_MS) return _cacheUsers

  const raw = localStorage.getItem(STORAGE_KEY)
  _cacheUsers = raw ? JSON.parse(raw) : []
  _cacheAt = now
  return _cacheUsers
}

function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  invalidateCache()
}

function normalizeQuery(q: UserQuery): Required<Pick<UserQuery, 'page' | 'pageSize'>> & UserQuery {
  return {
    page: q.page ?? 1,
    pageSize: q.pageSize ?? 500,
    ...q
  }
}

function applyFilters(data: User[], filters?: UserFilters) {
  if (!filters) return data

  const name = filters.name?.trim().toLowerCase()
  const position = filters.position?.trim().toLowerCase()
  const location = filters.location?.trim().toLowerCase()
  const ageMin = filters.ageMin
  const ageMax = filters.ageMax
  const from = filters.birthdateFrom
  const to = filters.birthdateTo

  // 沒有任何條件就直接回傳（省 allocation）
  if (!name && !position && !location && ageMin === undefined && ageMax === undefined && !from && !to) {
    return data
  }

  const out: User[] = []
  for (const u of data) {
    if (name && !u.name.toLowerCase().includes(name)) continue
    if (position && !u.position.toLowerCase().includes(position)) continue
    if (location && !u.location.toLowerCase().includes(location)) continue
    if (ageMin !== undefined && u.age < ageMin) continue
    if (ageMax !== undefined && u.age > ageMax) continue
    if (from && u.birthdate < from) continue
    if (to && u.birthdate > to) continue
    out.push(u)
  }
  return out
}

function applyOrdering(data: User[], ordering?: UserQuery['ordering']) {
  if (!ordering?.length) return data
  data.sort((a, b) => {
    for (const rule of ordering) {
      const { field, direction } = rule
      const av = a[field]
      const bv = b[field]
      if (av === bv) continue
      const r = av > bv ? 1 : -1
      return direction === 'asc' ? r : -r
    }
    return 0
  })
  return data
}

function applySingleSort(data: User[], sortBy?: UserQuery['sortBy'], sortOrder?: SortDirection) {
  if (!sortBy) return data
  const dir = sortOrder === 'desc' ? -1 : 1
  data.sort((a, b) => {
    const av = a[sortBy]
    const bv = b[sortBy]
    if (av === bv) return 0
    return av > bv ? dir : -dir
  })
  return data
}

function applyPaging(data: User[], page: number, pageSize: number): PaginatedResponse<User> {
  const total = data.length
  const last_page = Math.max(1, Math.ceil(total / pageSize))
  const current_page = Math.min(Math.max(1, page), last_page)

  const start = (current_page - 1) * pageSize
  const end = start + pageSize

  return {
    current_page,
    last_page,
    per_page: pageSize,
    total,
    data: data.slice(start, end)
  }
}

/** GET /users */
export function apiGetUsers(query: UserQuery): Promise<ApiResponse<PaginatedResponse<User>>> {
  return mockHttp.request(() => {
    const q = normalizeQuery(query)
    let data = loadUsersCached().slice()

    data = applyFilters(data, q.filters)

    if (q.ordering?.length) data = applyOrdering(data, q.ordering)
    else data = applySingleSort(data, q.sortBy, q.sortOrder)

    return applyPaging(data, q.page!, q.pageSize!)
  })
}

/** POST /users */
export function apiCreateUser(payload: CreateUserPayload): Promise<ApiResponse<User>> {
  return mockHttp.request(() => {
    if (!payload.name?.trim()) throw { status: 422, message: 'name is required' }
    if (!payload.position?.trim()) throw { status: 422, message: 'position is required' }
    if (!payload.location?.trim()) throw { status: 422, message: 'location is required' }
    if (!Number.isFinite(payload.age) || payload.age < 0) throw { status: 422, message: 'age is invalid' }
    if (!payload.birthdate) throw { status: 422, message: 'birthdate is required' }

    const users = loadUsersCached().slice()
    const user: User = { id: Date.now(), ...payload }

    users.unshift(user)
    saveUsers(users)
    return user
  })
}

/** PUT /users/:id */
export function apiUpdateUser(payload: UpdateUserPayload): Promise<ApiResponse<User>> {
  return mockHttp.request(() => {
    const users = loadUsersCached().slice()
    const idx = users.findIndex((u) => u.id === payload.id)
    if (idx === -1) throw { status: 404, message: 'User not found' }

    const next: User = { ...users[idx], ...payload }
    users[idx] = next
    saveUsers(users)
    return next
  })
}

/** DELETE /users/:id */
export function apiDeleteUser(id: number): Promise<ApiResponse<{ ok: true }>> {
  return mockHttp.request(() => {
    const users = loadUsersCached().slice()
    const next = users.filter((u) => u.id !== id)
    saveUsers(next)
    return { ok: true as const }
  })
}
