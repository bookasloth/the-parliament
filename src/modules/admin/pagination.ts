// Shared URL-param pagination for admin list pages.
export const PAGE_SIZE = 50

export interface PageParams {
  page: number
  skip: number
  take: number
}

/** Clamp a raw ?page= value to a 1-based page and derive skip/take. */
export function parsePage(raw: string | string[] | undefined, size = PAGE_SIZE): PageParams {
  const n = Array.isArray(raw) ? raw[0] : raw
  const page = Math.max(1, Math.floor(Number(n)) || 1)
  return { page, skip: (page - 1) * size, take: size }
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size))
}

/** First value of a possibly-array searchParam, trimmed to non-empty or undefined. */
export function firstParam(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw
  const t = v?.trim()
  return t ? t : undefined
}
