import { useState, useCallback } from 'react'
import { statsApi } from '@/lib/api'

/**
 * Hook to manage financial budgets: fetching, updating, and loading states.
 */
export function useBudgets() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    console.log('[useBudgets] Fetching with params:', params)
    try {
      const { data } = await statsApi.getBudgets(params)
      console.log('[useBudgets] Data received:', data?.length, 'items')
      setBudgets(data || [])
    } catch (err) {
      console.error('[useBudgets] Error:', err)
      setError(err.message)
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }, [])

  const update = useCallback(async (category, amount, behavior_group) => {
    setLoading(true)
    try {
      await statsApi.updateBudget({ 
        category, 
        amount: parseFloat(amount) || 0,
        behavior_group: behavior_group || 'Want'
      })
      return true
    } catch (err) {
      console.error('[useBudgets] Update error:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const remove = useCallback(async (category) => {
    setLoading(true)
    try {
      await statsApi.deleteBudget(category)
      return true
    } catch (err) {
      console.error('[useBudgets] Delete error:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const rename = useCallback(async (oldName, newName) => {
    setLoading(true)
    try {
      await statsApi.renameCategory(oldName, newName)
      return true
    } catch (err) {
      console.error('[useBudgets] Rename error:', err)
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    budgets,
    loading,
    error,
    fetch,
    update,
    remove,
    rename
  }
}
