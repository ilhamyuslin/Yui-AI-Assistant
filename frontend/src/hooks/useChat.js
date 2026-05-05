import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/lib/chatApi'
import { useState, useEffect } from 'react'

export function useChat() {
  const queryClient = useQueryClient()

  // 1. History & Live Messages Cache
  const { data, isLoading: loadingHistory } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: async () => {
      const res = await chatApi.getChatHistory()
      if (!res.success) return { messages: [], totalTokens: 0 }
      
      const loadedMessages = []
      res.data.forEach((msg, messageIndex) => {
        if (!msg.text || msg.text.trim() === "" || msg.text === "null") return
        
        if (msg.sender === 'user' && (msg.text === 'Konfirmasi simpan transaksi.' || msg.text === 'Batalkan transaksi.')) {
          return;
        }

        if (msg.sender === 'ai' && msg.text.includes('[PENDING_TX]')) {
          const lines = msg.text.split('\n')
          lines.forEach((line, idx) => {
            if (line.startsWith('[PENDING_TX]')) {
              try {
                const txStr = line.replace('[PENDING_TX]', '').trim()
                const txData = JSON.parse(txStr)
                const isStale = messageIndex < res.data.length - 1;
                loadedMessages.push({ role: 'ai', type: 'pending_tx', content: txData, confirmed: false, id: msg.id + '_' + idx, isHistory: isStale })
              } catch (e) { /* ignore */ }
            } else if (line.trim()) {
              loadedMessages.push({ role: 'ai', type: 'text', content: line, id: msg.id + '_' + idx })
            }
          })
        } else {
          loadedMessages.push({ role: msg.sender, type: 'text', content: msg.text, id: msg.id })
        }
      })
      return { messages: loadedMessages, totalTokens: res.totalTokens || 0 }
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  })

  const messages = data?.messages || []
  const totalTokens = data?.totalTokens || 0

  // 2. Draft Management
  const [draft, setDraft] = useState(() => localStorage.getItem('chat_draft') || '')

  useEffect(() => {
    localStorage.setItem('chat_draft', draft)
  }, [draft])

  // 3. Pending Drafts
  const [pendingDrafts, setPendingDrafts] = useState([])

  // 4. Update Cache Helpers
  const addMessage = (msg) => {
    queryClient.setQueryData(['chatMessages'], (old) => ({
      ...old,
      messages: [...(old?.messages || []), { ...msg, id: Date.now() + Math.random() }]
    }))
  }

  const updateLastMessage = (update) => {
    queryClient.setQueryData(['chatMessages'], (old) => {
      if (!old || !old.messages || old.messages.length === 0) return old
      const updatedMessages = [...old.messages]
      updatedMessages[updatedMessages.length - 1] = { ...updatedMessages[updatedMessages.length - 1], ...update }
      return { ...old, messages: updatedMessages }
    })
  }

  const setTokens = (tokens) => {
    queryClient.setQueryData(['chatMessages'], (old) => ({
      ...old,
      totalTokens: tokens
    }))
  }

  // 5. Mutations
  const clearMutation = useMutation({
    mutationFn: () => chatApi.clear(),
    onSuccess: () => {
      queryClient.setQueryData(['chatMessages'], { messages: [], totalTokens: 0 })
      setPendingDrafts([])
    }
  })

  return {
    messages,
    totalTokens,
    setTokens,
    loadingHistory,
    draft,
    setDraft,
    pendingDrafts,
    setPendingDrafts,
    addMessage,
    updateLastMessage,
    clearHistory: clearMutation.mutateAsync,
    isClearing: clearMutation.isPending
  }
}
