// Default products and promo codes for initial seeding
// This data is only used when MongoDB is empty

export const defaultProducts = [
  {
    _id: '1',
    name: 'Claude AI Pro',
    price: 1990,
    images: ['/brands/claude.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 ВОЗМОЖНОСТИ CLAUDE PRO:
➖ Claude 3.5 Sonnet — самая мощная модель 🔥
➖ Claude Code — помощник программиста
➖ Приоритетный доступ — без очередей
➖ Расширенный контекст — до 200K токенов`,
    inStock: true,
    createdAt: '2025-12-26T02:49:00',
    variants: [
      { id: 'claude-1m', name: 'PRO (1 месяц)', price: 1990, period: '1 месяц', features: ['Claude 3.5 Sonnet', 'Claude Code', 'Приоритетный доступ'] },
      { id: 'claude-3m', name: 'PRO (3 месяца)', price: 5490, period: '3 месяца', features: ['Claude 3.5 Sonnet', 'Claude Code', 'Экономия 8%'] },
    ]
  },
  {
    _id: '2',
    name: 'ChatGPT Plus',
    price: 1790,
    images: ['/brands/openai.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 CHATGPT PLUS:
➖ GPT-4 — флагман 🔥
➖ Плагины и DALL-E 3
➖ Приоритетный доступ`,
    inStock: true,
    createdAt: '2025-12-26T02:30:00',
    variants: [
      { id: 'gpt-1m', name: 'Plus (1 месяц)', price: 1790, period: '1 месяц', features: ['GPT-4', 'Плагины', 'DALL-E 3'] },
      { id: 'gpt-3m', name: 'Plus (3 месяца)', price: 4990, period: '3 месяца', features: ['GPT-4', 'Плагины', 'Экономия 7%'] },
    ]
  },
  {
    _id: '3',
    name: 'Spotify Premium',
    price: 490,
    images: ['/brands/spotify.webp'],
    condition: 'new',
    category: 'streaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.8,
    description: `🟢 SPOTIFY PREMIUM:
➖ Без рекламы 🔥
➖ Оффлайн-режим
➖ Высокое качество звука`,
    inStock: true,
    createdAt: '2025-12-26T09:30:00',
    variants: [
      { id: 'spotify-1m', name: 'Individual (1 месяц)', price: 490, period: '1 месяц', features: ['Без рекламы', 'Оффлайн', 'HD'] },
      { id: 'spotify-3m', name: 'Individual (3 месяца)', price: 990, period: '3 месяца', features: ['Без рекламы', 'Оффлайн', 'Экономия 33%'] },
    ]
  },
]

export const defaultPromoCodes = [
  {
    code: 'WELCOME10',
    discountType: 'percentage' as const,
    discountValue: 10,
    minOrderAmount: 500,
    maxUses: 1000,
    usedCount: 0,
    isActive: true,
    description: 'Скидка 10% на первый заказ от 500₽',
    createdAt: new Date().toISOString()
  },
  {
    code: 'FASTPAY20',
    discountType: 'percentage' as const,
    discountValue: 20,
    minOrderAmount: 2000,
    maxUses: 500,
    usedCount: 0,
    isActive: true,
    description: 'Скидка 20% на заказ от 2000₽',
    createdAt: new Date().toISOString()
  },
]
