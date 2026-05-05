import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { statsApi } from '@/lib/api'

/**
 * Hook to manage financial budgets with TanStack Query.
 */
export function useBudgets(params = {}) {
  const queryClient = useQueryClient()

  // 1. Query for Data
  const query = useQuery({
    queryKey: ['budgets', params],
    queryFn: async () => {
      const { data } = await statsApi.getBudgets(params)
      return data || []
    }
  })

  // 2. Mutations
  const updateMutation = useMutation({
    mutationFn: async ({ category, amount, behavior_group }) => {
      return await statsApi.updateBudget({ 
        category, 
        amount: parseFloat(amount) || 0,
        behavior_group: behavior_group || 'Want'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] }) // Budget berubah pengaruhi analisis
    }
  })

  const removeMutation = useMutation({
    mutationFn: (category) => statsApi.deleteBudget(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    }
  })

  const renameMutation = useMutation({
    mutationFn: ({ oldName, newName }) => statsApi.renameCategory(oldName, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    }
  })

  return {
    budgets: query.data || [],
    loading: query.isLoading,
    error: query.error,
    fetch: query.refetch,
    update: updateMutation.mutateAsync,
    remove_budget: removeMutation.mutateAsync, // Samain key-nya sama Overview.jsx
    rename: renameMutation.mutateAsync
  }
}
