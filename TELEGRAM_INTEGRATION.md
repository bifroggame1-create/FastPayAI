# Интеграция с Telegram Bot - Подробная инструкция

## Оглавление
1. [Создание Telegram бота](#1-создание-telegram-бота)
2. [Настройка локального сервера](#2-настройка-локального-сервера)
3. [Создание Python бота](#3-создание-python-бота)
4. [Деплой на сервер (опционально)](#4-деплой-на-сервер)
5. [Тестирование](#5-тестирование)

---

## 1. Создание Telegram бота

### Шаг 1.1: Создайте бота через BotFather

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте команду `/newbot`
3. Введите имя бота (например, "Tech Shop")
4. Введите username бота (например, "techshop_marketplace_bot")
5. **Сохраните токен бота** - он понадобится позже

```
Пример токена: 7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
```

### Шаг 1.2: Настройте Web App URL

1. Отправьте BotFather команду `/mybots`
2. Выберите своего бота
3. Нажмите **"Bot Settings"** → **"Menu Button"** → **"Edit Menu Button URL"**
4. Пока оставьте это - вернемся позже, когда получим публичный URL

---

## 2. Настройка локального сервера

### Вариант А: Использование ngrok (для тестирования)

#### Шаг 2.1: Установите ngrok

```bash
# macOS
brew install ngrok

# Или скачайте с https://ngrok.com/download
```

#### Шаг 2.2: Создайте аккаунт на ngrok.com

1. Зарегистрируйтесь на https://ngrok.com
2. Получите authtoken
3. Настройте ngrok:

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN
```

#### Шаг 2.3: Запустите ngrok для frontend

```bash
ngrok http 3000
```

Вы получите публичный URL, например:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

**Сохраните этот URL** - это будет URL вашего Web App!

#### Шаг 2.4: Обновите настройки бота

1. Вернитесь к BotFather
2. `/mybots` → Ваш бот → **Bot Settings** → **Menu Button** → **Edit Menu Button URL**
3. Введите ваш ngrok URL: `https://abc123.ngrok.io`

---

## 3. Создание Python бота

### Шаг 3.1: Создайте директорию для бота

```bash
cd /Users/onlyonhigh/work/WebAppShop
mkdir telegram-bot
cd telegram-bot
```

### Шаг 3.2: Создайте виртуальное окружение

```bash
python3 -m venv venv
source venv/bin/activate
```

### Шаг 3.3: Установите зависимости

```bash
pip install aiogram python-dotenv
```

### Шаг 3.4: Создайте файл .env

```bash
cat > .env << EOF
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
WEB_APP_URL=https://your-ngrok-url.ngrok.io
EOF
```

Замените:
- `YOUR_BOT_TOKEN_HERE` на токен от BotFather
- `https://your-ngrok-url.ngrok.io` на ваш ngrok URL

### Шаг 3.5: Создайте файл бота (bot.py)

Создайте файл `bot.py` со следующим содержимым:

```python
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, MenuButtonWebApp
from dotenv import load_dotenv
import asyncio
import logging

# Загрузка переменных окружения
load_dotenv()

BOT_TOKEN = os.getenv('BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL')

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(Command('start'))
async def cmd_start(message: types.Message):
    """Обработчик команды /start"""

    # Создаем клавиатуру с кнопкой Web App
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Открыть магазин",
                    web_app=WebAppInfo(url=WEB_APP_URL)
                )
            ]
        ]
    )

    welcome_text = (
        f"👋 Привет, {message.from_user.first_name}!\n\n"
        "Добро пожаловать в наш магазин техники!\n\n"
        "🔹 Телефоны\n"
        "🔹 Наушники\n"
        "🔹 Часы\n"
        "🔹 Планшеты\n"
        "🔹 Ноутбуки\n"
        "🔹 Консоли\n\n"
        "Нажмите на кнопку ниже, чтобы открыть каталог 👇"
    )

    await message.answer(welcome_text, reply_markup=keyboard)


@dp.message(Command('help'))
async def cmd_help(message: types.Message):
    """Обработчик команды /help"""
    help_text = (
        "📱 <b>Как пользоваться магазином:</b>\n\n"
        "1️⃣ Нажмите кнопку «Открыть магазин»\n"
        "2️⃣ Выберите категорию товаров\n"
        "3️⃣ Просмотрите каталог\n"
        "4️⃣ Добавьте понравившиеся товары в избранное ❤️\n"
        "5️⃣ Перейдите к покупке\n\n"
        "<b>Команды бота:</b>\n"
        "/start - Открыть магазин\n"
        "/help - Показать эту справку\n"
        "/shop - Быстрый доступ к магазину\n"
    )

    await message.answer(help_text, parse_mode='HTML')


@dp.message(Command('shop'))
async def cmd_shop(message: types.Message):
    """Обработчик команды /shop - быстрый доступ к магазину"""
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Открыть магазин",
                    web_app=WebAppInfo(url=WEB_APP_URL)
                )
            ]
        ]
    )

    await message.answer("Нажмите на кнопку для открытия магазина:", reply_markup=keyboard)


async def set_menu_button():
    """Устанавливаем кнопку меню как Web App"""
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🛍 Магазин",
                web_app=WebAppInfo(url=WEB_APP_URL)
            )
        )
        logger.info("✅ Кнопка меню успешно установлена")
    except Exception as e:
        logger.error(f"❌ Ошибка при установке кнопки меню: {e}")


async def main():
    """Главная функция запуска бота"""
    logger.info("🚀 Бот запускается...")

    # Устанавливаем кнопку меню
    await set_menu_button()

    # Запускаем polling
    logger.info("✅ Бот успешно запущен!")
    await dp.start_polling(bot)


if __name__ == '__main__':
    asyncio.run(main())
```

### Шаг 3.6: Создайте файл requirements.txt

```bash
cat > requirements.txt << EOF
aiogram==3.13.1
python-dotenv==1.0.1
EOF
```

### Шаг 3.7: Создайте start.sh скрипт

```bash
cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Запуск Tech Shop Telegram Bot..."

# Активация виртуального окружения
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Виртуальное окружение не найдено. Создайте его командой: python3 -m venv venv"
    exit 1
fi

# Проверка .env файла
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте файл .env со следующим содержимым:"
    echo "BOT_TOKEN=your_bot_token"
    echo "WEB_APP_URL=your_webapp_url"
    exit 1
fi

# Запуск бота
python bot.py
EOF

chmod +x start.sh
```

---

## 4. Запуск всей системы

### Шаг 4.1: Откройте 4 терминала

**Терминал 1: Backend API**
```bash
cd /Users/onlyonhigh/work/WebAppShop/backend
npm run dev:mock
```

**Терминал 2: Frontend**
```bash
cd /Users/onlyonhigh/work/WebAppShop/frontend
npm run dev
```

**Терминал 3: ngrok**
```bash
ngrok http 3000
```
Скопируйте URL из вывода ngrok (например, `https://abc123.ngrok.io`)

**Терминал 4: Telegram Bot**
```bash
cd /Users/onlyonhigh/work/WebAppShop/telegram-bot
source venv/bin/activate
python bot.py
```

### Шаг 4.2: Обновите .env файл бота

Откройте `/Users/onlyonhigh/work/WebAppShop/telegram-bot/.env` и вставьте:

```env
BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER
WEB_APP_URL=YOUR_NGROK_URL
```

### Шаг 4.3: Перезапустите бота

```bash
# В терминале 4
# Нажмите Ctrl+C для остановки
# Затем запустите снова:
python bot.py
```

---

## 5. Тестирование

### Шаг 5.1: Откройте бота в Telegram

1. Найдите вашего бота по username (например, @techshop_marketplace_bot)
2. Нажмите "Start" или отправьте `/start`

### Шаг 5.2: Протестируйте функционал

1. Нажмите кнопку "🛍 Открыть магазин"
2. Проверьте, что Web App открывается
3. Попробуйте:
   - Переключать категории
   - Добавлять в избранное
   - Открывать карточки товаров
   - Просматривать профили продавцов

### Шаг 5.3: Проверьте кнопку меню

Нажмите на кнопку меню (справа от поля ввода) - должна появиться кнопка "🛍 Магазин"

---

## 6. Деплой на сервер (Production)

### Вариант А: Vercel (для Frontend)

#### Шаг 6.1: Установите Vercel CLI

```bash
npm i -g vercel
```

#### Шаг 6.2: Деплой Frontend

```bash
cd /Users/onlyonhigh/work/WebAppShop/frontend
vercel
```

Следуйте инструкциям. Вы получите production URL (например, `https://your-app.vercel.app`)

#### Шаг 6.3: Настройте переменные окружения

В Vercel Dashboard:
1. Settings → Environment Variables
2. Добавьте `NEXT_PUBLIC_API_URL` со значением URL вашего backend API

### Вариант Б: Railway (для Backend + Frontend)

1. Зарегистрируйтесь на https://railway.app
2. Создайте новый проект
3. Подключите GitHub репозиторий
4. Railway автоматически определит и задеплоит ваше приложение

### Вариант В: VPS (полный контроль)

#### Backend на VPS:

```bash
# На сервере
cd /var/www
git clone your-repo
cd WebAppShop/backend
npm install
npm run build

# Установите PM2 для запуска в фоне
npm install -g pm2
pm2 start dist/server.js --name techshop-backend
pm2 save
pm2 startup
```

#### Frontend на VPS:

```bash
cd /var/www/WebAppShop/frontend
npm install
npm run build
npm start

# Или с PM2
pm2 start npm --name techshop-frontend -- start
```

#### Настройте Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

#### Установите SSL:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 7. Troubleshooting

### Проблема: Web App не открывается

**Решение:**
1. Проверьте, что ngrok запущен
2. Проверьте URL в .env файле бота
3. Убедитесь, что frontend запущен на порту 3000

### Проблема: Данные не загружаются

**Решение:**
1. Проверьте, что backend запущен на порту 3001
2. Откройте http://localhost:3001/health в браузере
3. Проверьте консоль браузера на ошибки CORS

### Проблема: Бот не отвечает

**Решение:**
1. Проверьте токен бота в .env
2. Проверьте логи бота в терминале
3. Убедитесь, что бот не заблокирован в Telegram

### Проблема: ngrok URL меняется

**Решение:**
- ngrok бесплатная версия дает новый URL каждый раз
- Используйте платную версию ngrok для постоянного URL
- Или задеплойте на сервер с доменом

---

## 8. Полезные команды

### Проверка статуса серверов:

```bash
# Backend
curl http://localhost:3001/health

# Frontend
curl http://localhost:3000

# Получить товары через API
curl http://localhost:3001/products
```

### Остановка серверов:

```bash
# Найти процессы
lsof -i :3000  # Frontend
lsof -i :3001  # Backend

# Убить процесс
kill -9 PID
```

### Логи:

```bash
# PM2 логи
pm2 logs techshop-backend
pm2 logs techshop-frontend

# Очистить логи
pm2 flush
```

---

## 9. Следующие шаги

После успешного запуска вы можете:

1. **Добавить реальную базу данных MongoDB**
   - Замените `dev:mock` на `dev` в backend
   - Настройте MongoDB Atlas или локальный MongoDB

2. **Добавить систему оплаты**
   - Telegram Payments API
   - ЮKassa
   - Stripe

3. **Добавить уведомления**
   - Уведомления о заказах
   - Статусы доставки

4. **Улучшить функционал**
   - Корзина
   - История заказов
   - Чат с продавцом

---

## 10. Поддержка

Если возникли проблемы:
1. Проверьте логи в терминалах
2. Откройте DevTools в браузере (F12)
3. Проверьте Network tab на ошибки API

Удачи! 🚀
