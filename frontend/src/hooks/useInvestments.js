import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { investmentApi } from '@/lib/api'

/**
 * useInvestments — manage investment portfolio with TanStack Query
 */
export function useInvestments() {
  const queryClient = useQueryClient()

  // 1. Query for Data
  const { data, isLoading: loading, error, refetch: fetch } = useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      const { data } = await investmentApi.getAll()
      return data
    }
  })

  // 2. Mutations
  const addMutation = useMutation({
    mutationFn: (payload) => investmentApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] })
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => investmentApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] })
    }
  })

  const removeMutation = useMutation({
    mutationFn: (id) => investmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] })
    }
  })

  return { 
    investments: data?.investments || [], 
    totalPortfolio: data?.totalPortfolio || 0, 
    totalCost: data?.totalCost || 0, 
    loading, 
    error: error?.message || null, 
    fetch, 
    add: addMutation.mutateAsync, 
    update: updateMutation.mutateAsync, 
    remove: removeMutation.mutateAsync 
  }
}
