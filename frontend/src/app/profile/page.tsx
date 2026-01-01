'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import BecomeSellerModal from '@/components/BecomeSellerModal'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns/format'
import { ru, enUS } from 'date-fns/locale'
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
      <div className="min-h-screen bg-[#FBFAFE] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#4789F4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FBFAFE] flex items-center justify-center">
        <p className="text-gray-500">Не удалось загрузить профиль</p>
      </div>
    )
  }

  const stats = user.stats || { rating: 5.0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 }
  const firstName = user.name.split(' ')[0]

  return (
    <div className="min-h-screen bg-[#FBFAFE] pb-24">
      {/* Custom Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={user.avatar || '/default-avatar.png'}
            alt={user.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
          />
          <div>
            <p className="text-gray-500 text-sm">
              {language === 'ru' ? 'Привет,' : 'Hello,'}
            </p>
            <h1 className="text-xl font-bold text-gray-900">{firstName}</h1>
          </div>
        </div>
        <button className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* Featured Card - Bonus Balance */}
        <div
          className="relative bg-gradient-to-br from-[#4789F4] to-[#6BA3FF] rounded-3xl p-6 overflow-hidden"
          style={{ boxShadow: '0 10px 40px -10px rgba(71, 137, 244, 0.4)' }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-4">
              <span className="text-yellow-300">💰</span>
              <span className="text-white text-xs font-medium">
                {language === 'ru' ? 'Бонусный баланс' : 'Bonus balance'}
              </span>
            </div>

            <p className="text-white/80 text-sm mb-1">
              {language === 'ru' ? 'Доступно к использованию' : 'Available to use'}
            </p>
            <p className="text-white text-4xl font-bold mb-2">{user.bonusBalance || 0} ₽</p>
            <p className="text-white/60 text-xs">
              {language === 'ru' ? 'Можно использовать при оплате' : 'Can be used for payment'}
            </p>
          </div>

          {/* Decorative 3D element */}
          <div className="absolute bottom-2 right-4 text-6xl opacity-30">💎</div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/orders')}
            className="bg-white rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5"
            style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}
          >
            <div className="w-12 h-12 bg-[#F0F4FF] rounded-xl flex items-center justify-center mb-3">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-0.5">
              {language === 'ru' ? 'Мои заказы' : 'My Orders'}
            </h3>
            <p className="text-xs text-gray-500">{stats.ordersCount} {language === 'ru' ? 'заказов' : 'orders'}</p>
          </button>

          <button
            onClick={() => router.push('/favorites')}
            className="bg-white rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5"
            style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}
          >
            <div className="w-12 h-12 bg-[#FFF0F4] rounded-xl flex items-center justify-center mb-3">
              <span className="text-2xl">❤️</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-0.5">
              {language === 'ru' ? 'Избранное' : 'Favorites'}
            </h3>
            <p className="text-xs text-gray-500">{language === 'ru' ? 'Сохранённое' : 'Saved items'}</p>
          </button>
        </div>

        {/* Stats Cards */}
        <div
          className="bg-white rounded-2xl p-5"
          style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}
        >
          <h3 className="font-semibold text-gray-900 mb-4">
            {language === 'ru' ? 'Статистика' : 'Statistics'}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#FFF9E6] rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">⭐</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
              <p className="text-xs text-gray-500">{language === 'ru' ? 'Рейтинг' : 'Rating'}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#E8F5E9] rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">✅</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.ordersCount}</p>
              <p className="text-xs text-gray-500">{language === 'ru' ? 'Покупок' : 'Orders'}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#F3E5F5] rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">💬</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.reviewsCount}</p>
              <p className="text-xs text-gray-500">{language === 'ru' ? 'Отзывов' : 'Reviews'}</p>
            </div>
          </div>
        </div>

        {/* Referral Card */}
        <ReferralSection user={user} language={language} />

        {/* Become Seller */}
        <button
          onClick={() => setShowSellerModal(true)}
          className="w-full bg-gradient-to-r from-[#FD6086] to-[#FF8BA7] rounded-2xl p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5"
          style={{ boxShadow: '0 8px 30px -8px rgba(253, 96, 134, 0.4)' }}
        >
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🏪</span>
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-lg text-white">
              {language === 'ru' ? 'Стать продавцом' : 'Become a Seller'}
            </h3>
            <p className="text-sm text-white/80">
              {language === 'ru' ? 'Продавайте на FastPay' : 'Sell on FastPay'}
            </p>
          </div>
          <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Support & Legal */}
        <div
          className="bg-white rounded-2xl p-5"
          style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}
        >
          <div className="space-y-1">
            <a href="/support" className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F0F4FF] rounded-xl flex items-center justify-center">
                  <span className="text-lg">💬</span>
                </div>
                <span className="font-medium text-gray-900">{language === 'ru' ? 'Поддержка' : 'Support'}</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a href="/legal/offer" className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFF0F4] rounded-xl flex items-center justify-center">
                  <span className="text-lg">📄</span>
                </div>
                <span className="font-medium text-gray-900">{language === 'ru' ? 'Правовая информация' : 'Legal'}</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a href="/faq" className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center">
                  <span className="text-lg">❓</span>
                </div>
                <span className="font-medium text-gray-900">{language === 'ru' ? 'FAQ' : 'FAQ'}</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            by <span className="text-[#4789F4] font-medium">@CheffDev</span> with ❤️
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
    <div
      className="bg-white rounded-2xl p-5"
      style={{ boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.08)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#E8F5E9] rounded-xl flex items-center justify-center">
            <span className="text-2xl">🎁</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {language === 'ru' ? 'Пригласи друзей' : 'Invite Friends'}
            </h3>
            <p className="text-xs text-[#4789F4] font-medium">
              +200₽ {language === 'ru' ? 'за друга' : 'per friend'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{user.referralCount || 0}</p>
          <p className="text-xs text-gray-500">{language === 'ru' ? 'друзей' : 'friends'}</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-[#F8F9FC] rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs text-gray-600 truncate font-mono">
            {referralLink}
          </span>
          <button
            onClick={copyLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-[#4789F4] text-white hover:bg-[#3A7AE0]'
            }`}
          >
            {copied ? '✓' : (language === 'ru' ? 'Копировать' : 'Copy')}
          </button>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={shareLink}
        className="w-full py-3 bg-[#4789F4] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#3A7AE0] transition-colors"
        style={{ boxShadow: '0 4px 14px -4px rgba(71, 137, 244, 0.4)' }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
        </svg>
        {language === 'ru' ? 'Поделиться в Telegram' : 'Share on Telegram'}
      </button>

      {/* Bonus Info */}
      <div className="mt-4 p-3 bg-[#F0F4FF] rounded-xl">
        <p className="text-xs text-gray-700">
          💰 {language === 'ru' ? 'Ты получаешь' : 'You get'} <span className="font-bold text-[#4789F4]">200₽</span> {language === 'ru' ? 'за друга' : 'per friend'}
          <br />
          🎁 {language === 'ru' ? 'Друг получает' : 'Friend gets'} <span className="font-bold text-[#4789F4]">100₽</span> {language === 'ru' ? 'при регистрации' : 'on signup'}
        </p>
      </div>
    </div>
  )
}
