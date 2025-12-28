'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns/format'
import { ru } from 'date-fns/locale/ru'
import { getTelegramUser } from '@/lib/telegram'
import { userApi } from '@/lib/api'

interface UserProfile {
  id: string
  name: string
  username?: string
  avatar?: string
  joinedAt?: string
  bonusBalance?: number
  referralCode?: string
  referralCount?: number
  stats?: {
    rating: number
    reviewsCount: number
    ordersCount: number
    returnsCount: number
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const telegramUser = getTelegramUser()
      if (telegramUser) {
        // Try to get user from backend
        try {
          const userData = await userApi.getById(telegramUser.id)
          setUser({
            ...userData,
            id: telegramUser.id,
            name: userData.name || telegramUser.name,
            avatar: userData.avatar || telegramUser.avatar,
            stats: userData.stats || { rating: 5.0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 }
          })
        } catch {
          // Use telegram user data as fallback
          setUser({
            id: telegramUser.id,
            name: telegramUser.name,
            username: telegramUser.username,
            avatar: telegramUser.avatar,
            stats: { rating: 5.0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 }
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <p className="text-light-text-secondary dark:text-dark-text-secondary">Не удалось загрузить профиль</p>
      </div>
    )
  }

  const stats = user.stats || { rating: 5.0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title="Профиль"
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={user.avatar || '/default-avatar.png'}
            alt={user.name}
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">{user.name}</h2>
            {user.joinedAt && (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                На платформе с {format(new Date(user.joinedAt), 'd MMM. yyyy', { locale: ru })}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push('/orders')}
          className="w-full bg-light-card dark:bg-dark-card hover:bg-light-border dark:hover:bg-dark-border text-accent-cyan py-3 rounded-lg mb-6 transition-colors border border-light-border dark:border-dark-border flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Мои заказы
        </button>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="text-lg font-semibold text-light-text dark:text-dark-text">{stats.rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{stats.reviewsCount} отзывов</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-lg font-semibold text-light-text dark:text-dark-text">{stats.ordersCount}</span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">заказов</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-lg font-semibold text-light-text dark:text-dark-text">{stats.returnsCount}</span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">возвратов</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-pink-500 fill-current" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-lg font-semibold text-light-text dark:text-dark-text">-</span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Нравится</p>
          </div>
        </div>

        {/* Бонусный баланс */}
        <div className="bg-gradient-to-r from-accent-blue to-accent-cyan rounded-2xl p-6 mb-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Бонусный баланс</h3>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold mb-1">{user.bonusBalance || 0} ₽</p>
          <p className="text-sm opacity-90">Можно использовать при оплате</p>
        </div>

        {/* Реферальная система */}
        <ReferralSection user={user} />

        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 border border-light-border dark:border-dark-border">
          <h3 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">Отзывы</h3>

          <div className="flex flex-col items-center justify-center py-10">
            <svg
              className="w-16 h-16 text-light-text-secondary dark:text-dark-text-secondary mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <h4 className="text-base font-medium mb-2 text-light-text dark:text-dark-text">Отзывов пока нет</h4>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary text-center">
              Зато есть комплимент от нас — ты чудесно выглядишь!
            </p>
          </div>
        </div>

        {/* Legal Links */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-4">
          <a
            href="https://telegra.ph/Politika-konfidencialnosti-08-15-17"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan transition-colors"
          >
            Политика конфиденциальности
          </a>
          <span className="text-light-text-secondary dark:text-dark-text-secondary">•</span>
          <a
            href="https://telegra.ph/Polzovatelskoe-soglashenie-08-15-10"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-accent-cyan transition-colors"
          >
            Пользовательское соглашение
          </a>
        </div>

        <div className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          by <span className="text-accent-cyan">@CheffDev</span> with &lt;3
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// Referral Section Component
function ReferralSection({ user }: { user: { id: string; referralCode?: string; referralCount?: number } }) {
  const [copied, setCopied] = useState(false)
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'FastPayAI_bot'

  // Generate referral link using user ID
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.id}`

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = () => {
    const text = '🎁 Присоединяйся к FastPay и получи 100₽ на первую покупку!'
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
    window.open(shareUrl, '_blank')
  }

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 mb-4 border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Пригласи друзей</h3>
        <span className="text-sm text-accent-cyan font-medium">+200₽ за друга</span>
      </div>

      {/* Referral Link */}
      <div className="bg-light-bg dark:bg-dark-bg rounded-xl p-4 mb-4">
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
          Твоя пригласительная ссылка
        </p>
        <div className="flex items-center gap-2 bg-light-card dark:bg-dark-card rounded-lg p-3 border border-light-border dark:border-dark-border">
          <span className="flex-1 text-sm text-light-text dark:text-dark-text truncate font-mono">
            {referralLink}
          </span>
          <button
            onClick={copyLink}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-accent-cyan text-white hover:bg-accent-cyan/90'
            }`}
          >
            {copied ? '✓' : 'Копировать'}
          </button>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={shareLink}
        className="w-full py-3 bg-gradient-to-r from-accent-blue to-accent-cyan text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-4"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
        </svg>
        Поделиться в Telegram
      </button>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-light-text-secondary dark:text-dark-text-secondary">Приглашено друзей</span>
        <span className="font-semibold text-light-text dark:text-dark-text">{user.referralCount || 0}</span>
      </div>

      {/* Info */}
      <div className="p-3 bg-accent-blue/10 dark:bg-accent-blue/20 rounded-lg">
        <p className="text-xs text-light-text dark:text-dark-text">
          💰 Ты получаешь <span className="font-bold text-accent-cyan">200₽</span> за каждого друга<br />
          🎁 Друг получает <span className="font-bold text-accent-cyan">100₽</span> при регистрации
        </p>
      </div>
    </div>
  )
}
