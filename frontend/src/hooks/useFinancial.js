// v3.0 - TanStack Query Integrated
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { statsApi, transactionApi } from '@/lib/api'

dayjs.extend(isoWeek)

/**
 * useStats — fetch aggregated financial stats with caching.
 */
export function useStats(startDate, endDate, categories = []) {
  return useQuery({
    queryKey: ['stats', startDate, endDate, categories],
    queryFn: async () => {
      const { data } = await statsApi.get(startDate, endDate, categories)
      return data
    },
    enabled: startDate !== undefined && endDate !== undefined, // Tetap jalankan meski null (untuk filter 'All')
  })
}

/**
 * useTransactions — fetch transaction list with caching and mutations.
 */
export function useTransactions(params = {}) {
  const queryClient = useQueryClient()

  // 1. Query for Data
  const query = useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const { data } = await transactionApi.getAll(params)
      return data
    }
  })

  // 2. Mutations
  const addMutation = useMutation({
    mutationFn: (data) => transactionApi.create(data),
    onSuccess: () => {
      // Refresh semua data yang terpengaruh oleh transaksi baru
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => transactionApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => transactionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })

  return {
    transactions: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isMutating: addMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  }
}

/**
 * Helper to get the actual payday adjusted for weekends (last working day)
 */
export function getActualPayday(date, payDay) {
  let d = dayjs(date).date(payDay)
  if (d.date() !== payDay && payDay > 28) {
    d = dayjs(date).endOf('month')
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
        startDate: today.subtract(1, 'day').format('YYYY-MM-DD'),
        endDate: today.add(1, 'day').format('YYYY-MM-DD')
      }
    case 'week':
      return {
        startDate: today.startOf('isoWeek').format('YYYY-MM-DD'),
        endDate: today.endOf('isoWeek').format('YYYY-MM-DD')
      }
    case 'cycle': {
      let start, end
      const currentPayday = getActualPayday(today, payDay)

      if (today.isBefore(currentPayday, 'day')) {
        start = getActualPayday(today.subtract(1, 'month'), payDay)
        end = currentPayday.subtract(1, 'day')
      } else {
        start = currentPayday
        end = getActualPayday(today.add(1, 'month'), payDay).subtract(1, 'day')
      }

      return {
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD')
      }
    }
    case 'all':
      return { startDate: null, endDate: null }
    default:
      return { startDate: null, endDate: null }
  }
}
