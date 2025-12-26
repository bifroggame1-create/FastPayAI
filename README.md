# FastPay - Telegram Mini App Marketplace

Маркетплейс цифровых товаров и подписок с интеграцией CryptoBot для приема платежей в криптовалюте.

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- npm или yarn

### Установка и запуск (Development)

1. **Клонируйте репозиторий**
```bash
git clone <repository-url>
cd WebAppAiShop
```

2. **Настройка Backend**
```bash
cd backend
npm install

# Скопируйте и настройте переменные окружения
cp .env.example .env
# Отредактируйте .env и добавьте ваш CRYPTOBOT_TOKEN
```

3. **Настройка Frontend**
```bash
cd ../frontend
npm install

# Скопируйте переменные окружения (опционально)
cp .env.local.example .env.local
```

4. **Запуск приложения**

В разных терминалах запустите:

**Backend (Mock Server для разработки):**
```bash
cd backend
npm run dev:mock
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000`

## 📁 Структура проекта

```
WebAppAiShop/
├── backend/              # Fastify API сервер
│   ├── src/
│   │   ├── server-mock.ts    # Mock сервер для разработки (in-memory данные)
│   │   ├── server.ts         # Production сервер (MongoDB)
│   │   ├── cryptobot.ts      # CryptoBot API интеграция
│   │   ├── models/           # MongoDB модели
│   │   ├── routes/           # API роуты
│   │   └── utils/            # Утилиты
│   └── package.json
│
└── frontend/             # Next.js приложение
    ├── src/
    │   ├── app/              # Next.js App Router страницы
    │   │   ├── page.tsx          # Главная страница
    │   │   ├── product/[id]/     # Страница товара
    │   │   ├── checkout/         # Оформление заказа
    │   │   ├── profile/          # Профиль пользователя
    │   │   └── favorites/        # Избранное
    │   ├── components/       # React компоненты
    │   ├── lib/              # API клиент, store, утилиты
    │   └── types/            # TypeScript типы
    └── public/
        ├── brands/           # Иконки брендов (webp)
        ├── products/         # Изображения товаров
        └── payment-icons/    # Иконки способов оплаты
```

## 🔧 Конфигурация

### Backend Environment Variables

Файл: `backend/.env`

```env
PORT=3001                                              # Порт API сервера
HOST=0.0.0.0                                           # Хост
MONGODB_URI=mongodb://localhost:27017                  # MongoDB URI (для production)
MONGODB_DB_NAME=techshop                               # Имя БД
FRONTEND_URL=http://localhost:3000                     # URL фронтенда
CRYPTOBOT_TOKEN=your_token_here                        # CryptoBot API токен
```

### Frontend Environment Variables

Файл: `frontend/.env.local` (опционально)

```env
NEXT_PUBLIC_API_URL=                    # Оставьте пустым для использования Next.js proxy
```

## 🎯 Основные функции

- ✅ Каталог цифровых товаров и подписок
- ✅ Фильтры по категориям и состоянию
- ✅ Система избранного
- ✅ Профиль пользователя с бонусной системой
- ✅ Реферальная программа
- ✅ Интеграция с CryptoBot (TON, USDT)
- ✅ Промокоды и скидки
- ✅ Адаптивный дизайн для Telegram Mini App
- ✅ Темная/светлая тема

## 💳 Интеграция CryptoBot

Приложение использует [@CryptoBot](https://t.me/CryptoBot) для приема платежей в криптовалюте:

- **Поддерживаемые валюты**: TON, USDT
- **API документация**: https://help.crypt.bot/crypto-pay-api
- **Получение токена**: https://t.me/CryptoBot → /pay

## 📱 Telegram Mini App Integration

Приложение интегрируется с Telegram через [@telegram-apps/sdk](https://docs.telegram-mini-apps.com/)

## 🚀 Деплой в Production

### Backend Production

1. **Настройте MongoDB** (локально или облачный сервис типа MongoDB Atlas)

2. **Обновите .env для production:**
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/
FRONTEND_URL=https://your-domain.com
```

3. **Соберите и запустите:**
```bash
npm run build
npm start
```

### Frontend Production

1. **Соберите приложение:**
```bash
npm run build
```

2. **Запустите production сервер:**
```bash
npm start
```

## 📦 Доступные скрипты

### Backend

- `npm run dev` - Запуск dev сервера (MongoDB)
- `npm run dev:mock` - Запуск mock сервера (in-memory)
- `npm run build` - Сборка TypeScript
- `npm start` - Запуск production сервера

### Frontend

- `npm run dev` - Запуск dev сервера
- `npm run build` - Сборка production
- `npm start` - Запуск production сервера
- `npm run lint` - Проверка кода

## 🔄 API Endpoints

### Products
- `GET /products` - Получить все товары
- `GET /products/:id` - Получить товар по ID
- `POST /products/favorites` - Получить избранные товары

### Users
- `GET /users/:id` - Получить пользователя
- `POST /users` - Создать пользователя

### Orders
- `GET /orders/user/:userId` - Получить заказы пользователя
- `POST /orders` - Создать заказ

### Promo
- `POST /promo/validate` - Проверить промокод
- `GET /promo/active` - Получить активные промокоды

### Payment
- `POST /payment/create-invoice` - Создать инвойс CryptoBot
- `GET /payment/invoice/:id` - Получить инвойс
- `GET /payment/balance` - Баланс CryptoBot

## 🛠 Технологии

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Axios
- @telegram-apps/sdk

**Backend:**
- Fastify
- TypeScript
- MongoDB + Mongoose (production)
- CryptoBot API
- Axios

## 📝 TODO

- [ ] Заменить SVG иконки оплаты на реальные изображения
- [ ] Добавить обработку вебхуков CryptoBot
- [ ] Реализовать систему доставки цифровых товаров
- [ ] Добавить админ-панель
- [ ] Настроить production БД

## 📄 Лицензия

MIT
