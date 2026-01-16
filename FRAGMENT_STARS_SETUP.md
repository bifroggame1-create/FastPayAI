# Fragment Stars Integration - Setup Guide

## Overview

FastPayAI теперь поддерживает автоматизированную перепродажу Telegram Stars через Fragment API. Система работает по гибридной схеме:

1. **Пользователь платит** через Telegram Bot Payments (Stars)
2. **Система автоматически покупает** Stars на Fragment по оптовой цене
3. **Stars мгновенно доставляются** пользователю с наценкой

**Преимущества:**
- Автоматизация без ручной обработки
- Наценка 20% на каждой продаже
- Мгновенная доставка Stars
- Автоматический возврат при ошибках

---

## Архитектура системы

```
Пользователь → Баннер "Купить Stars" → Страница /stars
                                              ↓
                                    Выбор пакета (50-2500 Stars)
                                              ↓
                            Telegram Bot Invoice (оплата Stars)
                                              ↓
                                    Webhook /api/stars/webhook
                                              ↓
                                    Fragment API → Покупка Stars
                                              ↓
                                    Отправка Stars пользователю
                                              ↓
                                    Подтверждение в чате
```

---

## Файловая структура

### Frontend
- `frontend/src/components/BannerCarousel.tsx` - Свайпер с баннером Stars
- `frontend/src/app/stars/page.tsx` - Страница покупки Stars
- `frontend/src/app/page.tsx` - Интеграция баннера на главной

### Backend
- `backend/src/fragment.ts` - Fragment API утилита
- `backend/src/routes/payments.ts` - API endpoints для Stars
- `backend/src/telegram-stars.ts` - Telegram Bot Payments API

---

## Настройка Fragment API

### Шаг 1: Получение данных Fragment

Вам нужны 3 параметра для работы с Fragment API:

1. **FRAGMENT_HASH** - Hash вашего Fragment аккаунта
2. **FRAGMENT_COOKIES** - Cookies браузера с fragment.com
3. **FRAGMENT_SEED** - Seed phrase вашего TON кошелька (W5)

#### Как получить Hash и Cookies:

1. Откройте [fragment.com](https://fragment.com) в браузере
2. Авторизуйтесь через Telegram
3. Откройте DevTools (F12) → Application/Storage → Cookies
4. Скопируйте все cookies для fragment.com
5. Hash можно найти в Network requests или локальном хранилище

#### Как получить Seed Phrase:

1. Используйте TON Wallet (W5)
2. Экспортируйте seed phrase (24 слова)
3. **ВАЖНО:** Храните seed фразу в безопасности!

### Шаг 2: Конфигурация .env

Добавьте переменные в `backend/.env`:

```env
# Fragment API Configuration
FRAGMENT_HASH=your_fragment_hash_here
FRAGMENT_COOKIES=your_fragment_cookies_here
FRAGMENT_SEED=word1 word2 word3 ... word24

# Telegram Bot Token (from @BotFather)
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Шаг 3: Настройка Webhook

Telegram Bot должен отправлять webhooks на ваш backend:

```bash
# Установите webhook для Telegram Bot
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://your-backend.com/api/stars/webhook"
```

**Альтернатива:** В коде можно использовать polling вместо webhooks (для dev)

---

## API Endpoints

### POST `/api/stars/create-invoice`

Создает invoice для покупки Stars.

**Request:**
```json
{
  "username": "durov",
  "stars": 100,
  "price": 180,
  "userId": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "invoiceUrl": "https://t.me/$...",
  "stars": 100,
  "price": 180
}
```

### POST `/api/stars/webhook`

Обрабатывает webhooks от Telegram Bot после оплаты.

**Автоматические действия:**
1. Получает payment notification
2. Покупает Stars на Fragment
3. Отправляет Stars пользователю
4. Отправляет подтверждение в чат
5. При ошибке - возвращает оплату

### GET `/api/stars/packages`

Возвращает доступные пакеты Stars с ценами.

**Response:**
```json
{
  "success": true,
  "packages": [
    { "id": "50", "amount": 50, "price": 90 },
    { "id": "100", "amount": 100, "price": 180 },
    { "id": "500", "amount": 500, "price": 900 },
    { "id": "1000", "amount": 1000, "price": 1800 },
    { "id": "2500", "amount": 2500, "price": 4500 }
  ],
  "configured": true
}
```

### GET `/payment/fragment/status`

Проверяет статус Fragment API конфигурации.

**Response:**
```json
{
  "success": true,
  "configured": true,
  "hasHash": true,
  "hasCookies": true,
  "hasSeed": true
}
```

---

## Ценообразование

### Текущая стратегия

Fragment цена на Stars (~1.5 ₽ за звезду) + наценка 20%:

```typescript
// Пример расчета цены
const fragmentCost = stars * 1.5  // Базовая стоимость на Fragment
const markup = fragmentCost * 0.20 // Наценка 20%
const sellPrice = fragmentCost + markup // Итоговая цена продажи
```

### Пакеты Stars

| Количество | Fragment цена | Наша цена | Маржа |
|-----------|---------------|-----------|-------|
| 50        | 75 ₽          | 90 ₽      | 15 ₽  |
| 100       | 150 ₽         | 180 ₽     | 30 ₽  |
| 500       | 750 ₽         | 900 ₽     | 150 ₽ |
| 1000      | 1500 ₽        | 1800 ₽    | 300 ₽ |
| 2500      | 3750 ₽        | 4500 ₽    | 750 ₽ |

**Изменение наценки:**

Откройте `backend/src/fragment.ts` и измените параметр `markupPercent`:

```typescript
// Изменить с 20% на 25%
FragmentAPI.calculateResellPrice(starsAmount, 25)
```

---

## Автообновление Cookies

Fragment cookies периодически истекают (обычно раз в несколько дней/недель).

### Вариант 1: Ручное обновление

1. Повторите шаги из "Как получить Cookies"
2. Обновите `FRAGMENT_COOKIES` в `.env`
3. Перезапустите backend

### Вариант 2: Автоматизация (TODO)

Можно реализовать через Puppeteer/Playwright:

```typescript
// backend/src/fragment.ts - функция refreshFragmentCookies()
// 1. Автоматически логинится на fragment.com
// 2. Извлекает новые cookies
// 3. Обновляет переменную окружения
```

### Мониторинг

Логируйте ошибки 401 (Unauthorized) от Fragment API - это сигнал об истечении cookies:

```typescript
if (error.response?.status === 401) {
  console.error('⚠️  Fragment cookies expired! Update .env')
  // Отправить уведомление админу
}
```

---

## Безопасность

### Критические данные

- **FRAGMENT_SEED** - Никогда не коммитьте в Git!
- **FRAGMENT_COOKIES** - Периодически истекают, храните в безопасности
- **BOT_TOKEN** - Telegram Bot токен

### Рекомендации

1. Используйте переменные окружения (`.env` в `.gitignore`)
2. Для production используйте секреты (Render Secrets, Vercel Env)
3. Регулярно ротируйте cookies
4. Мониторьте логи на предмет подозрительной активности

---

## Тестирование

### 1. Проверка Fragment API

```bash
curl http://localhost:3001/payment/fragment/status
```

Должно вернуть:
```json
{
  "success": true,
  "configured": true,
  "hasHash": true,
  "hasCookies": true,
  "hasSeed": true
}
```

### 2. Тестовая покупка Stars

1. Откройте `/stars` на фронтенде
2. Введите свой Telegram username
3. Выберите минимальный пакет (50 Stars)
4. Проверьте создание invoice
5. **НЕ оплачивайте** в тесте - проверьте только UI

### 3. Production тест

1. Используйте реальный username
2. Купите минимальный пакет (50 Stars)
3. Проверьте доставку Stars в Telegram
4. Проверьте логи backend на ошибки

---

## Troubleshooting

### Ошибка: "Fragment API not configured"

**Причина:** Не установлены переменные окружения

**Решение:**
```bash
# Проверьте .env файл
cat backend/.env | grep FRAGMENT

# Должны быть установлены все 3:
FRAGMENT_HASH=...
FRAGMENT_COOKIES=...
FRAGMENT_SEED=...
```

### Ошибка: "Fragment API authentication failed - cookies may be expired"

**Причина:** Cookies истекли

**Решение:**
1. Получите новые cookies с fragment.com
2. Обновите `FRAGMENT_COOKIES` в `.env`
3. Перезапустите backend

### Ошибка: "Telegram Bot is not configured"

**Причина:** Не установлен `BOT_TOKEN`

**Решение:**
```bash
# Получите токен от @BotFather
# Добавьте в .env:
BOT_TOKEN=1234567890:ABC...
```

### Stars не доставляются

**Причина:** Webhook не настроен или не работает

**Решение:**
```bash
# Проверьте webhook
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"

# Если нет webhook, установите:
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://your-backend.com/api/stars/webhook"
```

---

## Мониторинг и Логи

### Важные логи

```bash
# Backend логи
✅ Fragment API initialized
✅ Successfully sent 100 stars to @username
❌ Failed to send stars: ...
⚠️  Fragment cookies expired!
```

### Метрики для отслеживания

1. Количество успешных продаж Stars
2. Средняя маржа на продаже
3. Частота ошибок Fragment API
4. Время доставки Stars (должно быть < 5 сек)

---

## Production Deployment

### 1. Environment Variables

Убедитесь что все переменные установлены в production:

**Render.com:**
- Dashboard → Environment → Environment Variables
- Добавьте `FRAGMENT_HASH`, `FRAGMENT_COOKIES`, `FRAGMENT_SEED`

**Vercel (Frontend):**
Не требуется - все вызовы идут через backend

### 2. Webhook URL

Обновите webhook для production:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://fastpayai.onrender.com/api/stars/webhook"
```

### 3. Тестирование

Проведите тестовую покупку на production перед запуском.

---

## Roadmap

- [ ] Автоматическое обновление Fragment cookies
- [ ] Dashboard для мониторинга продаж Stars
- [ ] Telegram Premium поддержка
- [ ] Скидки для оптовых покупок
- [ ] Реферальная программа для Stars

---

## Поддержка

При возникновении проблем:
1. Проверьте логи backend
2. Проверьте статус Fragment API: `/payment/fragment/status`
3. Проверьте webhook: `/api/telegram/bot<BOT_TOKEN>/getWebhookInfo`

**Контакты для поддержки:** [Ваш Telegram]
