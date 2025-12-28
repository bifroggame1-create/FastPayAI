'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore, Chat, ChatMessage } from '@/lib/store'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ChatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { chats, messages, markChatAsRead, addMessage } = useAppStore()
  const [messageText, setMessageText] = useState('')

  const chat = chats.find(c => c.id === chatId)
  const chatMessages = messages.filter(m => m.chatId === chatId)

  useEffect(() => {
    if (chat) {
      markChatAsRead(chat.id)
    }
  }, [chat?.id])

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  const handleSendMessage = () => {
    if (!messageText.trim() || !chat) return

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      chatId: chat.id,
      senderId: 'user',
      senderName: 'Вы',
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    addMessage(message)
    setMessageText('')

    // Simulate auto-reply for support chats
    if (chat.type === 'support') {
      setTimeout(() => {
        addMessage({
          id: `msg-${Date.now() + 1}`,
          chatId: chat.id,
          senderId: 'support',
          senderName: 'Поддержка FastPay',
          text: 'Спасибо за сообщение! Оператор ответит вам в ближайшее время.',
          timestamp: new Date().toISOString(),
          type: 'text'
        })
      }, 1500)
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ru })
    } catch {
      return ''
    }
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">Чат не найден</p>
          <button
            onClick={() => router.push('/chats')}
            className="px-6 py-2 bg-accent-cyan text-white rounded-xl"
          >
            К списку чатов
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col">
      <Header
        title={chat.title}
        showBack
        onBack={() => router.push('/chats')}
        showNavButtons={false}
      />

      {/* Messages */}
      <div className="flex-1 px-4 py-4 overflow-y-auto pb-32">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <svg className="w-16 h-16 text-light-text-secondary dark:text-dark-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Начните диалог
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatMessages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.senderId === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    message.senderId === 'user'
                      ? 'bg-accent-cyan text-white rounded-br-md'
                      : message.type === 'notification'
                      ? 'bg-yellow-500/20 text-light-text dark:text-dark-text rounded-bl-md'
                      : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-bl-md border border-light-border dark:border-dark-border'
                  }`}
                >
                  {message.senderId !== 'user' && message.type !== 'notification' && (
                    <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.senderId === 'user' ? 'opacity-70' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      {chat.type !== 'notification' && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-light-bg dark:bg-dark-bg border-t border-light-border dark:border-dark-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-3 rounded-xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-accent-cyan"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="px-4 py-3 bg-accent-cyan text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
