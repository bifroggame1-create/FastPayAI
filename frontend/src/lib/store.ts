import { create } from 'zustand'
import { Product, User } from '@/types'

interface AppState {
  user: User | null
  favorites: string[]
  selectedCategory: string
  selectedFilter: 'all' | 'new' | 'used'
  searchQuery: string
  theme: 'light' | 'dark'

  setUser: (user: User | null) => void
  toggleFavorite: (productId: string) => void
  setSelectedCategory: (category: string) => void
  setSelectedFilter: (filter: 'all' | 'new' | 'used') => void
  setSearchQuery: (query: string) => void
  toggleTheme: () => void
  isFavorite: (productId: string) => boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  favorites: [],
  selectedCategory: 'all',
  selectedFilter: 'all',
  searchQuery: '',
  theme: 'dark',

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

  isFavorite: (productId) => get().favorites.includes(productId),
}))
