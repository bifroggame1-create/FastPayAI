'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { initTelegramWebApp, getTelegramUser, getTelegramStartParam } from '@/lib/telegram'
import { userApi } from '@/lib/api'

export default function TelegramProvider({ children }: { children: React.ReactNode }) {
  const { setUser } = useAppStore()

  useEffect(() => {
    initTelegramWebApp()

    const loadUser = async () => {
      const telegramUser = getTelegramUser()
      const startParam = getTelegramStartParam() // Реферальный код из start param

      if (telegramUser) {
        try {
          // Создаем пользователя из Telegram данных
          const userData = {
            id: telegramUser.id,
            username: telegramUser.username,
            name: telegramUser.name, // Используем имя из Telegram (first_name + last_name)
            avatar: telegramUser.avatar || `https://i.pravatar.cc/150?u=${telegramUser.id}`,
            joinedAt: new Date().toISOString(),
            referredBy: startParam || undefined, // Передаем реферальный код, если есть
            stats: {
              rating: 0,
              reviewsCount: 0,
              ordersCount: 0,
              returnsCount: 0,
            },
          }

          const user = await userApi.create(userData)
          setUser(user)
        } catch (error) {
          console.error('Error loading user:', error)
          // Fallback: set user directly without API call
          setUser({
            id: telegramUser.id,
            username: telegramUser.username,
            name: telegramUser.name, // Используем имя из Telegram (first_name + last_name)
            avatar: telegramUser.avatar || `https://i.pravatar.cc/150?u=${telegramUser.id}`,
            joinedAt: new Date().toISOString(),
            stats: {
              rating: 0,
              reviewsCount: 0,
              ordersCount: 0,
              returnsCount: 0,
            },
          })
        }
      } else {
        // Development mode - use mock user with username
        const mockUser = {
          id: 'dev_user',
          username: 'devuser',
          name: 'Dev User', // Имя разработчика для тестирования
          avatar: 'https://i.pravatar.cc/150?u=dev_user',
          joinedAt: new Date().toISOString(),
          referralCode: 'FASTPAYDEV',
          referralCount: 0,
          bonusBalance: 100,
          stats: {
            rating: 0,
            reviewsCount: 0,
            ordersCount: 0,
            returnsCount: 0,
          },
        }
        setUser(mockUser)
      }
    }

    loadUser()
  }, [setUser])

  return <>{children}</>
}
