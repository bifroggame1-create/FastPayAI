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
  const { language } = useAppStore()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSellerModal, setShowSellerModal] = useState(false)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          {language === 'ru' ? 'Не удалось загрузить профиль' : 'Failed to load profile'}
        </p>
      </div>
    )
  }

  const stats = user.stats || { rating: 5.0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 }
  const firstName = user.name.split(' ')[0]

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-accent-cyan/30"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-light-bg dark:border-dark-bg"></div>
          </div>
          <div className="flex-1">
            <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
              {language === 'ru' ? 'Привет,' : 'Hello,'}
            </p>
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">{firstName}</h1>
            {user.username && (
              <p className="text-accent-cyan text-sm">@{user.username}</p>
            )}
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="w-11 h-11 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Bonus Balance Card */}
        <div className="relative bg-gradient-to-r from-accent-cyan to-accent-blue rounded-2xl p-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💎</span>
              <span className="text-white/80 text-sm font-medium">
                {language === 'ru' ? 'Бонусный баланс' : 'Bonus balance'}
              </span>
            </div>
            <p className="text-white text-3xl font-bold">{user.bonusBalance || 0} ₽</p>
            <p className="text-white/60 text-xs mt-1">
              {language === 'ru' ? 'Можно использовать при оплате' : 'Can be used for payment'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/orders')}
            className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-4 text-left transition-colors hover:border-accent-cyan/50"
          >
            <div className="w-10 h-10 bg-accent-cyan/10 rounded-xl flex items-center justify-center mb-3">
              <span className="text-xl">📦</span>
            </div>
            <h3 className="font-semibold text-light-text dark:text-dark-text text-sm">
              {language === 'ru' ? 'Мои заказы' : 'My Orders'}
            </h3>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
              {stats.ordersCount} {language === 'ru' ? 'заказов' : 'orders'}
            </p>
          </button>

          <button
            onClick={() => router.push('/favorites')}
            className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-4 text-left transition-colors hover:border-accent-cyan/50"
          >
            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center mb-3">
              <span className="text-xl">❤️</span>
            </div>
            <h3 className="font-semibold text-light-text dark:text-dark-text text-sm">
              {language === 'ru' ? 'Избранное' : 'Favorites'}
            </h3>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
              {language === 'ru' ? 'Сохранённое' : 'Saved items'}
            </p>
          </button>
        </div>

        {/* Stats */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text mb-4 text-sm">
            {language === 'ru' ? 'Статистика' : 'Statistics'}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-lg">⭐</span>
              </div>
              <p className="text-lg font-bold text-light-text dark:text-dark-text">{stats.rating.toFixed(1)}</p>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {language === 'ru' ? 'Рейтинг' : 'Rating'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-lg">✅</span>
              </div>
              <p className="text-lg font-bold text-light-text dark:text-dark-text">{stats.ordersCount}</p>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {language === 'ru' ? 'Покупок' : 'Orders'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-lg">💬</span>
              </div>
              <p className="text-lg font-bold text-light-text dark:text-dark-text">{stats.reviewsCount}</p>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {language === 'ru' ? 'Отзывов' : 'Reviews'}
              </p>
            </div>
          </div>
        </div>

        {/* Referral */}
        <ReferralSection user={user} language={language} />

        {/* Become Seller */}
        <button
          onClick={() => setShowSellerModal(true)}
          className="w-full bg-gradient-to-r from-accent-blue to-accent-cyan rounded-2xl p-4 flex items-center gap-4 transition-transform active:scale-[0.98]"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🏪</span>
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-white">
              {language === 'ru' ? 'Стать продавцом' : 'Become a Seller'}
            </h3>
            <p className="text-sm text-white/70">
              {language === 'ru' ? 'Продавайте на FastPay' : 'Sell on FastPay'}
            </p>
          </div>
          <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Menu Links */}
        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl overflow-hidden">
          <a href="/support" className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-accent-cyan/10 rounded-lg flex items-center justify-center">
                <span className="text-base">💬</span>
              </div>
              <span className="font-medium text-light-text dark:text-dark-text text-sm">
                {language === 'ru' ? 'Поддержка' : 'Support'}
              </span>
            </div>
            <svg className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href="/legal/offer" className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-pink-500/10 rounded-lg flex items-center justify-center">
                <span className="text-base">📄</span>
              </div>
              <span className="font-medium text-light-text dark:text-dark-text text-sm">
                {language === 'ru' ? 'Правовая информация' : 'Legal'}
              </span>
            </div>
            <svg className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href="/faq" className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
                <span className="text-base">❓</span>
              </div>
              <span className="font-medium text-light-text dark:text-dark-text text-sm">FAQ</span>
            </div>
            <svg className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            by <span className="text-accent-cyan font-medium">@CheffDev</span> with ❤️
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

// Referral Section Component
function ReferralSection({ user, language }: { user: { id: string; referralCode?: string; referralCount?: number }; language: 'ru' | 'en' }) {
  const [copied, setCopied] = useState(false)
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'FastPayAI_bot'
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.id}`

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = () => {
    const text = language === 'ru'
      ? '🎁 Присоединяйся к FastPay и получи 100₽ на первую покупку!'
      : '🎁 Join FastPay and get 100₽ for your first purchase!'
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
    window.open(shareUrl, '_blank')
  }

  return (
    <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
            <span className="text-xl">🎁</span>
          </div>
          <div>
            <h3 className="font-semibold text-light-text dark:text-dark-text text-sm">
              {language === 'ru' ? 'Пригласи друзей' : 'Invite Friends'}
            </h3>
            <p className="text-xs text-accent-cyan font-medium">
              +200₽ {language === 'ru' ? 'за друга' : 'per friend'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-light-text dark:text-dark-text">{user.referralCount || 0}</p>
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {language === 'ru' ? 'друзей' : 'friends'}
          </p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-light-bg dark:bg-dark-bg rounded-xl p-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs text-light-text-secondary dark:text-dark-text-secondary truncate font-mono">
            {referralLink}
          </span>
          <button
            onClick={copyLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-accent-cyan text-white'
            }`}
          >
            {copied ? '✓' : (language === 'ru' ? 'Копировать' : 'Copy')}
          </button>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={shareLink}
        className="w-full py-3 bg-accent-cyan text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-accent-cyan/90"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
        </svg>
        {language === 'ru' ? 'Поделиться в Telegram' : 'Share on Telegram'}
      </button>

      {/* Bonus Info */}
      <div className="mt-3 p-3 bg-accent-cyan/10 rounded-xl">
        <p className="text-xs text-light-text dark:text-dark-text">
          💰 {language === 'ru' ? 'Ты получаешь' : 'You get'} <span className="font-bold text-accent-cyan">200₽</span> {language === 'ru' ? 'за друга' : 'per friend'}
          <br />
          🎁 {language === 'ru' ? 'Друг получает' : 'Friend gets'} <span className="font-bold text-accent-cyan">100₽</span> {language === 'ru' ? 'при регистрации' : 'on signup'}
        </p>
      </div>
    </div>
  )
}
