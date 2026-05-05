import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/lib/api'

export function useProfile() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await profileApi.get()
      return data
    }
  })

  const updateMutation = useMutation({
    mutationFn: (updates) => profileApi.update(updates),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data.data)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // Juga invalidate stats karena budget_cycle_day mungkin berubah
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    }
  })

  return {
    profile: query.data,
    loading: query.isLoading,
    isSaving: updateMutation.isPending,
    update: updateMutation.mutateAsync,
    refresh: query.refetch
  }
}
