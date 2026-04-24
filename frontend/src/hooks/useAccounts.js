import { useState, useCallback, useEffect } from 'react'
import { accountApi } from '@/lib/api'

export function useAccounts() {
  const [accounts, setAccounts] = useState([])
  const [totalAssets, setTotalAssets] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await accountApi.getAll()
      setAccounts(res.data.accounts || [])
      setTotalAssets(res.data.totalAssets || 0)
      setError(null)
    } catch (err) {
      console.error('Error fetching accounts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const upsertAccount = async (data) => {
    try {
      if (data.id) {
        await accountApi.update(data.id, data)
      } else {
        await accountApi.create(data)
      }
      await fetchAccounts()
      return { success: true }
    } catch (err) {
      console.error('Error upserting account:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteAccount = async (id) => {
    try {
      await accountApi.delete(id)
      await fetchAccounts()
      return { success: true }
    } catch (err) {
      console.error('Error deleting account:', err)
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    accounts,
    totalAssets,
    loading,
    error,
    refresh: fetchAccounts,
    upsertAccount,
    deleteAccount
  }
}
