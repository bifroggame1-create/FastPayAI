'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore, Chat, ChatMessage } from '@/lib/store'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ChatsPage() {
  const router = useRouter()
  const { chats, messages, markChatAsRead, addMessage } = useAppStore()
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messageText, setMessageText] = useState('')

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat)
    markChatAsRead(chat.id)
  }

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      chatId: selectedChat.id,
      senderId: 'user',
      senderName: 'Вы',
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    addMessage(message)
    setMessageText('')
  }

  const chatMessages = selectedChat
    ? messages.filter(m => m.chatId === selectedChat.id)
    : []

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ru })
    } catch {
      return ''
    }
  }

  const getTypeIcon = (type: Chat['type']) => {
    switch (type) {
      case 'seller':
        return (
          <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'support':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'notification':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
    }
  }

  // Chat list view
  if (!selectedChat) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
        <Header title="Чаты" showBack onBack={() => router.push('/')} showNavButtons={false} />

        <div className="px-4 py-4">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg className="w-16 h-16 text-light-text-secondary dark:text-dark-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Нет чатов</h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-xs">
                Здесь будут отображаться уведомления о рефералах, покупках и диалоги с продавцами
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className="w-full flex items-center gap-3 p-4 bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border hover:border-accent-cyan transition-colors text-left"
                >
                  <div className="relative">
                    {chat.avatar ? (
                      <img src={chat.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-light-bg dark:bg-dark-bg flex items-center justify-center">
                        {getTypeIcon(chat.type)}
                      </div>
                    )}
                    {chat.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-light-text dark:text-dark-text truncate">{chat.title}</h3>
                      {chat.lastMessageTime && (
                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary ml-2 flex-shrink-0">
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate">
                        {chat.lastMessage}
                      </p>
                    )}
                  </div>

                  <svg className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  // Chat detail view
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col">
      <Header
        title={selectedChat.title}
        showBack
        onBack={() => setSelectedChat(null)}
        showNavButtons={false}
      />

      {/* Messages */}
      <div className="flex-1 px-4 py-4 overflow-y-auto pb-24">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
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
                      : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-bl-md'
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
          </div>
        )}
      </div>

      {/* Message input */}
      {selectedChat.type !== 'notification' && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-light-bg dark:bg-dark-bg border-t border-light-border dark:border-dark-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Введите сообщение..."
              className="flex-1 px-4 py-3 rounded-xl bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:border-accent-cyan"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="px-4 py-3 bg-accent-cyan text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
