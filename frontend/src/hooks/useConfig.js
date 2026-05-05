import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configApi } from '@/lib/api'

export function useConfig() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const { data } = await configApi.get()
      return data
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => configApi.update(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['config'], data.data)
      queryClient.invalidateQueries({ queryKey: ['config'] })
    }
  })

  return {
    config: query.data,
    loading: query.isLoading,
    isSaving: updateMutation.isPending,
    update: updateMutation.mutateAsync,
    refresh: query.refetch
  }
}
