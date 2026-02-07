import { defineStore } from 'pinia'
import {
  apiGetUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
  type User,
  type UserQuery,
  type UserFilters,
  type SortDirection,
  type PinRule
} from '@/api/users'
import type { ApiError } from '@/api/http'

type SortField = UserQuery['sortBy']
type OrderingRule = NonNullable<UserQuery['ordering']>[number]
type PinRuleItem = PinRule

const MAX_ROWS_IN_MEMORY = 5000

function buildBaseKey(
  q: Pick<UserQuery, 'filters' | 'sortBy' | 'sortOrder' | 'ordering' | 'pageSize' | 'pin'>
) {
  return JSON.stringify({
    filters: q.filters ?? {},
    sortBy: q.sortBy ?? '',
    sortOrder: q.sortOrder ?? '',
    ordering: q.ordering ?? [],
    pageSize: q.pageSize ?? 500,
    pin: q.pin ?? []
  })
}

export const useUsersStore = defineStore('users', {
  state: () => ({
    rows: [] as User[],
    total: 0,

    filters: {} as UserFilters,

    sortBy: undefined as SortField,
    sortOrder: undefined as SortDirection | undefined,
    ordering: [] as OrderingRule[],

    pinRules: [] as PinRuleItem[],

    page: 1,
    pageSize: 500,
    hasMore: true,

    loading: false,
    error: '' as string,

    _requestSeq: 0,
    _lastBaseKey: '' as string,
    _abort: null as AbortController | null
  }),

  getters: {
    baseQuery(
      state
    ): Pick<UserQuery, 'filters' | 'sortBy' | 'sortOrder' | 'ordering' | 'pageSize' | 'pin'> {
      return {
        filters: Object.keys(state.filters || {}).length ? state.filters : undefined,
        ordering: state.ordering.length ? state.ordering : undefined,
        sortBy: !state.ordering.length ? state.sortBy : undefined,
        sortOrder: !state.ordering.length ? state.sortOrder : undefined,
        pageSize: state.pageSize,
        pin: state.pinRules.length ? state.pinRules : undefined
      }
    }
  },

  actions: {
    cancelFetch() {
      if (this._abort) {
        this._abort.abort()
        this._abort = null
      }
    },

    resetList() {
      this.page = 1
      this.rows = []
      this.total = 0
      this.hasMore = true
      this.error = ''
    },

    setFilters(filters: UserFilters) {
      this.filters = filters
      this.resetList()
    },

    addPin(rule: PinRuleItem) {
      const idx = this.pinRules.findIndex((p) => p.id === rule.id)
      if (idx !== -1) {
        this.pinRules.splice(idx, 1)
        this.pinRules.push(rule)
      } else {
        this.pinRules.push(rule)
      }
      this.resetList()
    },

    removePin(id: number) {
      const idx = this.pinRules.findIndex((p) => p.id === id)
      if (idx !== -1) this.pinRules.splice(idx, 1)
      void this.refreshKeepRows()
    },

    clearPins() {
      this.pinRules = []
      this.resetList()
    },

    toggleSort(field: SortField) {
      if (this.ordering.length) this.ordering = []

      if (this.sortBy !== field) {
        this.sortBy = field
        this.sortOrder = 'asc'
        this.resetList()
        return
      }

      if (this.sortOrder === 'asc') this.sortOrder = 'desc'
      else if (this.sortOrder === 'desc') {
        this.sortBy = undefined
        this.sortOrder = undefined
      } else this.sortOrder = 'asc'

      this.resetList()
    },

    setOrdering(ordering: OrderingRule[]) {
      this.ordering = ordering
      this.sortBy = undefined
      this.sortOrder = undefined
      this.resetList()
    },

    setPageSize(size: number) {
      this.pageSize = Math.max(1, size)
      this.resetList()
    },

    async fetchFirstPage() {
      this.resetList()
      await this.fetchNextPage()
    },

    async refreshKeepRows() {
      this.page = 1
      this.hasMore = true
      this.error = ''
      await this.fetchNextPage({ replace: true })
    },

    async fetchNextPage(options?: { replace?: boolean }) {
      if (this.loading || !this.hasMore) return

      const base = this.baseQuery
      const baseKey = buildBaseKey(base)
      this._lastBaseKey = baseKey

      this.cancelFetch()
      this._abort = new AbortController()

      const seq = ++this._requestSeq
      this.loading = true
      this.error = ''

      try {
        const res = await apiGetUsers({
          ...base,
          page: this.page
        })

        if (seq !== this._requestSeq) return
        if (baseKey !== this._lastBaseKey) return

        const pageData = res.data
        const list = pageData.data

        this.total = pageData.total

        if (options?.replace) {
          this.rows = list.slice(0, MAX_ROWS_IN_MEMORY)
        } else {
          this.rows.push(...list)
          if (this.rows.length > MAX_ROWS_IN_MEMORY) {
            this.rows.splice(0, this.rows.length - MAX_ROWS_IN_MEMORY)
          }
        }

        this.hasMore = pageData.current_page < pageData.last_page && list.length > 0
        if (this.hasMore) this.page = pageData.current_page + 1
      } catch (e: any) {
        const err = e as ApiError
        if (err?.message === 'Request canceled') return
        this.error = err?.message ?? 'Fetch failed'
      } finally {
        if (seq === this._requestSeq) {
          this.loading = false
          this._abort = null
        }
      }
    },

    async create(payload: Omit<User, 'id'>) {
      this.loading = true
      this.error = ''
      try {
        await apiCreateUser(payload)
        await this.refreshKeepRows()
      } catch (e: any) {
        const err = e as ApiError
        this.error = err?.message ?? 'Create failed'
        throw e
      } finally {
        this.loading = false
      }
    },

    async update(payload: User) {
      this.loading = true
      this.error = ''
      try {
        const res = await apiUpdateUser(payload)
        const updated = res.data

        const idx = this.rows.findIndex((u) => u.id === updated.id)
        if (idx !== -1) this.rows[idx] = updated
      } catch (e: any) {
        const err = e as ApiError
        this.error = err?.message ?? 'Update failed'
        throw e
      } finally {
        this.loading = false
      }
    },

    async remove(id: number) {
      this.loading = true
      this.error = ''
      try {
        await apiDeleteUser(id)

        const idx = this.rows.findIndex((u) => u.id === id)
        if (idx !== -1) this.rows.splice(idx, 1)
        if (this.total > 0) this.total -= 1

        if (this.hasMore && !this.loading) {
          await this.fetchNextPage()
        }
      } catch (e: any) {
        const err = e as ApiError
        this.error = err?.message ?? 'Delete failed'
        throw e
      } finally {
        this.loading = false
      }
    }
  }
})
