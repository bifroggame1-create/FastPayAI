'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import BecomeSellerModal from '@/components/BecomeSellerModal'
import { useRouter } from 'next/navigation'
import { getTelegramUser } from '@/lib/telegram'
import { userApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'

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
  const { language, theme, toggleTheme } = useAppStore()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSellerModal, setShowSellerModal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const telegramUser = getTelegramUser()
      if (telegramUser) {
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

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'FastPayAI_bot'
  const referralLink = user ? `https://t.me/${botUsername}?start=ref_${user.id}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = () => {
    const text = language === 'ru'
      ? 'Присоединяйся к FastPay и получи 100 рублей на первую покупку!'
      : 'Join FastPay and get 100 RUB for your first purchase!'
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
    window.open(shareUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center pb-16">
        <p className="text-tg-hint text-sm">
          {language === 'ru' ? 'Не удалось загрузить профиль' : 'Failed to load profile'}
        </p>
        <BottomNav />
      </div>
    )
  }

  const stats = user.stats || { rating: 5.0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 }
  const firstName = user.name.split(' ')[0]

  return (
    <div className="min-h-screen bg-tg-bg pb-20">
      {/* Header */}
      <div className="bg-tg-secondary-bg px-4 pt-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[17px] font-semibold text-tg-text">
            {language === 'ru' ? 'Профиль' : 'Profile'}
          </h1>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-tg-bg flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-tg-button/30"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-tg-secondary-bg" />
          </div>
          <div className="flex-1">
            <h2 className="text-[20px] font-bold text-tg-text">{firstName}</h2>
            {user.username && (
              <p className="text-tg-accent text-[14px]">@{user.username}</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-tg-button to-tg-accent rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative">
            <p className="text-white/70 text-[13px] mb-1">
              {language === 'ru' ? 'Бонусный баланс' : 'Bonus balance'}
            </p>
            <p className="text-white text-[28px] font-bold">{user.bonusBalance || 0} ₽</p>
            <p className="text-white/50 text-[12px] mt-1">
              {language === 'ru' ? 'Можно использовать при оплате' : 'Can be used for payment'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/orders')}
            className="bg-tg-secondary-bg rounded-xl p-4 text-left active:opacity-70 transition-opacity"
          >
            <div className="w-10 h-10 bg-tg-button/10 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-tg-button" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium text-tg-text">
              {language === 'ru' ? 'Мои заказы' : 'My Orders'}
            </h3>
            <p className="text-[12px] text-tg-hint">
              {stats.ordersCount} {language === 'ru' ? 'заказов' : 'orders'}
            </p>
          </button>

          <button
            onClick={() => router.push('/favorites')}
            className="bg-tg-secondary-bg rounded-xl p-4 text-left active:opacity-70 transition-opacity"
          >
            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium text-tg-text">
              {language === 'ru' ? 'Избранное' : 'Favorites'}
            </h3>
            <p className="text-[12px] text-tg-hint">
              {language === 'ru' ? 'Сохранённые товары' : 'Saved items'}
            </p>
          </button>
        </div>

        {/* Stats */}
        <div className="bg-tg-secondary-bg rounded-xl p-4">
          <p className="text-tg-section-header text-[13px] font-normal uppercase tracking-wide mb-3">
            {language === 'ru' ? 'Статистика' : 'Statistics'}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <p className="text-[17px] font-semibold text-tg-text">{stats.rating.toFixed(1)}</p>
              <p className="text-[11px] text-tg-hint">{language === 'ru' ? 'Рейтинг' : 'Rating'}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[17px] font-semibold text-tg-text">{stats.ordersCount}</p>
              <p className="text-[11px] text-tg-hint">{language === 'ru' ? 'Покупок' : 'Orders'}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-[17px] font-semibold text-tg-text">{stats.reviewsCount}</p>
              <p className="text-[11px] text-tg-hint">{language === 'ru' ? 'Отзывов' : 'Reviews'}</p>
            </div>
          </div>
        </div>

        {/* Referral Section */}
        <div className="bg-tg-secondary-bg rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-tg-text">
                  {language === 'ru' ? 'Пригласи друзей' : 'Invite Friends'}
                </h3>
                <p className="text-[12px] text-tg-accent font-medium">+200₽ {language === 'ru' ? 'за друга' : 'per friend'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[17px] font-bold text-tg-text">{user.referralCount || 0}</p>
              <p className="text-[11px] text-tg-hint">{language === 'ru' ? 'друзей' : 'friends'}</p>
            </div>
          </div>

          <div className="bg-tg-bg rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-[12px] text-tg-hint font-mono truncate">{referralLink}</p>
              <button
                onClick={copyLink}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  copied ? 'bg-green-500 text-white' : 'bg-tg-button text-white'
                }`}
              >
                {copied ? '✓' : (language === 'ru' ? 'Копировать' : 'Copy')}
              </button>
            </div>
          </div>

          <button
            onClick={shareLink}
            className="w-full py-3 bg-tg-button text-white rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            {language === 'ru' ? 'Поделиться в Telegram' : 'Share on Telegram'}
          </button>
        </div>

        {/* Become Seller */}
        <button
          onClick={() => setShowSellerModal(true)}
          className="w-full bg-gradient-to-r from-tg-button to-tg-accent rounded-xl p-4 flex items-center gap-4 active:opacity-70 transition-opacity"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-[15px] font-semibold text-white">
              {language === 'ru' ? 'Стать продавцом' : 'Become a Seller'}
            </h3>
            <p className="text-[13px] text-white/70">
              {language === 'ru' ? 'Продавайте на FastPay' : 'Sell on FastPay'}
            </p>
          </div>
          <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Menu Links */}
        <div className="bg-tg-secondary-bg rounded-xl overflow-hidden">
          <a href="/support" className="tma-cell border-b border-tg-separator">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-tg-button/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-tg-button" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-[15px] text-tg-text">{language === 'ru' ? 'Поддержка' : 'Support'}</span>
            </div>
            <svg className="w-4 h-4 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href="/legal/offer" className="tma-cell border-b border-tg-separator">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-pink-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-[15px] text-tg-text">{language === 'ru' ? 'Правовая информация' : 'Legal'}</span>
            </div>
            <svg className="w-4 h-4 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href="/faq" className="tma-cell">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[15px] text-tg-text">FAQ</span>
            </div>
            <svg className="w-4 h-4 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Debug: Show My Telegram ID (for adding to ADMIN_IDS) */}
        <button
          onClick={() => {
            alert(`Your Telegram ID: ${user.id}\n\nTo make yourself an admin, add this ID to the ADMIN_IDS environment variable on the server.`)
          }}
          className="w-full bg-tg-secondary-bg rounded-xl p-3 text-left border border-tg-separator hover:bg-tg-bg transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-tg-text">
                {language === 'ru' ? 'Мой Telegram ID' : 'My Telegram ID'}
              </p>
              <p className="text-[11px] text-tg-hint mt-0.5">
                {language === 'ru' ? 'Для добавления в админы' : 'For adding as admin'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-mono text-tg-accent font-semibold">{user.id}</p>
            </div>
          </div>
        </button>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[12px] text-tg-hint">
            by <a href="https://t.me/cheffofgang" target="_blank" rel="noopener noreferrer" className="text-tg-accent font-medium hover:underline">@cheffofgang</a>
          </p>
        </div>
      </div>

      <BecomeSellerModal
        isOpen={showSellerModal}
        onClose={() => setShowSellerModal(false)}
      />

      <BottomNav />
    </div>
  )
}
