<template>
  <div class="page">
    <header class="topbar">
      <h1>Users</h1>

      <div class="toolbar">
        <div class="searchPanel">
          <input class="input" v-model="draft.name" placeholder="Name" />
          <input class="input" v-model="draft.position" placeholder="Position" />
          <input class="input" v-model="draft.location" placeholder="Location" />

          <input
            class="input"
            type="number"
            v-model.number="draft.ageMin"
            placeholder="Min Age"
          />
          <input
            class="input"
            type="number"
            v-model.number="draft.ageMax"
            placeholder="Max Age"
          />

          <button class="btn" @click="onSearch">Search</button>
          <button class="btn subtle" @click="onReset">Reset</button>
          <button class="btn" @click="openCreate">+ Add</button>
        </div>
      </div>

      <!-- Desktop header -->
      <div class="headerRow">
        <button class="th" @click="onSort('name')">Name {{ icon('name') }}</button>
        <button class="th" @click="onSort('position')">
          Position {{ icon('position') }}
        </button>
        <button class="th" @click="onSort('location')">
          Location {{ icon('location') }}
        </button>
        <button class="th" @click="onSort('age')">Age {{ icon('age') }}</button>
        <button class="th" @click="onSort('birthdate')">
          Birthdate {{ icon('birthdate') }}
        </button>
        <div class="th th--actions">Actions</div>
      </div>

      <!-- Mobile sort bar -->
      <div class="mobileSort">
        <span class="mobileSort__label">Sort</span>
        <div class="mobileSort__controls">
          <select
            class="select"
            :value="sortFieldValue"
            @change="onMobileSortFieldChange"
          >
            <option value="">None</option>
            <option value="name">Name</option>
            <option value="position">Position</option>
            <option value="location">Location</option>
            <option value="age">Age</option>
            <option value="birthdate">Birthdate</option>
          </select>

          <button
            class="btn subtle mobileSort__dir"
            type="button"
            :disabled="!sortFieldValue"
            @click="toggleMobileSortDir"
            :title="store.sortOrder === 'desc' ? 'Descending' : 'Ascending'"
          >
            {{ store.sortOrder === 'desc' ? '↓' : '↑' }}
          </button>
        </div>

        <button
          v-if="store.pin"
          class="btn subtle mobileSort__clearPin"
          @click="async () => { store.clearPin(); await store.fetchFirstPage(); listRef.value?.scrollToTop() }"
        >
          Clear Pin
        </button>
      </div>
    </header>

    <VirtualList
      ref="listRef"
      class="list"
      :items="store.rows"
      :itemHeight="ROW_H"
      :overscan="10"
      height="70vh"
      @reach-end="store.fetchNextPage()"
    >
      <template #default="{ items }">
        <!-- Desktop rows -->
        <div
          v-for="u in items"
          :key="u.id"
          class="row row--desktop"
          :style="{ height: ROW_H + 'px' }"
        >
          <div class="cell">{{ u.name }}</div>
          <div class="cell">{{ u.position }}</div>
          <div class="cell">{{ u.location }}</div>
          <div class="cell cell--right">{{ u.age }}</div>
          <div class="cell mono">{{ u.birthdate }}</div>

          <div class="cell actions">
            <button class="btn subtle" @click="openEdit(u)">Edit</button>
            <button
              class="btn subtle"
              @click="pin(u)"
              :title="store.pin?.id === u.id ? `目前固定第 ${store.pin.position} 筆` : '固定這筆到指定順位'"
            >
              {{ store.pin?.id === u.id ? `Pinned #${store.pin.position}` : 'Pin' }}
            </button>
            <button class="btn danger" @click="remove(u)">Delete</button>
          </div>
        </div>

        <!-- Mobile cards -->
        <div v-for="u in items" :key="u.id" class="card row--mobile">
          <div class="card__top">
            <div class="card__title">
              <span class="name">{{ u.name }}</span>
              <span class="age">{{ u.age }}</span>
            </div>
            <div class="card__actions">
              <button class="btn subtle btn--sm" @click="openEdit(u)">Edit</button>
              <button
                class="btn subtle btn--sm"
                @click="pin(u)"
                :title="store.pin?.id === u.id ? `目前固定第 ${store.pin.position} 筆` : '固定這筆到指定順位'"
              >
                {{ store.pin?.id === u.id ? `Pinned #${store.pin.position}` : 'Pin' }}
              </button>
              <button class="btn danger btn--sm" @click="remove(u)">Delete</button>
            </div>
          </div>

          <div class="card__meta">
            <div class="kv">
              <span class="k">Position</span><span class="v">{{ u.position }}</span>
            </div>
            <div class="kv">
              <span class="k">Location</span><span class="v">{{ u.location }}</span>
            </div>
            <div class="kv">
              <span class="k">Birthdate</span><span class="v mono">{{ u.birthdate }}</span>
            </div>
          </div>
        </div>

        <div class="footerHint">
          <span v-if="store.loading">Loading…</span>
          <span v-else-if="!store.hasMore">No more</span>
          <span v-else>Scroll to load more…</span>
        </div>
      </template>
    </VirtualList>

    <!-- ========== Pure DIV Modal ========== -->
    <div
      v-if="modal.open"
      class="modal"
      role="dialog"
      aria-modal="true"
      @keydown.esc.prevent="closeModal"
    >
      <div class="modal__backdrop" @click="onBackdropClick" />

      <div class="modal__panel" ref="panelRef" tabindex="-1">
        <div class="modal__header">
          <h2 class="modal__title">
            {{ modal.mode === 'create' ? 'Create User' : 'Edit User' }}
          </h2>
          <button class="iconBtn" aria-label="Close" @click="closeModal">✕</button>
        </div>

        <form class="modal__body" @submit.prevent="submit">
          <div class="grid">
            <label class="field">
              <span class="label">Name <span class="hint" title="使用者姓名（必填）">?</span></span>
              <input class="input" v-model.trim="form.name" required />
            </label>

            <label class="field">
              <span class="label">Position <span class="hint" title="職位（必填）">?</span></span>
              <input class="input" v-model.trim="form.position" required />
            </label>

            <label class="field">
              <span class="label">Location <span class="hint" title="所在地（必填）">?</span></span>
              <input class="input" v-model.trim="form.location" required />
            </label>

            <label class="field">
              <span class="label">Age <span class="hint" title="年齡（數字）">?</span></span>
              <input class="input" type="number" v-model.number="form.age" min="0" required />
            </label>

            <label class="field">
              <span class="label">Birthdate <span class="hint" title="生日（yyyy-mm-dd）">?</span></span>
              <input class="input" type="date" v-model="form.birthdate" required />
            </label>
          </div>

          <p v-if="modal.error" class="formError">{{ modal.error }}</p>

          <div class="modal__actions">
            <button class="btn subtle" type="button" @click="closeModal" :disabled="modal.submitting">
              Cancel
            </button>
            <button class="btn" type="submit" :disabled="modal.submitting">
              {{ modal.submitting ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <!-- ========== /Pure DIV Modal ========== -->
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, computed } from 'vue'
import VirtualList from '@/components/VirtualList.vue'
import { useUsersStore } from '@/store/users'
import { seedUsers } from '@/api/seedUsers'
import type { User } from '@/api/users'

const store = useUsersStore()
const listRef = ref<{ scrollToTop: () => void } | null>(null)

const draft = reactive({
  name: '',
  position: '',
  location: '',
  ageMin: null as number | null,
  ageMax: null as number | null,
})

const ROW_H = 56

onMounted(async () => {
  seedUsers({ count: 20000 })
  await store.fetchFirstPage()
  listRef.value?.scrollToTop()
})

async function onSearch() {
  store.setFilters({
    name: draft.name.trim() || undefined,
    position: draft.position.trim() || undefined,
    location: draft.location.trim() || undefined,
    ageMin: draft.ageMin ?? undefined,
    ageMax: draft.ageMax ?? undefined,
  })
  await store.fetchFirstPage()
  listRef.value?.scrollToTop()
}

async function onReset() {
  Object.assign(draft, {
    name: '',
    position: '',
    location: '',
    ageMin: null,
    ageMax: null,
  })
  store.setFilters({})
  await store.fetchFirstPage()
  listRef.value?.scrollToTop()
}

/** 排序 */
type SortField = 'name' | 'position' | 'location' | 'age' | 'birthdate'

async function onSort(field: SortField) {
  store.toggleSort(field)
  await store.fetchFirstPage()
  listRef.value?.scrollToTop()
}

const sortFieldValue = computed(() => {
  if (store.ordering.length) return ''
  return (store.sortBy ?? '') as '' | SortField
})

async function onMobileSortFieldChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as '' | SortField

  if (!v) {
    if (store.ordering.length) store.ordering = []
    if (store.sortBy) {
      if (store.sortOrder === 'asc') store.toggleSort(store.sortBy)
      if (store.sortOrder === 'desc') store.toggleSort(store.sortBy)
    }
    await store.fetchFirstPage()
    listRef.value?.scrollToTop()
    return
  }

  await onSort(v)
}

async function toggleMobileSortDir() {
  if (!sortFieldValue.value) return
  if (store.sortOrder === 'asc') {
    store.toggleSort(sortFieldValue.value)
  } else if (store.sortOrder === 'desc') {
    store.toggleSort(sortFieldValue.value)
    store.toggleSort(sortFieldValue.value)
  } else {
    store.toggleSort(sortFieldValue.value)
  }

  await store.fetchFirstPage()
  listRef.value?.scrollToTop()
}

function icon(field: SortField) {
  if (store.ordering.length) return '↕'
  if (store.sortBy !== field) return '↕'
  if (store.sortOrder === 'asc') return '↑'
  if (store.sortOrder === 'desc') return '↓'
  return '↕'
}

/** ✅ Pin：把指定 user 固定在全域第 N 筆（1-based） */
async function pin(u: User) {
  const defaultPos = store.pin?.id === u.id ? String(store.pin.position) : '1'
  const raw = window.prompt(`要把「${u.name}」固定在第幾筆？（1 = 第一筆）`, defaultPos)
  if (raw == null) return

  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) {
    window.alert('請輸入 >= 1 的數字')
    return
  }

  store.setPin({ id: u.id, position: Math.floor(n) })
  await store.fetchFirstPage()
  listRef.value?.scrollToTop()
}

/** ===== Pure DIV Modal ===== */
const panelRef = ref<HTMLElement | null>(null)

const modal = reactive({
  open: false,
  mode: 'create' as 'create' | 'edit',
  submitting: false,
  error: '',
})

const form = reactive({
  id: 0,
  name: '',
  position: '',
  location: '',
  age: 30,
  birthdate: '',
})

function lockBodyScroll(lock: boolean) {
  document.body.style.overflow = lock ? 'hidden' : ''
}

function openCreate() {
  modal.mode = 'create'
  modal.error = ''
  modal.submitting = false
  Object.assign(form, {
    id: 0,
    name: '',
    position: '',
    location: '',
    age: 30,
    birthdate: '',
  })
  openModal()
}

function openEdit(u: User) {
  modal.mode = 'edit'
  modal.error = ''
  modal.submitting = false
  Object.assign(form, { ...u })
  openModal()
}

async function openModal() {
  modal.open = true
  lockBodyScroll(true)
  await nextTick()
  panelRef.value?.focus()
  window.addEventListener('keydown', onGlobalKeydown)
}

function closeModal() {
  modal.open = false
  modal.submitting = false
  modal.error = ''
  lockBodyScroll(false)
  window.removeEventListener('keydown', onGlobalKeydown)
}

function onBackdropClick() {
  closeModal()
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeModal()
}

function validate() {
  if (!form.name.trim()) return 'Name is required'
  if (!form.position.trim()) return 'Position is required'
  if (!form.location.trim()) return 'Location is required'
  if (!Number.isFinite(form.age) || form.age < 0) return 'Age must be a valid number'
  if (!form.birthdate) return 'Birthdate is required'
  return ''
}

async function submit() {
  const msg = validate()
  if (msg) {
    modal.error = msg
    return
  }

  modal.submitting = true
  modal.error = ''

  try {
    if (modal.mode === 'create') {
      await store.create({
        name: form.name,
        position: form.position,
        location: form.location,
        age: form.age,
        birthdate: form.birthdate,
      })
    } else {
      await store.update({
        id: form.id,
        name: form.name,
        position: form.position,
        location: form.location,
        age: form.age,
        birthdate: form.birthdate,
      })
    }
    closeModal()
  } catch {
    modal.error = store.error || 'Save failed'
  } finally {
    modal.submitting = false
  }
}

/** delete */
async function remove(u: User) {
  const ok = window.confirm(`Delete ${u.name}?`)
  if (!ok) return
  await store.remove(u.id)
}

onBeforeUnmount(() => {
  lockBodyScroll(false)
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<style scoped lang="scss">
$page-max: 1100px;
$border: #d1d5db;
$border-light: #eef2f7;
$bg-header: #fafafa;
$text-main: #111827;
$text-sub: #444;
$text-muted: #666;
$error: #b42318;

.page {
  max-width: $page-max;
  margin: 0 auto;
  padding: 16px;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, 'Noto Sans',
    'PingFang TC', 'Microsoft JhengHei', sans-serif;
}

.topbar {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.toolbarRight {
  display: flex;
  gap: 10px;
  align-items: center;
}

.searchPanel {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  align-items: center;
}

.input {
  border: 1px solid $border;
  padding: 8px 10px;
  border-radius: 10px;
  outline: none;
  min-width: 0;

  &:focus {
    border-color: #9ca3af;
  }
}

.btn {
  border: 1px solid $border;
  background: $text-main;
  color: #fff;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;

  &.subtle {
    background: #fff;
    color: $text-main;
  }
  &.danger {
    background: $error;
    border-color: $error;
  }
  &.btn--sm {
    padding: 6px 10px;
    border-radius: 10px;
    font-size: 12px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* Desktop header + rows */
.headerRow {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.5fr 1fr 240px;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid $border;
  border-radius: 12px;
  background: $bg-header;
}

.th {
  background: transparent;
  border: none;
  text-align: left;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  color: #333;
  text-align: center;

  &--actions {
    cursor: default;
  }
}

.row--desktop {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.5fr 1fr 240px;
  gap: 8px;
  padding: 0 12px;
  align-items: center;
  border-bottom: 1px solid $border-light;

  &:hover {
    background: $bg-header;
  }
}

.cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;

  &--right {
    text-align: right;
  }
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

/* Mobile sort dropdown */
.select {
  border: 1px solid $border;
  padding: 8px 10px;
  border-radius: 10px;
  outline: none;
  background: #fff;
  color: #333;
  min-width: 0;

  &:focus {
    border-color: #9ca3af;
  }
}

.mobileSort {
  display: none;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid $border;
  border-radius: 12px;
  background: $bg-header;

  &__label {
    font-weight: 700;
    color: #333;
    white-space: nowrap;
  }

  &__controls {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    width: 100%;
  }

  &__dir {
    width: 44px;
    padding: 8px 0;
    text-align: center;
  }

  &__clearPin {
    justify-self: end;
  }
}

@media (max-width: 720px) {
  .mobileSort {
    display: grid;
  }
}

/* Mobile cards */
.row--mobile {
  display: none;
}

.card {
  border: 1px solid $border-light;
  border-radius: 14px;
  padding: 12px;
  margin: 10px 12px;
  background: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04);

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  &__title {
    display: flex;
    gap: 8px;
    align-items: center;

    .name {
      font-weight: 800;
      color: #111827;
      font-size: 16px;
    }
    .age {
      display: inline-flex;
      width: fit-content;
      border: 1px solid $border;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 12px;
      color: #374151;
      background: #fff;
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  &__meta {
    display: grid;
    gap: 8px;
  }
}

.kv {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px;
  align-items: baseline;

  .k {
    color: $text-muted;
    font-size: 12px;
  }
  .v {
    color: #111827;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.footerHint {
  padding: 12px;
  text-align: center;
  color: $text-muted;
  font-size: 12px;
}

/* ===== Modal ===== */
.modal {
  position: fixed;
  inset: 0;
  z-index: 9999;

  .modal__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
  }

  .modal__panel {
    position: relative;
    z-index: 1;
    width: min(720px, calc(100vw - 24px));
    margin: 10vh auto 0;
    background: #fff;
    border-radius: 14px;
    border: 1px solid $border;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
    overflow: hidden;
    outline: none;
  }

  .modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: $bg-header;
    border-bottom: 1px solid $border;
  }

  .modal__title {
    margin: 0;
    font-size: 18px;
    color: $text-main;
  }

  .iconBtn {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 6px 8px;
    border-radius: 10px;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }
  }

  .modal__body {
    padding: 16px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .label {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      font-weight: 700;
      color: $text-main;
    }

    .hint {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      border: 1px solid $border;
      font-size: 12px;
      color: #374151;
      cursor: help;
    }
  }

  .formError {
    margin: 10px 0 0;
    color: $error;
  }

  .modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 14px;
  }
}

/* ===== RWD ===== */
@media (max-width: 960px) {
  .searchPanel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbarRight {
    justify-content: flex-end;
  }
}

@media (max-width: 720px) {
  /* hide desktop table */
  .headerRow {
    display: none;
  }
  .row--desktop {
    display: none;
  }

  /* show mobile UI */
  .mobileSort {
    display: grid;
  }
  .row--mobile {
    display: block;
  }

  .page {
    padding: 12px;
  }

  .modal {
    .modal__panel {
      margin: 6vh auto 0;
    }
    .grid {
      grid-template-columns: 1fr;
    }
  }

  /* buttons stretch */
  .toolbarRight .btn {
    width: 100%;
  }
}
</style>
