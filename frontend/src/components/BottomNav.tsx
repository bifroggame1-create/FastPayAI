'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { initAuth, isAdmin as checkIsAdmin } from '@/lib/auth'
import { hapticImpact } from '@/lib/telegram'

export default function BottomNav() {
  const pathname = usePathname()
  const { isAdmin: storeIsAdmin, setIsAdmin, cart, getCartItemCount } = useAppStore()
  const [localIsAdmin, setLocalIsAdmin] = useState(false)

  useEffect(() => {
    const init = async () => {
      const user = await initAuth()
      if (user) {
        setLocalIsAdmin(user.isAdmin)
        setIsAdmin(user.isAdmin)
      } else {
        const adminStatus = checkIsAdmin()
        setLocalIsAdmin(adminStatus)
        setIsAdmin(adminStatus)
      }
    }
    init()
  }, [setIsAdmin])

  const isAdmin = localIsAdmin || storeIsAdmin
  const cartCount = getCartItemCount()

  const navItems = [
    {
      name: 'Маркет',
      path: '/',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: 'Корзина',
      path: '/cart',
      badge: cartCount > 0 ? cartCount : undefined,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Избранное',
      path: '/favorites',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Профиль',
      path: '/profile',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ]

  // Check if developer (ID: 1301598469)
  const telegramUser = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : null
  const isDeveloper = telegramUser?.id === 1301598469 || String(telegramUser?.id) === '1301598469'

  // Show "Мой магазин" for sellers/admins
  if (isAdmin) {
    navItems.push({
      name: 'Магазин',
      path: '/myshop',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    })
  }

  // Show "Админ" only for developer
  if (isDeveloper) {
    navItems.push({
      name: 'Админ',
      path: '/admin',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    })
  }

  const handleNavClick = () => {
    hapticImpact('light')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-tg-separator z-50" aria-label="Основная навигация">
      <div className="flex justify-around items-center h-14 pb-safe max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleNavClick}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors active:opacity-70 ${
                isActive ? 'text-tg-accent' : 'text-tg-hint'
              }`}
            >
              <div className="relative">
                {item.icon(isActive)}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-tg-destructive text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
