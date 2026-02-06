import type { User } from './users'

const STORAGE_KEY = 'db.users.v1'

export interface SeedOptions {
  count?: number
  force?: boolean // true = 強制重建
}

/** 產生 yyyy-mm-dd */
function randomDate(start: Date, end: Date): string {
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  )
  return d.toISOString().slice(0, 10)
}

function randomItem<T>(arr: readonly [T, ...T[]]): T {
  const idx = Math.floor(Math.random() * arr.length)
  const v = arr[idx]
  if (v === undefined) {
    throw new Error('randomItem: unexpected undefined')
  }
  return v
}

function randomName(): string {
  const first = [
    'John',
    'Mary',
    'Alex',
    'Chris',
    'David',
    'Anna',
    'Linda',
    'Peter'
  ] as const

  const last = [
    'Chen',
    'Wang',
    'Lin',
    'Chang',
    'Lee',
    'Wu',
    'Liu'
  ] as const

  return `${randomItem(first)} ${randomItem(last)}`
}

function randomAge(): number {
  return Math.floor(Math.random() * (65 - 20 + 1)) + 20
}

export function seedUsers(options?: SeedOptions): void {
  const count = options?.count ?? 10000
  const force = options?.force ?? false

  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing && !force) {
    console.info('[seedUsers] users already exist, skip seeding')
    return
  }

  const positions = [
    'Engineer',
    'Manager',
    'Designer',
    'QA',
    'HR',
    'Sales'
  ] as const

  const locations = [
    'Taipei',
    'Taichung',
    'Kaohsiung',
    'Tainan',
    'Hsinchu'
  ] as const

  const users: User[] = []

  const currentYear = new Date().getFullYear()
  const baseId = Date.now()

  for (let i = 0; i < count; i++) {
    const age = randomAge()

    users.push({
      id: baseId + i, // mock unique id
      name: randomName(),
      position: randomItem(positions),
      location: randomItem(locations),
      age,
      birthdate: randomDate(
        new Date(currentYear - age - 1, 0, 1),
        new Date(currentYear - age, 11, 31)
      )
    })
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  console.info(`[seedUsers] seeded ${users.length} users`)
}
