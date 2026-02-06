import type { User } from './users'

const STORAGE_KEY = 'db.users.v1'

export interface SeedOptions {
  count?: number
  force?: boolean // true = 強制重建
}

/** 產生 yyyy-mm-dd */
function randomDate(start: Date, end: Date) {
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  )
  return d.toISOString().slice(0, 10)
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomName() {
  const first = ['John', 'Mary', 'Alex', 'Chris', 'David', 'Anna', 'Linda', 'Peter']
  const last = ['Chen', 'Wang', 'Lin', 'Chang', 'Lee', 'Wu', 'Liu']
  return `${randomItem(first)} ${randomItem(last)}`
}

function randomAge() {
  return Math.floor(Math.random() * (65 - 20 + 1)) + 20
}

export function seedUsers(options?: SeedOptions) {
  const count = options?.count ?? 10000
  const force = options?.force ?? false

  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing && !force) {
    console.info('[seedUsers] users already exist, skip seeding')
    return
  }

  const positions = ['Engineer', 'Manager', 'Designer', 'QA', 'HR', 'Sales']
  const locations = ['Taipei', 'Taichung', 'Kaohsiung', 'Tainan', 'Hsinchu']

  const users: User[] = []

  for (let i = 0; i < count; i++) {
    const age = randomAge()
    users.push({
      id: Date.now() + i, // mock unique id
      name: randomName(),
      position: randomItem(positions),
      location: randomItem(locations),
      age,
      birthdate: randomDate(
        new Date(new Date().getFullYear() - age - 1, 0, 1),
        new Date(new Date().getFullYear() - age, 11, 31)
      )
    })
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  console.info(`[seedUsers] seeded ${users.length} users`)
}
