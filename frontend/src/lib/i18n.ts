// Translation system
export const translations = {
  ru: {
    // Header
    support: 'Поддержка',
    chats: 'Чаты',

    // Search
    searchPlaceholder: 'Поиск: Claude, GPT, Клауд...',
    catalog: 'Каталог',

    // Product Card
    buy: 'Купить',
    guarantee: 'Гарантия',

    // Categories
    all: 'Все',
    ai: 'AI сервисы',
    vpn: 'VPN',
    streaming: 'Стриминг',
    gaming: 'Игры',
    software: 'Софт',
    other: 'Другое',

    // Filters
    new: 'Новое',
    used: 'Б/У',

    // Profile
    profile: 'Профиль',
    favorites: 'Избранное',
    myProducts: 'Мои товары',
    balance: 'Баланс',
    referrals: 'Рефералы',
    settings: 'Настройки',
    logout: 'Выйти',

    // Checkout
    checkout: 'Оформление заказа',
    totalPrice: 'Итого',
    pay: 'Оплатить',

    // Common
    seller: 'Продавец',
    contactSeller: 'Связаться с продавцом',
    description: 'Описание',
    reviews: 'Отзывы',

    // Settings Modal
    settingsTitle: 'Настройки',
    language: 'Язык',
    currency: 'Валюта',

    // Main page
    forYou: 'Специально для тебя',
    noProducts: 'Товары не найдены',
  },
  en: {
    // Header
    support: 'Support',
    chats: 'Chats',

    // Search
    searchPlaceholder: 'Search: Claude, GPT, ChatGPT...',
    catalog: 'Catalog',

    // Product Card
    buy: 'Buy',
    guarantee: 'Warranty',

    // Categories
    all: 'All',
    ai: 'AI Services',
    vpn: 'VPN',
    streaming: 'Streaming',
    gaming: 'Games',
    software: 'Software',
    other: 'Other',

    // Filters
    new: 'New',
    used: 'Used',

    // Profile
    profile: 'Profile',
    favorites: 'Favorites',
    myProducts: 'My Products',
    balance: 'Balance',
    referrals: 'Referrals',
    settings: 'Settings',
    logout: 'Logout',

    // Checkout
    checkout: 'Checkout',
    totalPrice: 'Total',
    pay: 'Pay',

    // Common
    seller: 'Seller',
    contactSeller: 'Contact Seller',
    description: 'Description',
    reviews: 'Reviews',

    // Settings Modal
    settingsTitle: 'Settings',
    language: 'Language',
    currency: 'Currency',

    // Main page
    forYou: 'For You',
    noProducts: 'No products found',
  }
}

export type TranslationKey = keyof typeof translations.ru
export type Language = 'ru' | 'en'

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.ru[key]
}
