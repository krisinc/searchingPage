export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

export interface ApiError {
  status: number
  message: string
}

export interface MockOptions {
  minDelayMs?: number
  maxDelayMs?: number
  failureRate?: number // 0 ~ 1
}

const defaultOptions: Required<MockOptions> = {
  minDelayMs: 120,
  maxDelayMs: 420,
  failureRate: 0
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function maybeFail(failureRate: number) {
  if (failureRate > 0 && Math.random() < failureRate) {
    const err: ApiError = { status: 500, message: 'Mock random failure' }
    throw err
  }
}

/** 讓你的 API 看起來像 http.get/post/put/delete */
export const mockHttp = {
  async request<T>(fn: () => T | Promise<T>, options?: MockOptions): Promise<ApiResponse<T>> {
    const opt = { ...defaultOptions, ...(options ?? {}) }
    await sleep(randomInt(opt.minDelayMs, opt.maxDelayMs))
    maybeFail(opt.failureRate)

    try {
      const result = await fn()
      return { data: result, status: 200 }
    } catch (e: any) {
      // 你也可以在 users.mock.ts 直接 throw {status, message}
      const err: ApiError = {
        status: e?.status ?? 400,
        message: e?.message ?? 'Bad Request'
      }
      throw err
    }
  }
}
