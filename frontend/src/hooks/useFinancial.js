import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { statsApi, transactionApi, accountApi, configApi } from '@/lib/api'

dayjs.extend(isoWeek)

/**
 * useStats — fetch aggregated financial stats for a date range.
 */
export function useStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async (startDate, endDate, categories = []) => {
    setLoading(true)
    setError(null)
    console.log('[useStats] Fetching:', startDate, 'to', endDate, 'Categories:', categories)
    try {
      const { data } = await statsApi.get(startDate, endDate, categories)
      console.log('[useStats] Data received:', data)
      setStats(data)
    } catch (err) {
      console.error('[useStats] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { stats, loading, error, fetch }
}

/**
 * useTransactions — fetch transaction list with optional filters.
 */
export function useTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async (params = {}) => {
    setLoading(true)
    console.log('[useTransactions] Fetching with params:', params)
    try {
      const { data } = await transactionApi.getAll(params)
      console.log('[useTransactions] Data received:', data?.length, 'items')
      setTransactions(data)
    } catch (err) {
      console.error('[useTransactions] Error:', err)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (id) => {
    await transactionApi.delete(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  const update = useCallback(async (id, data) => {
    const { data: updated } = await transactionApi.update(id, data)
    setTransactions(prev => prev.map(t => t.id === id ? updated : t))
  }, [])

  const add = useCallback(async (data) => {
    const { data: result } = await transactionApi.create(data)
    return result
  }, [])

  return { transactions, loading, fetch, remove, update, add }
}

/**
 * Helper to get the actual payday adjusted for weekends (last working day)
 */
function getActualPayday(date, payDay) {
  let d = date.date(payDay)
  // Ensure we don't overflow the month (e.g. Feb 30)
  if (d.date() !== payDay && payDay > 28) {
    d = date.endOf('month')
  }

  const dayOfWeek = d.day() // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 6) return d.subtract(1, 'day')
  if (dayOfWeek === 0) return d.subtract(2, 'day')
  return d
}

export function getQuickFilterRange(filter, payDay = 25) {
  const today = dayjs()
  switch (filter) {
    case 'today':
      return {
        startDate: today.subtract(1, 'day').startOf('day').toISOString(),
        endDate: today.add(1, 'day').endOf('day').toISOString()
      }
    case 'week':
      return {
        startDate: today.startOf('isoWeek').toISOString(),
        endDate: today.endOf('day').toISOString()
      }
    case 'cycle': {
      let start, end

      const currentPayday = getActualPayday(today, payDay)

      if (today.isBefore(currentPayday, 'day')) {
        start = getActualPayday(today.subtract(1, 'month'), payDay)
        end = currentPayday.subtract(1, 'day').endOf('day')
      } else {
        start = currentPayday
        end = getActualPayday(today.add(1, 'month'), payDay).subtract(1, 'day').endOf('day')
      }

      return {
        startDate: start.startOf('day').toISOString(),
        endDate: end.toISOString()
      }
    }
    case 'all':
      return { startDate: null, endDate: null }
    default:
      return { startDate: null, endDate: null }
  }
}
