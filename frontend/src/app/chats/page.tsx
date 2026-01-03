'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { chatApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getTelegramUser } from '@/lib/telegram'
import { useAppStore } from '@/lib/store'

interface ChatInfo {
  id: string
  participants: string[]
  productId?: string
  productName?: string
  productImage?: string
  sellerName?: string
  createdAt: string
  lastMessageAt?: string
  lastMessage?: string
  unread?: number
}

export default function ChatsPage() {
  const router = useRouter()
  const { language } = useAppStore()
  const [chats, setChats] = useState<ChatInfo[]>([])
  const [loading, setLoading] = useState(true)

  const user = getTelegramUser()
  const userId = user?.id?.toString() || ''

  useEffect(() => {
    loadChats()
  }, [userId])

  const loadChats = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const res = await chatApi.getUserChats(userId)
      if (res.success) {
        setChats(res.chats || [])
      }
    } catch (err) {
      console.error('Failed to load chats:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: language === 'ru' ? ru : undefined
      })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg border-b border-tg-separator">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 -ml-2 text-tg-accent active:opacity-70"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[17px] font-semibold text-tg-text">
            {language === 'ru' ? 'Чаты' : 'Chats'}
          </h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="px-4 py-4">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-tg-secondary-bg rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-[17px] font-semibold text-tg-text mb-2">
              {language === 'ru' ? 'Нет чатов' : 'No chats'}
            </h3>
            <p className="text-[14px] text-tg-hint max-w-xs">
              {language === 'ru'
                ? 'Напишите продавцу на странице товара, чтобы начать диалог'
                : 'Write to the seller on the product page to start a conversation'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => router.push(`/chats/${chat.id}`)}
                className="w-full bg-tg-secondary-bg rounded-xl p-4 flex items-center gap-3 active:opacity-70 transition-opacity text-left"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {chat.productImage ? (
                    <img
                      src={chat.productImage}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-tg-bg flex items-center justify-center">
                      <svg className="w-5 h-5 text-tg-hint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  {chat.unread && chat.unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-tg-button text-white text-[11px] font-medium rounded-full flex items-center justify-center">
                      {chat.unread > 9 ? '9+' : chat.unread}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[15px] font-semibold text-tg-text truncate pr-2">
                      {chat.productName || chat.sellerName || (language === 'ru' ? 'Чат' : 'Chat')}
                    </h3>
                    {chat.lastMessageAt && (
                      <span className="text-[12px] text-tg-hint flex-shrink-0">
                        {formatTime(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] text-tg-hint truncate">
                    {chat.lastMessage || (language === 'ru' ? 'Нажмите, чтобы открыть' : 'Tap to open')}
                  </p>
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-tg-hint flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
