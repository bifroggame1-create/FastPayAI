import Fastify from 'fastify'
import cors from '@fastify/cors'
import dotenv from 'dotenv'
import { cryptoBot } from './cryptobot'

dotenv.config()

const fastify = Fastify({
  logger: true,
})

// Сокращенная версия - первые 10 товаров
const mockProducts = [
  {
    _id: '1',
    name: 'Claude AI Pro',
    price: 1990,
    images: ['/brands/claude.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
➖ Для доступа из РФ используйте VPN
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
➖ Для входа из РФ потребуется VPN
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
➖ VPN может потребоваться для доступа
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
    name: 'NordVPN Premium',
    price: 2990,
    images: ['/brands/nord.webp'],
    condition: 'new',
    category: 'vpn',
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
    rating: 4.9,
    description: `🟢 ВОЗМОЖНОСТИ NORDVPN PREMIUM:
➖ 6000+ серверов в 60+ странах 🔥
➖ Безлимитный трафик и скорость
➖ До 6 устройств одновременно
➖ Threat Protection — защита от вредоносов
➖ Meshnet — безопасная сеть устройств
➖ Kill Switch — защита при обрыве VPN

🤔 Варианты получения:
➖ «АВТО 24/7» — мгновенная выдача логина и пароля
➖ Личный аккаунт с полным доступом
➖ Возможность смены пароля

🟣 Что мы гарантируем?
✅ Оригинальная подписка NordVPN
✅ Работа на всех устройствах
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
➖ Работает без VPN
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
    seller: { id: '1301598469', name: 'FastPay', avatar: 'https://fast-pay-ai.vercel.app/logo.svg', rating: 5.0 },
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
]

const mockUsers = [
  {
    id: '1301598469',
    username: 'fastpay',
    name: 'FastPay',
    avatar: 'https://i.pravatar.cc/150?u=1301598469',
    joinedAt: '2025-01-15',
    isAdmin: true,
    referralCode: 'FASTPAY1301',
    referralCount: 247,
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

const mockPromoCodes = [
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

async function start() {
  try {
    await fastify.register(cors, { origin: process.env.FRONTEND_URL || 'http://localhost:3000' })

    fastify.get('/products', async (request) => {
      const { category, condition, search } = request.query as any
      let filtered = [...mockProducts]
      if (category && category !== 'all') filtered = filtered.filter(p => p.category === category)
      if (condition && condition !== 'all') filtered = filtered.filter(p => p.condition === condition)
      if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      return filtered
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

    // CryptoBot Payment endpoints
    fastify.post('/payment/create-invoice', async (request, reply) => {
      try {
        const { amount, description, productId, variantId, asset } = request.body as any

        const invoice = await cryptoBot.createInvoice({
          asset: asset || 'USDT', // TON, USDT, BTC, etc.
          amount: amount,
          description: description || 'Оплата заказа FastPay',
          paid_btn_name: 'callback',
          paid_btn_url: `${process.env.FRONTEND_URL}/payment/success`,
          payload: JSON.stringify({ productId, variantId }),
          allow_comments: false,
          allow_anonymous: true,
        })

        return {
          success: true,
          invoice: {
            id: invoice.invoice_id,
            hash: invoice.hash,
            payUrl: invoice.bot_invoice_url,
            amount: invoice.amount,
            asset: invoice.asset,
            status: invoice.status,
          }
        }
      } catch (error: any) {
        console.error('Error creating invoice:', error)
        reply.code(500)
        return { success: false, error: error.message || 'Failed to create invoice' }
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
