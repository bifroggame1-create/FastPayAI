'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns/format'
import { ru } from 'date-fns/locale/ru'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAppStore()

  if (!user) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

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
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              На платформе с {format(new Date(user.joinedAt), 'd MMM. yyyy', { locale: ru })}
            </p>
          </div>
        </div>

        <button className="w-full bg-light-card dark:bg-dark-card hover:bg-light-border dark:hover:bg-dark-border text-accent-cyan py-3 rounded-lg mb-6 transition-colors border border-light-border dark:border-dark-border">
          Мои заказы
        </button>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="text-lg font-semibold text-light-text dark:text-dark-text">{user.stats.rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{user.stats.reviewsCount} отзывов</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-lg font-semibold text-light-text dark:text-dark-text">{user.stats.ordersCount}</span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">заказов</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-lg font-semibold text-light-text dark:text-dark-text">{user.stats.returnsCount}</span>
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
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 mb-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Пригласи друзей</h3>
            <span className="text-sm text-accent-cyan font-medium">+200₽ за друга</span>
          </div>

          <div className="bg-light-bg dark:bg-dark-bg rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Твой промокод</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user.referralCode || '')
                  alert('Промокод скопирован!')
                }}
                className="text-accent-cyan text-sm font-medium"
              >
                Копировать
              </button>
            </div>
            <div className="font-mono text-2xl font-bold text-center py-2 text-light-text dark:text-dark-text">
              {user.referralCode || 'LOADING...'}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-light-text-secondary dark:text-dark-text-secondary">Приглашено друзей</span>
            <span className="font-semibold text-light-text dark:text-dark-text">{user.referralCount || 0}</span>
          </div>

          <div className="mt-4 p-3 bg-accent-blue/10 dark:bg-accent-blue/20 rounded-lg">
            <p className="text-xs text-light-text dark:text-dark-text">
              💰 Ты получаешь <span className="font-bold text-accent-cyan">200₽</span> за каждого друга<br />
              🎁 Друг получает <span className="font-bold text-accent-cyan">100₽</span> при регистрации
            </p>
          </div>
        </div>

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

        <div className="text-center mt-8 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          by <span className="text-accent-cyan">@CheffDev</span> with &lt;3
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
