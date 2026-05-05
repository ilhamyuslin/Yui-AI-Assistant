import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountApi } from '@/lib/api'

export function useAccounts() {
  const queryClient = useQueryClient()

  // 1. Fetching dengan sistem Caching (useQuery)
  const { 
    data, 
    isLoading: loading, 
    error, 
    refetch: refresh 
  } = useQuery({
    queryKey: ['accounts'], // ID Unik di Memori Pusat
    queryFn: async () => {
      const res = await accountApi.getAll()
      return {
        accounts: res.data.accounts || [],
        totalAssets: res.data.totalAssets || 0
      }
    }
  })

  const accounts = data?.accounts || []
  const totalAssets = data?.totalAssets || 0

  // 2. Mutation untuk Create/Update (Auto-refresh memori)
  const upsertMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return await accountApi.update(data.id, data)
      } else {
        return await accountApi.create(data)
      }
    },
    onSuccess: () => {
      // Beritahu Memori Pusat kalau data 'accounts' sudah basi, tolong refresh!
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })

  // 3. Mutation untuk Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await accountApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })

  return {
    accounts,
    totalAssets,
    loading,
    error: error?.message || null,
    refresh,
    upsertAccount: upsertMutation.mutateAsync,
    deleteAccount: deleteMutation.mutateAsync
  }
}
