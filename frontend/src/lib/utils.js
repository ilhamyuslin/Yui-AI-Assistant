import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn() — merge Tailwind classes safely (shadcn/ui pattern)
 * Combines clsx (conditional classes) + tailwind-merge (deduplication)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
