import Fastify from 'fastify'
import cors from '@fastify/cors'
import dotenv from 'dotenv'
import path from 'path'

// CRITICAL: Load environment variables FIRST, before any other imports that use them!
// In production (Render), environment variables are set in the dashboard
dotenv.config({ path: path.join(__dirname, '../.env') })

// NOW import modules that depend on environment variables
import { cryptoBot } from './cryptobot'
import { cactusPay, PaymentMethod } from './cactuspay'
import {
  loadProducts, saveProducts, loadPromoCodes, savePromoCodes,
  loadOrders, saveOrders, addOrder, updateOrder, getOrderById,
  Order, OrderStatus
} from './dataStore'
import { searchProducts, getSearchSuggestions } from './searchUtils'
import { convertRubToCrypto, CryptoAsset } from './cryptoConverter'

// Log environment configuration on startup
console.log('='.repeat(60))
console.log('🚀 FastPay Backend Starting...')
console.log('='.repeat(60))
console.log('Environment variables loaded:')
console.log('  PORT:', process.env.PORT || '3001')
console.log('  HOST:', process.env.HOST || '0.0.0.0')
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'not set')
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set')
console.log('  CRYPTOBOT_TOKEN:', process.env.CRYPTOBOT_TOKEN ? `✅ Set (${process.env.CRYPTOBOT_TOKEN.substring(0, 10)}...)` : '❌ NOT SET')
console.log('  CACTUSPAY_TOKEN:', process.env.CACTUSPAY_TOKEN ? `✅ Set (${process.env.CACTUSPAY_TOKEN.substring(0, 8)}...)` : '❌ NOT SET')
console.log('='.repeat(60))

const fastify = Fastify({
  logger: true,
})

// Сокращенная версия - первые 10 товаров
const defaultProducts = [
  {
    _id: '1',
    name: 'Claude AI Pro',
    price: 1990,
    images: ['/brands/claude.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 ВОЗМОЖНОСТИ CLAUDE PRO НА 25.12.2025:
➖ Claude 3.5 Sonnet — самая мощная модель 🔥
➖ Claude Code — помощник программиста
➖ Приоритетный доступ — без очередей
➖ Расширенный контекст — до 200K токенов
➖ Artifacts — интерактивные результаты

🤔 АВТО / На Вашу почту / На нашу почту - В чем разница?
➖ «АВТО 24/7» — моментальное получение готового аккаунта
➖ «На Вашу почту» — создаем аккаунт на вашу почту. Доступ к почте НЕ нужен
➖ «На нашу почту» — создание вручную менеджером

🟣 Что мы предлагаем?
✅ Мгновенная выдача готового аккаунта
✅ Профессиональные почтовые сервисы
✅ Полная гарантия на весь период подписки

🔴 ВАЖНО!
➖ Для доступа из РФ может потребоваться прокси
➖ Гарантия работы на весь оплаченный срок
➖ Поддержка 24/7`,
    inStock: true,
    createdAt: '2025-12-26T02:49:00',
    variants: [
      { id: 'claude-1m', name: 'PRO (1 месяц)', price: 1990, period: '1 месяц', features: ['Claude 3.5 Sonnet', 'Claude Code', 'Приоритетный доступ'] },
      { id: 'claude-3m', name: 'PRO (3 месяца)', price: 5490, period: '3 месяца', features: ['Claude 3.5 Sonnet', 'Claude Code', 'Приоритетный доступ', 'Экономия 8%'] },
      { id: 'claude-6m', name: 'PRO (6 месяцев)', price: 9990, period: '6 месяцев', features: ['Claude 3.5 Sonnet', 'Claude Code', 'Приоритетный доступ', 'Экономия 16%'] },
      { id: 'claude-1y', name: 'PRO (1 год)', price: 17990, period: '1 год', features: ['Claude 3.5 Sonnet', 'Claude Code', 'Приоритетный доступ', 'Экономия 25%'] },
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
    description: `🟢 АКТУАЛЬНЫЕ МОДУЛИ В ПОДПИСКЕ PLUS НА 25.12.2025:
➖ GPT-5.2 — флагман 🔥
➖ Auto — решает, как долго думать
➖ Instant — отвечает сразу
➖ Thinking mini — думает быстро
➖ Thinking — думает дольше ради качества

Устаревшие (но ещё доступны в меню):
➖ GPT-5.1 Instant, GPT-5.1 Thinking
➖ GPT-4o — мультимодал, legacy
➖ Agent Mode — автономный помощник

🤔 АВТО / На Вашу почту / На нашу почту - В чем разница?
➖ «АВТО 24/7» — круглосуточное оформление. Сразу получаете готовый аккаунт
➖ «На Вашу почту» — регистрируем на вашу почту. Вход в почту НЕ требуется
➖ «На нашу почту» — регистрируем вручную

🟣 Что мы предлагаем?
✅ Автоматическая выдача готового аккаунта
✅ Не используем временные почты
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Для входа из РФ может потребоваться прокси
➖ Гарантия на весь оплаченный период`,
    inStock: true,
    createdAt: '2025-12-26T02:30:00',
    variants: [
      { id: 'gpt-1m', name: 'Plus (1 месяц)', price: 1790, period: '1 месяц', features: ['GPT-4 Turbo', 'Плагины', 'DALL-E 3', 'Приоритет'] },
      { id: 'gpt-3m', name: 'Plus (3 месяца)', price: 4990, period: '3 месяца', features: ['GPT-4 Turbo', 'Плагины', 'DALL-E 3', 'Экономия 7%'] },
      { id: 'gpt-6m', name: 'Plus (6 месяцев)', price: 8990, period: '6 месяцев', features: ['GPT-4 Turbo', 'Плагины', 'DALL-E 3', 'Экономия 16%'] },
      { id: 'gpt-1y', name: 'Plus (1 год)', price: 15990, period: '1 год', features: ['GPT-4 Turbo', 'Плагины', 'DALL-E 3', 'Экономия 26%'] },
    ]
  },
  {
    _id: '3',
    name: 'Gemini Advanced',
    price: 1690,
    images: ['/brands/gemini.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 5.0,
    description: `🟢 ВОЗМОЖНОСТИ GEMINI ADVANCED:
➖ Gemini Ultra — самая мощная модель Google 🔥
➖ Контекст до 1M токенов
➖ Глубокая интеграция с Google Workspace
➖ Анализ документов, таблиц, презентаций
➖ Мультимодальность — текст, изображения, код

🤔 Варианты получения подписки:
➖ «АВТО 24/7» — мгновенная выдача аккаунта
➖ «На Вашу почту» — регистрация на вашу почту (доступ не нужен)
➖ «На нашу почту» — ручная регистрация

🟣 Что входит в подписку?
✅ Полный доступ к Gemini Advanced
✅ 2TB облачного хранилища Google One
✅ Интеграция с Gmail, Docs, Sheets
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Прокси может потребоваться для доступа
➖ Гарантия работы весь оплаченный срок`,
    inStock: true,
    createdAt: '2025-12-25T16:53:00',
    variants: [
      { id: 'gemini-1m', name: 'Advanced (1 месяц)', price: 1690, period: '1 месяц', features: ['Gemini Ultra', 'Интеграция с Google', '1M токенов'] },
      { id: 'gemini-3m', name: 'Advanced (3 месяца)', price: 4690, period: '3 месяца', features: ['Gemini Ultra', 'Интеграция с Google', 'Экономия 7%'] },
      { id: 'gemini-1y', name: 'Advanced (1 год)', price: 14990, period: '1 год', features: ['Gemini Ultra', 'Интеграция с Google', 'Экономия 26%'] },
    ]
  },
  {
    _id: '4',
    name: 'VLESS конфигурация Premium',
    price: 2990,
    images: ['/brands/nord.webp'],
    condition: 'new',
    category: 'vpn',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 ВОЗМОЖНОСТИ VLESS КОНФИГУРАЦИИ:
➖ Высокая скорость соединения 🔥
➖ Безлимитный трафик
➖ До 6 устройств одновременно
➖ Современные протоколы шифрования
➖ Стабильное подключение
➖ Автоматическое переподключение

🤔 Что входит:
➖ «АВТО 24/7» — мгновенная выдача конфигурации
➖ Готовый к использованию конфиг
➖ Инструкция по настройке

🟣 Что мы гарантируем?
✅ Рабочая конфигурация
✅ Поддержка всех популярных клиентов
✅ Полная анонимность
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Подходит для разблокировки любых сайтов
➖ Netflix, YouTube, соцсети работают
➖ Гарантия замены при любых проблемах`,
    inStock: true,
    createdAt: '2025-12-26T10:15:00',
    variants: [
      { id: 'nord-1m', name: 'Premium (1 месяц)', price: 890, period: '1 месяц', features: ['6 устройств', 'Все серверы', 'Без логов'] },
      { id: 'nord-6m', name: 'Premium (6 месяцев)', price: 2990, period: '6 месяцев', features: ['6 устройств', 'Все серверы', 'Экономия 44%'] },
      { id: 'nord-1y', name: 'Premium (1 год)', price: 4990, period: '1 год', features: ['6 устройств', 'Все серверы', 'Экономия 53%'] },
      { id: 'nord-2y', name: 'Premium (2 года)', price: 7990, period: '2 года', features: ['6 устройств', 'Все серверы', 'Экономия 63%'] },
    ]
  },
  {
    _id: '5',
    name: 'Spotify Premium',
    price: 990,
    images: ['/brands/spotify.webp'],
    condition: 'new',
    category: 'streaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.8,
    description: `🟢 SPOTIFY PREMIUM НА 25.12.2025:
➖ Без рекламы — только музыка 🔥
➖ Оффлайн-режим — скачивай треки
➖ Высокое качество звука — до 320 kbps
➖ Неограниченные пропуски
➖ Family до 6 аккаунтов

🤔 Individual или Family?
➖ Individual — личный аккаунт только для вас
➖ Family — до 6 человек, общая подписка
➖ Экономия до 60% при выборе Family

🟣 Что мы предлагаем?
✅ Готовый аккаунт или создание нового
✅ Подключение к существующему Family плану
✅ Без региональных ограничений
✅ Гарантия работы весь период

🔴 ВАЖНО!
➖ Аккаунт работает в любой стране
➖ Можно подключить к любому устройству
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T09:30:00',
    variants: [
      { id: 'spotify-1m', name: 'Individual (1 месяц)', price: 490, period: '1 месяц', features: ['Без рекламы', 'Оффлайн режим', 'Высокое качество'] },
      { id: 'spotify-3m', name: 'Individual (3 месяца)', price: 990, period: '3 месяца', features: ['Без рекламы', 'Оффлайн режим', 'Экономия 33%'] },
      { id: 'spotify-family-1m', name: 'Family (1 месяц)', price: 790, period: '1 месяц', features: ['До 6 аккаунтов', 'Без рекламы', 'Family Mix'] },
      { id: 'spotify-family-3m', name: 'Family (3 месяца)', price: 1990, period: '3 месяца', features: ['До 6 аккаунтов', 'Без рекламы', 'Экономия 16%'] },
    ]
  },
  {
    _id: '6',
    name: 'Roblox Robux',
    price: 490,
    images: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500'],
    condition: 'new',
    category: 'gaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 ROBLOX ROBUX — ИГРОВАЯ ВАЛЮТА:
➖ Мгновенное пополнение — до 5 минут 🔥
➖ 100% безопасный метод
➖ На любой аккаунт Roblox
➖ Без бана и блокировок
➖ Покупай скины, игры, пропуски

🤔 Как происходит пополнение?
➖ Указываете username в Roblox
➖ Оплачиваете заказ
➖ Robux зачисляются на баланс автоматически
➖ Проверяете баланс в игре

🟣 Что мы гарантируем?
✅ Официальный метод пополнения
✅ Пополнение в течение 5-30 минут
✅ Полная безопасность аккаунта
✅ Возврат при проблемах

🔴 ВАЖНО!
➖ Нужен только username, пароль не нужен
➖ Работает для всех регионов
➖ Гарантия зачисления 100%`,
    inStock: true,
    createdAt: '2025-12-26T08:00:00',
    variants: [
      { id: 'robux-1k', name: '1000 Robux', price: 490, features: ['Мгновенно', 'На ваш аккаунт', 'Гарантия'] },
      { id: 'robux-2.5k', name: '2500 Robux', price: 990, features: ['Мгновенно', 'На ваш аккаунт', 'Экономия 20%'] },
      { id: 'robux-5k', name: '5000 Robux', price: 1690, features: ['Мгновенно', 'На ваш аккаунт', 'Экономия 31%'] },
      { id: 'robux-10k', name: '10000 Robux', price: 2990, features: ['Мгновенно', 'На ваш аккаунт', 'Экономия 39%'] },
    ]
  },
  {
    _id: '7',
    name: 'Adobe Creative Cloud',
    price: 3990,
    images: ['/brands/adobe.webp'],
    condition: 'new',
    category: 'software',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 5.0,
    description: `🟢 ADOBE CREATIVE CLOUD ALL APPS:
➖ 20+ профессиональных приложений 🔥
➖ Photoshop, Illustrator, Premiere Pro
➖ After Effects, InDesign, Lightroom
➖ 100GB облачного хранилища
➖ Adobe Fonts — тысячи шрифтов
➖ Behance Portfolio

🤔 Варианты получения подписки:
➖ «АВТО 24/7» — готовый аккаунт сразу
➖ «На Вашу почту» — создание на вашу почту
➖ «На нашу почту» — ручное создание

🟣 Что включено?
✅ Полный пакет Creative Cloud
✅ Все последние обновления
✅ Cloud Storage 100GB
✅ Adobe Stock (пробный период)
✅ Синхронизация между устройствами

🔴 ВАЖНО!
➖ Подходит для коммерческого использования
➖ Работает на Windows и Mac
➖ Гарантия на весь период`,
    inStock: true,
    createdAt: '2025-12-25T13:20:00',
    variants: [
      { id: 'adobe-1m', name: 'All Apps (1 месяц)', price: 3990, period: '1 месяц', features: ['20+ приложений', 'Cloud Storage 100GB', 'Adobe Fonts'] },
      { id: 'adobe-3m', name: 'All Apps (3 месяца)', price: 10990, period: '3 месяца', features: ['20+ приложений', 'Cloud Storage 100GB', 'Экономия 8%'] },
      { id: 'adobe-1y', name: 'All Apps (1 год)', price: 39990, period: '1 год', features: ['20+ приложений', 'Cloud Storage 100GB', 'Экономия 17%'] },
    ]
  },
  {
    _id: '8',
    name: 'Coursera Plus',
    price: 4990,
    images: ['/products/coursera.jpg'],
    condition: 'new',
    category: 'education',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 COURSERA PLUS НА 25.12.2025:
➖ 7000+ курсов от ведущих университетов 🔥
➖ Stanford, Yale, Google, IBM, Meta
➖ Сертификаты с признанием работодателей
➖ Неограниченный доступ к материалам
➖ Все специализации и проекты
➖ Обучение на русском и английском

🤔 Варианты получения:
➖ «АВТО 24/7» — моментальный доступ к аккаунту
➖ «На Вашу почту» — создание на вашу почту
➖ Возможность смены пароля

🟣 Что включено?
✅ Полный доступ ко всем курсам
✅ Сертификаты об окончании
✅ Guided Projects — практика
✅ Профессиональные сертификаты
✅ Обновление курсов каждую неделю

🔴 ВАЖНО!
➖ Доступ с любого устройства
➖ Без региональных ограничений
➖ Гарантия работы весь период`,
    inStock: true,
    createdAt: '2025-12-24T09:00:00',
    variants: [
      { id: 'coursera-1m', name: 'Plus (1 месяц)', price: 4990, period: '1 месяц', features: ['7000+ курсов', 'Сертификаты', 'Все специализации'] },
      { id: 'coursera-3m', name: 'Plus (3 месяца)', price: 12990, period: '3 месяца', features: ['7000+ курсов', 'Сертификаты', 'Экономия 13%'] },
      { id: 'coursera-1y', name: 'Plus (1 год)', price: 44990, period: '1 год', features: ['7000+ курсов', 'Сертификаты', 'Экономия 25%'] },
    ]
  },
  {
    _id: '9',
    name: 'Midjourney',
    price: 2490,
    images: ['/products/midjourney.png'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 MIDJOURNEY — AI ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ:
➖ Создание изображений по текстовому описанию 🔥
➖ Basic: 200 генераций в месяц
➖ Standard: безлимит Fast + Relax mode
➖ Pro: Stealth mode + коммерческое использование
➖ Высочайшее качество детализации
➖ Работа через Discord

🤔 Какой план выбрать?
➖ Basic — для начинающих, 200 генераций
➖ Standard — безлимит для активных пользователей
➖ Pro — для профессионалов и бизнеса

🟣 Что мы предлагаем?
✅ Готовый аккаунт Discord с подпиской
✅ Доступ к приватному серверу
✅ Инструкция по использованию
✅ Гарантия работы весь период

🔴 ВАЖНО!
➖ Работает через Discord
➖ Коммерческое использование в тарифе Pro
➖ Stealth mode скрывает ваши работы от других
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T03:00:00',
    variants: [
      { id: 'mj-basic', name: 'Basic (1 месяц)', price: 2490, period: '1 месяц', features: ['200 генераций', 'Fast mode', 'Базовые настройки'] },
      { id: 'mj-standard', name: 'Standard (1 месяц)', price: 4990, period: '1 месяц', features: ['Безлимит Fast', 'Relax mode', 'Все функции'] },
      { id: 'mj-pro', name: 'Pro (1 месяц)', price: 7990, period: '1 месяц', features: ['Безлимит', 'Stealth mode', 'Коммерческое использование'] },
    ]
  },
  {
    _id: '10',
    name: 'PlayStation Plus',
    price: 3990,
    images: ['/brands/Platstation.webp'],
    condition: 'new',
    category: 'gaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 PLAYSTATION PLUS НА 25.12.2025:
➖ Essential — базовые функции + бесплатные игры 🔥
➖ Extra — каталог 400+ игр
➖ Premium — классические игры + стриминг
➖ Мультиплеер без ограничений
➖ Эксклюзивные скидки в PS Store
➖ Облачное хранилище для сохранений

🤔 Какой план выбрать?
➖ Essential — для онлайн-игры и бесплатных игр каждый месяц
➖ Extra — полный каталог современных игр
➖ Premium — всё включено + ретро-игры PS1, PS2, PSP

🟣 Что мы предлагаем?
✅ Активация на ваш PSN аккаунт
✅ Подписка на регион Турция/Украина (дешевле)
✅ Помощь с созданием аккаунта
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Работает на PS4 и PS5
➖ Можно играть на любом аккаунте консоли
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T11:00:00',
    variants: [
      { id: 'ps-essential-1m', name: 'Essential (1 месяц)', price: 690, period: '1 месяц', features: ['Мультиплеер', '2-3 игры в месяц', 'Скидки PS Store'] },
      { id: 'ps-essential-1y', name: 'Essential (1 год)', price: 3990, period: '1 год', features: ['Мультиплеер', '24+ игры в год', 'Экономия 52%'] },
      { id: 'ps-extra-1m', name: 'Extra (1 месяц)', price: 1090, period: '1 месяц', features: ['Essential +', 'Каталог 400+ игр', 'Ubisoft+ Classics'] },
      { id: 'ps-extra-1y', name: 'Extra (1 год)', price: 6490, period: '1 год', features: ['Essential +', 'Каталог 400+ игр', 'Экономия 50%'] },
      { id: 'ps-premium-1y', name: 'Premium (1 год)', price: 8490, period: '1 год', features: ['Extra +', 'Ретро-игры', 'Облачный стриминг'] },
    ]
  },
  {
    _id: '11',
    name: 'Apple Music',
    price: 490,
    images: ['/brands/apple.webp'],
    condition: 'new',
    category: 'streaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 APPLE MUSIC НА 25.12.2025:
➖ 100+ миллионов треков без рекламы 🔥
➖ Dolby Atmos и Lossless Audio
➖ Скачивание для оффлайн-прослушивания
➖ Синхронизация медиатеки iCloud
➖ Lyrics в реальном времени
➖ Персональные плейлисты и радио

🤔 Individual или Family?
➖ Individual — для одного пользователя
➖ Family — до 6 человек, общая подписка
➖ Student — скидка 50% (нужна верификация)

🟣 Что мы предлагаем?
✅ Активация на ваш Apple ID
✅ Подписка на регион Турция (дешевле)
✅ Помощь с настройкой
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Работает на всех устройствах Apple
➖ Есть приложения для Android и Windows
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T11:30:00',
    variants: [
      { id: 'apple-music-1m', name: 'Individual (1 месяц)', price: 490, period: '1 месяц', features: ['Без рекламы', 'Lossless Audio', 'Оффлайн режим'] },
      { id: 'apple-music-3m', name: 'Individual (3 месяца)', price: 1290, period: '3 месяца', features: ['Без рекламы', 'Lossless Audio', 'Экономия 12%'] },
      { id: 'apple-music-1y', name: 'Individual (1 год)', price: 3990, period: '1 год', features: ['Без рекламы', 'Lossless Audio', 'Экономия 32%'] },
      { id: 'apple-music-family-1m', name: 'Family (1 месяц)', price: 690, period: '1 месяц', features: ['До 6 аккаунтов', 'Семейный доступ', 'Все функции'] },
      { id: 'apple-music-family-1y', name: 'Family (1 год)', price: 5490, period: '1 год', features: ['До 6 аккаунтов', 'Семейный доступ', 'Экономия 34%'] },
    ]
  },
  {
    _id: '12',
    name: 'Perplexity Pro',
    price: 1790,
    images: ['/brands/perp.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.8,
    description: `🟢 PERPLEXITY PRO НА 25.12.2025:
➖ AI-поисковик нового поколения 🔥
➖ Неограниченные Pro-запросы
➖ GPT-4, Claude 3, Gemini в одном месте
➖ Загрузка файлов и анализ документов
➖ API доступ для разработчиков
➖ Приоритетная скорость ответов

🤔 Почему Perplexity?
➖ Ответы с актуальными источниками
➖ Не нужно переключаться между поисковиком и ChatGPT
➖ Подходит для исследований и работы
➖ Автоматическое цитирование источников

🟣 Что мы предлагаем?
✅ Готовый аккаунт с подпиской Pro
✅ Доступ ко всем моделям AI
✅ API ключ для интеграций
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Работает без дополнительных настроек
➖ Мобильные приложения iOS/Android
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T12:00:00',
    variants: [
      { id: 'perp-1m', name: 'Pro (1 месяц)', price: 1790, period: '1 месяц', features: ['Безлимит Pro', 'Все AI модели', 'Загрузка файлов'] },
      { id: 'perp-3m', name: 'Pro (3 месяца)', price: 4790, period: '3 месяца', features: ['Безлимит Pro', 'Все AI модели', 'Экономия 11%'] },
      { id: 'perp-1y', name: 'Pro (1 год)', price: 15990, period: '1 год', features: ['Безлимит Pro', 'Все AI модели', 'Экономия 26%'] },
    ]
  },
  {
    _id: '13',
    name: 'Steam Wallet',
    price: 990,
    images: ['/brands/steam.webp'],
    condition: 'new',
    category: 'gaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 5.0,
    description: `🟢 ПОПОЛНЕНИЕ STEAM КОШЕЛЬКА:
➖ Мгновенное пополнение баланса 🔥
➖ Покупка любых игр в Steam
➖ DLC, внутриигровые покупки
➖ Подарки друзьям
➖ Работает для любого региона

🤔 Как происходит пополнение?
➖ Указываете логин Steam
➖ Выбираете сумму пополнения
➖ Оплачиваете заказ
➖ Баланс зачисляется в течение 5-30 минут

🟣 Что мы гарантируем?
✅ Официальный метод пополнения
✅ Зачисление в течение 30 минут
✅ Работа для любых регионов
✅ Возврат при проблемах

🔴 ВАЖНО!
➖ Нужен только логин, пароль не нужен
➖ Баланс в рублях или USD
➖ Гарантия 100% зачисления`,
    inStock: true,
    createdAt: '2025-12-26T12:30:00',
    variants: [
      { id: 'steam-500', name: '500₽', price: 590, features: ['Мгновенно', 'На ваш аккаунт', 'Гарантия'] },
      { id: 'steam-1000', name: '1000₽', price: 990, features: ['Мгновенно', 'На ваш аккаунт', 'Экономия 15%'] },
      { id: 'steam-2000', name: '2000₽', price: 1790, features: ['Мгновенно', 'На ваш аккаунт', 'Экономия 20%'] },
      { id: 'steam-5000', name: '5000₽', price: 3990, features: ['Мгновенно', 'На ваш аккаунт', 'Экономия 25%'] },
    ]
  },
  {
    _id: '14',
    name: 'Xbox Game Pass Ultimate',
    price: 990,
    images: ['/brands/xbox.webp'],
    condition: 'new',
    category: 'gaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 XBOX GAME PASS ULTIMATE НА 25.12.2025:
➖ 500+ игр на консоль, ПК и облако 🔥
➖ Day One релизы — новинки в день выхода
➖ EA Play включён в подписку
➖ Xbox Live Gold для мультиплеера
➖ Эксклюзивные скидки до 20%
➖ Perks — бонусы для подписчиков

🤔 Какой план выбрать?
➖ Core — мультиплеер + скидки (базовый)
➖ Standard — 100+ игр на консоль
➖ Ultimate — ВСЁ: консоль, ПК, облако, EA Play

🟣 Что мы предлагаем?
✅ Активация на ваш Microsoft аккаунт
✅ Подписка на регион Турция/Аргентина
✅ Помощь с настройкой региона
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Работает на Xbox и Windows PC
➖ Облачный гейминг на телефоне
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T13:00:00',
    variants: [
      { id: 'xbox-core-1m', name: 'Core (1 месяц)', price: 490, period: '1 месяц', features: ['Мультиплеер', 'Скидки', 'Free Play Days'] },
      { id: 'xbox-ultimate-1m', name: 'Ultimate (1 месяц)', price: 990, period: '1 месяц', features: ['500+ игр', 'EA Play', 'Облако'] },
      { id: 'xbox-ultimate-3m', name: 'Ultimate (3 месяца)', price: 2490, period: '3 месяца', features: ['500+ игр', 'EA Play', 'Экономия 16%'] },
      { id: 'xbox-ultimate-1y', name: 'Ultimate (1 год)', price: 7990, period: '1 год', features: ['500+ игр', 'EA Play', 'Экономия 33%'] },
    ]
  },
  {
    _id: '15',
    name: 'YouTube Premium',
    price: 390,
    images: ['/products/youtube.webp'],
    condition: 'new',
    category: 'streaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 YOUTUBE PREMIUM НА 26.12.2025:
➖ Без рекламы — никаких прерываний 🔥
➖ Фоновое воспроизведение
➖ Скачивание видео для оффлайн
➖ YouTube Music Premium включён
➖ YouTube Originals — эксклюзивный контент
➖ Работает на всех устройствах

🤔 Individual или Family?
➖ Individual — для одного аккаунта
➖ Family — до 5 человек в семейной группе
➖ Student — скидка 50% (верификация)

🟣 Что мы предлагаем?
✅ Подключение к Family группе (дешевле)
✅ Или личная подписка на ваш аккаунт
✅ Подписка через регион Турция/Аргентина
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Работает в любой стране
➖ YouTube Music входит в стоимость
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T14:00:00',
    variants: [
      { id: 'yt-individual-1m', name: 'Individual (1 месяц)', price: 390, period: '1 месяц', features: ['Без рекламы', 'YouTube Music', 'Оффлайн'] },
      { id: 'yt-individual-3m', name: 'Individual (3 месяца)', price: 990, period: '3 месяца', features: ['Без рекламы', 'YouTube Music', 'Экономия 15%'] },
      { id: 'yt-family-1m', name: 'Family (1 месяц)', price: 190, period: '1 месяц', features: ['До 5 аккаунтов', 'Все функции', 'Выгодно'] },
      { id: 'yt-family-3m', name: 'Family (3 месяца)', price: 490, period: '3 месяца', features: ['До 5 аккаунтов', 'Все функции', 'Экономия 14%'] },
    ]
  },
  {
    _id: '16',
    name: 'Netflix',
    price: 490,
    images: ['/products/netflix.webp'],
    condition: 'new',
    category: 'streaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.8,
    description: `🟢 NETFLIX PREMIUM НА 26.12.2025:
➖ 4K Ultra HD + HDR качество 🔥
➖ До 4 экранов одновременно
➖ Все фильмы и сериалы без ограничений
➖ Скачивание для оффлайн-просмотра
➖ Новинки каждую неделю
➖ Без рекламы

🤔 Какой план выбрать?
➖ Standard — Full HD, 2 экрана
➖ Premium — 4K Ultra HD, 4 экрана
➖ С рекламой — дешевле, но с рекламой

🟣 Что мы предлагаем?
✅ Подключение к Premium аккаунту
✅ Создание отдельного профиля для вас
✅ Работает на всех устройствах
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Каталог зависит от региона
➖ Для расширенного каталога может потребоваться прокси
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T14:30:00',
    variants: [
      { id: 'netflix-standard-1m', name: 'Standard (1 месяц)', price: 490, period: '1 месяц', features: ['Full HD', '2 экрана', 'Без рекламы'] },
      { id: 'netflix-premium-1m', name: 'Premium (1 месяц)', price: 690, period: '1 месяц', features: ['4K Ultra HD', '4 экрана', 'Все функции'] },
      { id: 'netflix-premium-3m', name: 'Premium (3 месяца)', price: 1790, period: '3 месяца', features: ['4K Ultra HD', '4 экрана', 'Экономия 13%'] },
    ]
  },
  {
    _id: '17',
    name: 'Discord Nitro',
    price: 690,
    images: ['/products/discord.webp'],
    condition: 'new',
    category: 'gaming',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 DISCORD NITRO НА 26.12.2025:
➖ Кастомные эмодзи везде 🔥
➖ Анимированный аватар и баннер
➖ 2 буста для серверов
➖ Загрузка файлов до 500MB
➖ Стриминг в 4K 60fps
➖ Кастомный тег (например #0001)

🤔 Nitro или Nitro Basic?
➖ Nitro Basic — эмодзи, стикеры, 50MB файлы
➖ Nitro — всё включено + бусты + 500MB

🟣 Что мы предлагаем?
✅ Активация на ваш Discord аккаунт
✅ Полная подписка Nitro
✅ Моментальная активация
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Нужен ваш Discord аккаунт
➖ Активация через Gift код
➖ Гарантия возврата при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T15:00:00',
    variants: [
      { id: 'nitro-basic-1m', name: 'Nitro Basic (1 месяц)', price: 290, period: '1 месяц', features: ['Эмодзи везде', 'Стикеры', '50MB файлы'] },
      { id: 'nitro-1m', name: 'Nitro (1 месяц)', price: 690, period: '1 месяц', features: ['Все функции', '2 буста', '500MB файлы'] },
      { id: 'nitro-1y', name: 'Nitro (1 год)', price: 6490, period: '1 год', features: ['Все функции', '2 буста', 'Экономия 22%'] },
    ]
  },
  {
    _id: '18',
    name: 'Microsoft 365',
    price: 1490,
    images: ['/products/microsoft365.webp'],
    condition: 'new',
    category: 'software',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 5.0,
    description: `🟢 MICROSOFT 365 НА 26.12.2025:
➖ Word, Excel, PowerPoint, Outlook 🔥
➖ 1TB OneDrive облачного хранилища
➖ Microsoft Teams для созвонов
➖ Все обновления включены
➖ До 5 устройств одновременно
➖ Мобильные приложения

🤔 Personal или Family?
➖ Personal — 1 пользователь, 1TB
➖ Family — до 6 пользователей, 6TB общего пространства

🟣 Что мы предлагаем?
✅ Лицензионный ключ активации
✅ Привязка к вашему Microsoft аккаунту
✅ Все приложения Office
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Работает на Windows и Mac
➖ Мобильные версии включены
➖ Ключ одноразовый, привязывается к аккаунту`,
    inStock: true,
    createdAt: '2025-12-26T15:30:00',
    variants: [
      { id: 'ms365-personal-1y', name: 'Personal (1 год)', price: 1490, period: '1 год', features: ['1 пользователь', '1TB OneDrive', 'Все приложения'] },
      { id: 'ms365-family-1y', name: 'Family (1 год)', price: 2490, period: '1 год', features: ['До 6 человек', '6TB OneDrive', 'Все приложения'] },
    ]
  },
  {
    _id: '19',
    name: 'Canva Pro',
    price: 590,
    images: ['/products/canva.webp'],
    condition: 'new',
    category: 'software',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 CANVA PRO НА 26.12.2025:
➖ 100+ миллионов шаблонов и элементов 🔥
➖ Премиум фото, видео, аудио
➖ Brand Kit — фирменный стиль
➖ Удаление фона одним кликом
➖ Magic Resize — изменение размеров
➖ Планировщик публикаций

🤔 Для кого Canva Pro?
➖ SMM-специалисты — посты, сторис
➖ Дизайнеры — презентации, баннеры
➖ Маркетологи — рекламные материалы
➖ Все — красивый контент без навыков

🟣 Что мы предлагаем?
✅ Приглашение в Team аккаунт
✅ Полный доступ ко всем Pro функциям
✅ Работает на вашем email
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Работает в браузере и приложениях
➖ Экспорт в любых форматах
➖ Гарантия замены при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T16:00:00',
    variants: [
      { id: 'canva-1m', name: 'Pro (1 месяц)', price: 590, period: '1 месяц', features: ['Все шаблоны', 'Brand Kit', 'Magic Resize'] },
      { id: 'canva-3m', name: 'Pro (3 месяца)', price: 1490, period: '3 месяца', features: ['Все шаблоны', 'Brand Kit', 'Экономия 16%'] },
      { id: 'canva-1y', name: 'Pro (1 год)', price: 4990, period: '1 год', features: ['Все шаблоны', 'Brand Kit', 'Экономия 30%'] },
    ]
  },
  {
    _id: '20',
    name: 'GitHub Copilot',
    price: 990,
    images: ['/products/github.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 },
    rating: 5.0,
    description: `🟢 GITHUB COPILOT НА 26.12.2025:
➖ AI-автодополнение кода в реальном времени 🔥
➖ Поддержка всех языков программирования
➖ Интеграция с VS Code, JetBrains, Neovim
➖ Copilot Chat — общение с AI о коде
➖ Генерация тестов и документации
➖ Объяснение чужого кода

🤔 Individual или Business?
➖ Individual — для личного использования
➖ Business — для команд, с админ-панелью

🟣 Что мы предлагаем?
✅ Активация на ваш GitHub аккаунт
✅ Полный доступ к Copilot + Chat
✅ Работает во всех IDE
✅ Гарантия на весь период

🔴 ВАЖНО!
➖ Нужен GitHub аккаунт
➖ Значительно ускоряет разработку
➖ Гарантия возврата при проблемах`,
    inStock: true,
    createdAt: '2025-12-26T16:30:00',
    variants: [
      { id: 'copilot-1m', name: 'Individual (1 месяц)', price: 990, period: '1 месяц', features: ['Автодополнение', 'Copilot Chat', 'Все IDE'] },
      { id: 'copilot-1y', name: 'Individual (1 год)', price: 9900, period: '1 год', features: ['Автодополнение', 'Copilot Chat', 'Экономия 17%'] },
    ]
  },
]

const mockUsers = [
  {
    id: '1301598469',
    username: 'fastpay',
    name: 'FastPay',
    avatar: '/fastpay-avatar.png',
    isVerified: true,
    joinedAt: '2025-01-15',
    isAdmin: true,
    referralCode: 'FASTPAY1301',
    referralCount: 0,
    bonusBalance: 0,
    stats: { rating: 5.0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 }
  },
  {
    id: 'dev_user',
    name: 'Vy',
    username: 'devuser',
    joinedAt: '2025-12-26',
    referralCode: 'FASTPAYDEV',
    referralCount: 0,
    bonusBalance: 0,
    stats: { rating: 0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 }
  },
]

const defaultPromoCodes = [
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 500,
    maxUses: 1000,
    usedCount: 156,
    isActive: true,
    description: 'Скидка 10% на первый заказ от 500₽'
  },
  {
    code: 'FASTPAY20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 2000,
    maxUses: 500,
    usedCount: 89,
    isActive: true,
    description: 'Скидка 20% на заказ от 2000₽'
  },
  {
    code: 'NEWYEAR2025',
    discountType: 'fixed',
    discountValue: 500,
    minOrderAmount: 3000,
    maxUses: 200,
    usedCount: 45,
    expiresAt: '2025-01-31T23:59:59',
    isActive: true,
    description: 'Скидка 500₽ на заказ от 3000₽'
  },
]

// Load data from storage or use defaults
let mockProducts = loadProducts()
if (mockProducts.length === 0) {
  mockProducts = defaultProducts
  saveProducts(mockProducts)
}

let mockPromoCodes = loadPromoCodes()
if (mockPromoCodes.length === 0) {
  mockPromoCodes = defaultPromoCodes
  savePromoCodes(mockPromoCodes)
}

async function start() {
  try {
    await fastify.register(cors, {
      origin: true, // Allow all origins for Telegram Mini App
      credentials: true
    })

    fastify.get('/products', async (request) => {
      const { category, condition, search } = request.query as any
      let filtered = [...mockProducts]
      if (category && category !== 'all') filtered = filtered.filter(p => p.category === category)
      if (condition && condition !== 'all') filtered = filtered.filter(p => p.condition === condition)
      if (search) filtered = searchProducts(filtered, search)
      return filtered
    })

    // Search suggestions endpoint
    fastify.get('/products/search/suggestions', async (request) => {
      const { query } = request.query as any
      return getSearchSuggestions(mockProducts, query || '', 10)
    })

    fastify.get('/products/:id', async (request) => {
      const { id } = request.params as any
      const product = mockProducts.find(p => p._id === id)
      return product || { error: 'Product not found' }
    })

    fastify.post('/products/favorites', async (request) => {
      const { favoriteIds } = request.body as any
      if (!favoriteIds || favoriteIds.length === 0) return []
      return mockProducts.filter(p => favoriteIds.includes(p._id))
    })

    // Admin API - Create product
    fastify.post('/admin/products', async (request) => {
      const product = request.body as any
      const newProduct = {
        ...product,
        _id: product._id || String(Date.now()),
        createdAt: product.createdAt || new Date().toISOString(),
        inStock: true
      }
      mockProducts.unshift(newProduct)
      saveProducts(mockProducts)
      return { success: true, product: newProduct }
    })

    // Admin API - Update product
    fastify.put('/admin/products/:id', async (request) => {
      const { id } = request.params as any
      const updates = request.body as any
      const index = mockProducts.findIndex(p => p._id === id)
      if (index === -1) return { success: false, error: 'Product not found' }
      mockProducts[index] = { ...mockProducts[index], ...updates }
      saveProducts(mockProducts)
      return { success: true, product: mockProducts[index] }
    })

    // Admin API - Delete product
    fastify.delete('/admin/products/:id', async (request) => {
      const { id } = request.params as any
      const index = mockProducts.findIndex(p => p._id === id)
      if (index === -1) return { success: false, error: 'Product not found' }
      mockProducts.splice(index, 1)
      saveProducts(mockProducts)
      return { success: true }
    })

    // Admin API - Get all sellers
    fastify.get('/admin/sellers', async () => {
      const sellers = [...new Map(mockProducts.map(p => [p.seller.id, p.seller])).values()]
      return sellers
    })

    // Admin API - Promo codes
    fastify.get('/admin/promo', async () => {
      return mockPromoCodes
    })

    fastify.post('/admin/promo', async (request) => {
      const promo = request.body as any
      const existing = mockPromoCodes.findIndex(p => p.code === promo.code)
      if (existing !== -1) {
        mockPromoCodes[existing] = promo
      } else {
        mockPromoCodes.push(promo)
      }
      savePromoCodes(mockPromoCodes)
      return { success: true, promo }
    })

    fastify.put('/admin/promo/:code', async (request) => {
      const { code } = request.params as any
      const updates = request.body as any
      const index = mockPromoCodes.findIndex(p => p.code === code)
      if (index === -1) return { success: false, error: 'Promo code not found' }
      mockPromoCodes[index] = { ...mockPromoCodes[index], ...updates }
      savePromoCodes(mockPromoCodes)
      return { success: true, promo: mockPromoCodes[index] }
    })

    fastify.delete('/admin/promo/:code', async (request) => {
      const { code } = request.params as any
      const index = mockPromoCodes.findIndex(p => p.code === code)
      if (index === -1) return { success: false, error: 'Promo code not found' }
      mockPromoCodes.splice(index, 1)
      savePromoCodes(mockPromoCodes)
      return { success: true }
    })

    // Admin API - Sellers
    fastify.post('/admin/sellers', async (request) => {
      const seller = request.body as any
      // Update all products with this seller
      mockProducts.forEach(p => {
        if (p.seller.id === seller.id) {
          p.seller = seller
        }
      })
      saveProducts(mockProducts)
      return { success: true, seller }
    })

    fastify.put('/admin/sellers/:id', async (request) => {
      const { id } = request.params as any
      const updates = request.body as any
      // Update all products with this seller
      let updated = false
      mockProducts.forEach(p => {
        if (p.seller.id === id) {
          p.seller = { ...p.seller, ...updates }
          updated = true
        }
      })
      if (!updated) return { success: false, error: 'Seller not found' }
      saveProducts(mockProducts)
      return { success: true, seller: updates }
    })

    // ========== ADMIN ORDERS API ==========

    // Get all orders (with optional filters)
    fastify.get('/admin/orders', async (request) => {
      const { status, userId, limit = 50, offset = 0 } = request.query as any
      let orders = loadOrders()

      // Apply filters
      if (status) {
        orders = orders.filter(o => o.status === status)
      }
      if (userId) {
        orders = orders.filter(o => o.userId === userId)
      }

      // Apply pagination
      const total = orders.length
      const paginatedOrders = orders.slice(Number(offset), Number(offset) + Number(limit))

      return {
        success: true,
        orders: paginatedOrders,
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    })

    // Get orders stats (must be before :id route)
    fastify.get('/admin/orders/stats', async () => {
      const orders = loadOrders()

      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        paid: orders.filter(o => o.status === 'paid').length,
        processing: orders.filter(o => o.status === 'processing').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        refunded: orders.filter(o => o.status === 'refunded').length,
        totalRevenue: orders
          .filter(o => ['paid', 'processing', 'delivered'].includes(o.status))
          .reduce((sum, o) => sum + o.amount, 0)
      }

      return { success: true, stats }
    })

    // Get single order by ID
    fastify.get('/admin/orders/:id', async (request) => {
      const { id } = request.params as any
      const order = getOrderById(id)

      if (!order) {
        return { success: false, error: 'Order not found' }
      }

      return { success: true, order }
    })

    // Update order status
    fastify.put('/admin/orders/:id/status', async (request) => {
      const { id } = request.params as any
      const { status } = request.body as any

      if (!status) {
        return { success: false, error: 'Status is required' }
      }

      const validStatuses: OrderStatus[] = ['pending', 'paid', 'processing', 'delivered', 'cancelled', 'refunded']
      if (!validStatuses.includes(status)) {
        return { success: false, error: 'Invalid status' }
      }

      const updates: Partial<Order> = { status }
      if (status === 'delivered') {
        updates.deliveredAt = new Date().toISOString()
      }

      const updatedOrder = updateOrder(id, updates)
      if (!updatedOrder) {
        return { success: false, error: 'Order not found' }
      }

      return { success: true, order: updatedOrder }
    })

    // Deliver order (set delivery data and mark as delivered)
    fastify.post('/admin/orders/:id/deliver', async (request) => {
      const { id } = request.params as any
      const { deliveryData, deliveryNote } = request.body as any

      if (!deliveryData) {
        return { success: false, error: 'Delivery data is required' }
      }

      const updatedOrder = updateOrder(id, {
        status: 'delivered',
        deliveryData,
        deliveryNote,
        deliveredAt: new Date().toISOString()
      })

      if (!updatedOrder) {
        return { success: false, error: 'Order not found' }
      }

      console.log('Order delivered:', id, { deliveryData, deliveryNote })

      return { success: true, order: updatedOrder }
    })

    // Cancel order
    fastify.post('/admin/orders/:id/cancel', async (request) => {
      const { id } = request.params as any

      const updatedOrder = updateOrder(id, {
        status: 'cancelled'
      })

      if (!updatedOrder) {
        return { success: false, error: 'Order not found' }
      }

      return { success: true, order: updatedOrder }
    })

    // Refund order
    fastify.post('/admin/orders/:id/refund', async (request) => {
      const { id } = request.params as any

      const updatedOrder = updateOrder(id, {
        status: 'refunded'
      })

      if (!updatedOrder) {
        return { success: false, error: 'Order not found' }
      }

      return { success: true, order: updatedOrder }
    })

    // ========== END ADMIN ORDERS API ==========

    fastify.get('/users/:id', async (request) => {
      const { id } = request.params as any
      const user = mockUsers.find(u => u.id === id)
      return user || { error: 'User not found' }
    })

    fastify.post('/users', async (request) => {
      const userData = request.body as any
      const existing = mockUsers.find(u => u.id === userData.id)
      if (existing) return existing
      const newUser = {
        id: userData.id,
        name: userData.name || 'User',
        username: userData.username,
        avatar: userData.avatar,
        joinedAt: new Date().toISOString(),
        referralCode: `FASTPAY${userData.id.slice(0, 6)}`,
        referredBy: userData.referredBy || null,
        referralCount: 0,
        bonusBalance: userData.referredBy ? 100 : 0, // 100₽ бонус за регистрацию по реферальной ссылке
        stats: { rating: 0, reviewsCount: 0, ordersCount: 0, returnsCount: 0 },
      }
      mockUsers.push(newUser)

      // Начисляем бонус рефереру
      if (userData.referredBy) {
        const referrer = mockUsers.find(u => u.referralCode === userData.referredBy)
        if (referrer) {
          referrer.referralCount = (referrer.referralCount || 0) + 1
          referrer.bonusBalance = (referrer.bonusBalance || 0) + 200 // 200₽ за приглашенного друга
        }
      }

      return newUser
    })

    fastify.post('/promo/validate', async (request) => {
      const { code, orderAmount } = request.body as any
      const promo = mockPromoCodes.find(p => p.code.toUpperCase() === code.toUpperCase())

      if (!promo) {
        return { valid: false, message: 'Промокод не найден' }
      }

      if (!promo.isActive) {
        return { valid: false, message: 'Промокод неактивен' }
      }

      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
        return { valid: false, message: 'Промокод истёк' }
      }

      if (promo.maxUses && promo.usedCount >= promo.maxUses) {
        return { valid: false, message: 'Промокод исчерпан' }
      }

      if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
        return { valid: false, message: `Минимальная сумма заказа ${promo.minOrderAmount}₽` }
      }

      let discount = 0
      if (promo.discountType === 'percentage') {
        discount = Math.round(orderAmount * promo.discountValue / 100)
      } else {
        discount = promo.discountValue
      }

      return {
        valid: true,
        discount,
        promo: {
          code: promo.code,
          description: promo.description,
          discountType: promo.discountType,
          discountValue: promo.discountValue
        }
      }
    })

    fastify.get('/promo/active', async () => {
      return mockPromoCodes.filter(p => p.isActive)
    })

    // Test endpoint to check CryptoBot connection
    fastify.get('/payment/test-cryptobot', async (request, reply) => {
      try {
        const tokenInfo = cryptoBot.getTokenInfo()

        if (!tokenInfo.configured) {
          return {
            success: false,
            error: 'CRYPTOBOT_TOKEN not configured',
            configured: false,
            tokenInfo
          }
        }

        const me = await cryptoBot.getMe()
        return {
          success: true,
          configured: true,
          bot_info: me,
          tokenInfo
        }
      } catch (error: any) {
        console.error('CryptoBot test failed:', error)
        return {
          success: false,
          error: error.message,
          details: error.response?.data,
          tokenInfo: cryptoBot.getTokenInfo()
        }
      }
    })

    // CryptoBot Payment endpoints
    fastify.post('/payment/create-invoice', async (request, reply) => {
      try {
        const { amount, description, productId, variantId, asset, userId, userName, userUsername } = request.body as any

        console.log('Payment request received:', { amount, description, productId, variantId, asset, userId })

        // Validate inputs
        if (!amount || amount <= 0) {
          reply.code(400)
          return {
            success: false,
            error: 'Invalid amount'
          }
        }

        // Convert RUB amount to crypto (markup already applied on frontend)
        const cryptoAsset = (asset || 'USDT') as CryptoAsset

        let cryptoAmount: string
        try {
          cryptoAmount = convertRubToCrypto(amount, cryptoAsset)
          console.log(`Converted: ${amount} RUB = ${cryptoAmount} ${cryptoAsset}`)
        } catch (conversionError: any) {
          console.error('Currency conversion failed:', conversionError)
          reply.code(400)
          return {
            success: false,
            error: `Currency conversion failed: ${conversionError.message}`
          }
        }

        // Get product info for order
        const product = mockProducts.find(p => p._id === productId)
        const variant = product?.variants?.find((v: any) => v.id === variantId)

        // Generate order ID
        const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

        // Create invoice
        console.log('Creating CryptoBot invoice...')
        const frontendUrl = process.env.FRONTEND_URL || 'https://fast-pay-ai.vercel.app'
        const invoice = await cryptoBot.createInvoice({
          asset: cryptoAsset,
          amount: cryptoAmount,
          description: description || 'Оплата заказа FastPay',
          paid_btn_name: 'callback',
          paid_btn_url: `${frontendUrl}/payment/success?orderId=${orderId}`,
          payload: JSON.stringify({ productId, variantId, orderId }),
          allow_comments: false,
          allow_anonymous: true,
          expires_in: 3600,
        })

        console.log('Invoice created successfully:', invoice.invoice_id)

        // Create pending order
        const order: Order = {
          id: orderId,
          oderId: String(invoice.invoice_id),
          userId: userId || 'anonymous',
          userName: userName,
          userUsername: userUsername,
          productId: productId,
          productName: product?.name || 'Unknown',
          variantId: variantId,
          variantName: variant?.name,
          amount: amount,
          paymentMethod: 'cryptobot',
          paymentId: String(invoice.invoice_id),
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        addOrder(order)
        console.log('Order created:', orderId)

        return {
          success: true,
          invoice: {
            id: invoice.invoice_id,
            hash: invoice.hash,
            payUrl: invoice.bot_invoice_url,
            amount: invoice.amount,
            asset: invoice.asset,
            status: invoice.status,
          },
          orderId
        }
      } catch (error: any) {
        const tokenInfo = cryptoBot.getTokenInfo()

        console.error('❌ Error creating invoice:', {
          message: error.message,
          response: error.response?.data,
          stack: error.stack,
          tokenInfo
        })

        // Check if error is due to missing token
        if (!tokenInfo.configured || error.message?.includes('token')) {
          reply.code(500)
          return {
            success: false,
            error: 'Payment system not configured.',
            details: {
              tokenInfo,
              originalError: error.message
            }
          }
        }

        reply.code(500)
        return {
          success: false,
          error: error.message || 'Failed to create invoice',
          details: error.response?.data || undefined
        }
      }
    })

    fastify.get('/payment/invoice/:invoiceId', async (request, reply) => {
      try {
        const { invoiceId } = request.params as any
        const invoice = await cryptoBot.getInvoice(parseInt(invoiceId))

        return {
          success: true,
          invoice: {
            id: invoice.invoice_id,
            status: invoice.status,
            amount: invoice.amount,
            asset: invoice.asset,
          }
        }
      } catch (error: any) {
        console.error('Error getting invoice:', error)
        reply.code(500)
        return { success: false, error: error.message || 'Failed to get invoice' }
      }
    })

    fastify.get('/payment/balance', async (request, reply) => {
      try {
        const balance = await cryptoBot.getBalance()
        return { success: true, balance }
      } catch (error: any) {
        console.error('Error getting balance:', error)
        reply.code(500)
        return { success: false, error: error.message || 'Failed to get balance' }
      }
    })

    // Webhook endpoint for CryptoBot payments
    fastify.post('/payment/webhook', async (request, reply) => {
      try {
        const signature = request.headers['crypto-pay-api-signature'] as string
        const body = request.body as any

        console.log('Received webhook:', body)

        // TODO: Verify signature for security
        // const crypto = require('crypto')
        // const hash = crypto.createHmac('sha256', crypto.createHash('sha256').update(CRYPTOBOT_TOKEN).digest())
        //   .update(JSON.stringify(body))
        //   .digest('hex')
        // if (hash !== signature) {
        //   reply.code(401)
        //   return { error: 'Invalid signature' }
        // }

        if (body.update_type === 'invoice_paid') {
          const invoice = body.payload
          const payload = JSON.parse(invoice.payload || '{}')

          console.log(`Payment received for invoice ${invoice.invoice_id}:`, {
            amount: invoice.amount,
            asset: invoice.asset,
            productId: payload.productId,
            variantId: payload.variantId,
            orderId: payload.orderId,
          })

          // Update order status to paid
          if (payload.orderId) {
            const updatedOrder = updateOrder(payload.orderId, {
              status: 'paid',
              paidAt: new Date().toISOString(),
            })
            if (updatedOrder) {
              console.log(`✅ Order ${payload.orderId} marked as paid`)
            } else {
              console.warn(`⚠️ Order ${payload.orderId} not found`)
            }
          }

          // TODO: Send notification to user via Telegram bot
        }

        return { success: true }
      } catch (error: any) {
        console.error('Webhook error:', error)
        reply.code(500)
        return { error: error.message }
      }
    })

    // ============================================
    // CactusPay Payment endpoints
    // ============================================

    // Test endpoint to check CactusPay connection
    fastify.get('/payment/test-cactuspay', async (request, reply) => {
      try {
        const tokenInfo = cactusPay.getTokenInfo()

        if (!tokenInfo.configured) {
          return {
            success: false,
            error: 'CACTUSPAY_TOKEN not configured',
            configured: false,
            envCheck: !!process.env.CACTUSPAY_TOKEN
          }
        }

        return {
          success: true,
          configured: true,
          message: 'CactusPay is configured',
          tokenInfo
        }
      } catch (error: any) {
        console.error('CactusPay test failed:', error)
        return {
          success: false,
          error: error.message
        }
      }
    })

    // Create CactusPay payment
    fastify.post('/payment/cactuspay/create', async (request, reply) => {
      try {
        const { amount, description, productId, variantId, method, userIp, userId, userName, userUsername } = request.body as any

        console.log('CactusPay payment request:', { amount, description, productId, variantId, method, userId })

        if (!amount || amount <= 0) {
          reply.code(400)
          return {
            success: false,
            error: 'Invalid amount'
          }
        }

        if (!cactusPay.isConfigured()) {
          reply.code(500)
          return {
            success: false,
            error: 'CactusPay not configured. Add CACTUSPAY_TOKEN to environment variables.',
            debug: {
              envCheck: !!process.env.CACTUSPAY_TOKEN,
              tokenInfo: cactusPay.getTokenInfo()
            }
          }
        }

        // Get product info for order
        const product = mockProducts.find(p => p._id === productId)
        const variant = product?.variants?.find((v: any) => v.id === variantId)

        // Generate unique order ID
        const orderId = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

        // Determine payment method type
        const paymentMethodType = method === 'sbp' ? 'cactuspay-sbp' : 'cactuspay-card'

        // Create payment
        const result = await cactusPay.createPayment({
          amount: Math.round(amount),
          order_id: orderId,
          description: description || 'Оплата заказа FastPay',
          method: method as PaymentMethod,
          user_ip: userIp,
        })

        if (result.status === 'success' && result.response) {
          console.log('CactusPay payment created:', orderId)

          // Create pending order
          const order: Order = {
            id: orderId,
            oderId: orderId,
            userId: userId || 'anonymous',
            userName: userName,
            userUsername: userUsername,
            productId: productId,
            productName: product?.name || 'Unknown',
            variantId: variantId,
            variantName: variant?.name,
            amount: amount,
            paymentMethod: paymentMethodType as any,
            paymentId: orderId,
            status: 'pending',
            createdAt: new Date().toISOString(),
          }
          addOrder(order)
          console.log('Order created:', orderId)

          return {
            success: true,
            payment: {
              orderId: orderId,
              payUrl: result.response.url,
              amount: amount,
              requisite: result.response.requisite,
            }
          }
        } else {
          throw new Error('Failed to create payment')
        }
      } catch (error: any) {
        console.error('CactusPay create payment error:', error)
        reply.code(500)
        return {
          success: false,
          error: error.message || 'Failed to create payment'
        }
      }
    })

    // Check CactusPay payment status
    fastify.get('/payment/cactuspay/status/:orderId', async (request, reply) => {
      try {
        const { orderId } = request.params as any

        if (!orderId) {
          reply.code(400)
          return { success: false, error: 'Order ID required' }
        }

        const result = await cactusPay.getPaymentStatus(orderId)

        return {
          success: true,
          payment: {
            orderId: result.response?.order_id,
            status: result.response?.status,
            amount: result.response?.amount,
            isPaid: result.response?.status === 'ACCEPT'
          }
        }
      } catch (error: any) {
        console.error('CactusPay status check error:', error)
        reply.code(500)
        return { success: false, error: error.message }
      }
    })

    // CactusPay webhook handler
    fastify.post('/payment/cactuspay/webhook', async (request, reply) => {
      try {
        const body = request.body as any

        console.log('CactusPay webhook received:', body)

        const { id, order_id, amount } = body

        if (!order_id) {
          reply.code(400)
          return { error: 'Missing order_id' }
        }

        // Verify payment status via API
        const statusResult = await cactusPay.getPaymentStatus(order_id)

        if (statusResult.response?.status === 'ACCEPT') {
          console.log(`CactusPay payment confirmed: ${order_id}`, {
            amount: statusResult.response.amount,
            cactusPayId: id
          })

          // Update order status to paid
          const updatedOrder = updateOrder(order_id, {
            status: 'paid',
            paymentId: String(id),
            paidAt: new Date().toISOString()
          })

          if (updatedOrder) {
            console.log('Order updated to paid:', updatedOrder.id)
          } else {
            console.warn('Order not found for update:', order_id)
          }
        }

        return { success: true }
      } catch (error: any) {
        console.error('CactusPay webhook error:', error)
        reply.code(500)
        return { error: error.message }
      }
    })

    // Cancel CactusPay H2H details
    fastify.post('/payment/cactuspay/cancel', async (request, reply) => {
      try {
        const { orderId } = request.body as any

        if (!orderId) {
          reply.code(400)
          return { success: false, error: 'Order ID required' }
        }

        const result = await cactusPay.cancelDetails(orderId)

        return {
          success: result.status === 'success'
        }
      } catch (error: any) {
        console.error('CactusPay cancel error:', error)
        reply.code(500)
        return { success: false, error: error.message }
      }
    })

    // Chat API
    fastify.post('/chats/create', async (request, reply) => {
      try {
        const { buyerId, sellerId, productId, productName } = request.body as any

        if (!buyerId || !sellerId || !productId) {
          reply.code(400)
          return { success: false, error: 'Missing required fields' }
        }

        const seller = mockProducts.find(p => p._id === productId)?.seller
        if (!seller) {
          reply.code(404)
          return { success: false, error: 'Seller not found' }
        }

        // Create a unique chat ID based on buyer, seller and product
        const chatId = `chat-${buyerId}-${sellerId}-${productId}`

        const chat = {
          id: chatId,
          type: 'seller',
          title: `${seller.name} - ${productName}`,
          avatar: seller.avatar,
          lastMessage: null,
          lastMessageTime: new Date().toISOString(),
          unread: 0,
          sellerId: sellerId,
          productId: productId
        }

        return { success: true, chat }
      } catch (error: any) {
        console.error('Error creating chat:', error)
        reply.code(500)
        return { success: false, error: error.message || 'Failed to create chat' }
      }
    })

    fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString(), mode: 'mock-digital' }))

    const port = parseInt(process.env.PORT || '3001')
    const host = process.env.HOST || '0.0.0.0'
    await fastify.listen({ port, host })
    console.log(`🚀 Digital Products Server: http://${host}:${port}`)
    console.log(`📦 ${mockProducts.length} digital products`)
    console.log(`✨ Updated with real AI service logos!`)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

start()
