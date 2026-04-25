import { useState, useCallback } from 'react'
import { investmentApi } from '@/lib/api'

/**
 * useInvestments — manage investment portfolio state & CRUD
 */
export function useInvestments() {
  const [investments, setInvestments] = useState([])
  const [totalPortfolio, setTotalPortfolio] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await investmentApi.getAll()
      setInvestments(data.investments)
      setTotalPortfolio(data.totalPortfolio)
      setTotalCost(data.totalCost)
    } catch (err) {
      console.error('[useInvestments] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const add = useCallback(async (payload) => {
    const { data } = await investmentApi.create(payload)
    setInvestments(prev => [data, ...prev])
    setTotalPortfolio(prev => prev + Number(data.current_value ?? data.purchase_value))
    setTotalCost(prev => prev + Number(data.purchase_value))
    return data
  }, [])

  const update = useCallback(async (id, payload) => {
    const { data } = await investmentApi.update(id, payload)
    setInvestments(prev => prev.map(inv => inv.id === id ? data : inv))
    // Recalculate totals after update
    setInvestments(prev => {
      const updated = prev.map(inv => inv.id === id ? data : inv)
      setTotalPortfolio(updated.reduce((s, i) => s + Number(i.current_value ?? i.purchase_value), 0))
      setTotalCost(updated.reduce((s, i) => s + Number(i.purchase_value), 0))
      return updated
    })
    return data
  }, [])

  const remove = useCallback(async (id) => {
    await investmentApi.delete(id)
    setInvestments(prev => {
      const next = prev.filter(inv => inv.id !== id)
      setTotalPortfolio(next.reduce((s, i) => s + Number(i.current_value ?? i.purchase_value), 0))
      setTotalCost(next.reduce((s, i) => s + Number(i.purchase_value), 0))
      return next
    })
  }, [])

  return { investments, totalPortfolio, totalCost, loading, error, fetch, add, update, remove }
}
