import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product, User } from '@/types'

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  text: string
  timestamp: string
  type: 'text' | 'system' | 'notification'
}

export interface Chat {
  id: string
  type: 'seller' | 'support' | 'notification'
  title: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: string
  unread: number
  sellerId?: string
  productId?: string
}

interface AppState {
  user: User | null
  favorites: string[]
  selectedCategory: string
  selectedFilter: 'all' | 'new' | 'used'
  searchQuery: string
  theme: 'light' | 'dark'
  language: 'ru' | 'en'
  currency: 'RUB' | 'USD' | 'EUR'

  // Chats
  chats: Chat[]
  messages: ChatMessage[]
  unreadChats: number

  setUser: (user: User | null) => void
  toggleFavorite: (productId: string) => void
  setSelectedCategory: (category: string) => void
  setSelectedFilter: (filter: 'all' | 'new' | 'used') => void
  setSearchQuery: (query: string) => void
  toggleTheme: () => void
  setLanguage: (language: 'ru' | 'en') => void
  setCurrency: (currency: 'RUB' | 'USD' | 'EUR') => void
  isFavorite: (productId: string) => boolean

  // Chat actions
  addChat: (chat: Chat) => void
  addMessage: (message: ChatMessage) => void
  markChatAsRead: (chatId: string) => void
  addNotification: (title: string, message: string, type: 'referral' | 'purchase' | 'system') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      favorites: [],
      selectedCategory: 'all',
      selectedFilter: 'all',
      searchQuery: '',
      theme: 'dark',
      language: 'ru',
      currency: 'RUB',
      chats: [],
      messages: [],
      unreadChats: 0,

      setUser: (user) => set({ user }),

      toggleFavorite: (productId) => set((state) => ({
        favorites: state.favorites.includes(productId)
          ? state.favorites.filter(id => id !== productId)
          : [...state.favorites, productId]
      })),

      setSelectedCategory: (category) => set({ selectedCategory: category }),

      setSelectedFilter: (filter) => set({ selectedFilter: filter }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark'
        if (typeof window !== 'undefined') {
          document.documentElement.classList.toggle('dark', newTheme === 'dark')
          localStorage.setItem('theme', newTheme)
        }
        return { theme: newTheme }
      }),

      setLanguage: (language) => set({ language }),

      setCurrency: (currency) => set({ currency }),

      isFavorite: (productId) => get().favorites.includes(productId),

      addChat: (chat) => set((state) => {
        const existing = state.chats.find(c => c.id === chat.id)
        if (existing) return state
        return {
          chats: [chat, ...state.chats],
          unreadChats: state.unreadChats + (chat.unread > 0 ? 1 : 0)
        }
      }),

      addMessage: (message) => set((state) => {
        const chatIndex = state.chats.findIndex(c => c.id === message.chatId)
        if (chatIndex === -1) return { messages: [...state.messages, message] }

        const updatedChats = [...state.chats]
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: message.text,
          lastMessageTime: message.timestamp,
          unread: updatedChats[chatIndex].unread + 1
        }

        return {
          messages: [...state.messages, message],
          chats: updatedChats,
          unreadChats: state.unreadChats + 1
        }
      }),

      markChatAsRead: (chatId) => set((state) => {
        const chatIndex = state.chats.findIndex(c => c.id === chatId)
        if (chatIndex === -1) return state

        const chat = state.chats[chatIndex]
        const unreadDiff = chat.unread > 0 ? 1 : 0

        const updatedChats = [...state.chats]
        updatedChats[chatIndex] = { ...chat, unread: 0 }

        return {
          chats: updatedChats,
          unreadChats: Math.max(0, state.unreadChats - unreadDiff)
        }
      }),

      addNotification: (title, message, type) => {
        const chatId = `notification-${Date.now()}`
        const notificationChat: Chat = {
          id: chatId,
          type: 'notification',
          title: title,
          avatar: type === 'referral' ? '/icons/referral.svg' : type === 'purchase' ? '/icons/purchase.svg' : '/icons/system.svg',
          lastMessage: message,
          lastMessageTime: new Date().toISOString(),
          unread: 1
        }

        const notificationMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          chatId,
          senderId: 'system',
          senderName: 'Система',
          text: message,
          timestamp: new Date().toISOString(),
          type: 'notification'
        }

        set((state) => ({
          chats: [notificationChat, ...state.chats],
          messages: [...state.messages, notificationMessage],
          unreadChats: state.unreadChats + 1
        }))
      }
    }),
    {
      name: 'fastpay-storage',
      partialize: (state) => ({
        favorites: state.favorites,
        theme: state.theme,
        language: state.language,
        currency: state.currency,
        chats: state.chats,
        messages: state.messages
      })
    }
  )
)
