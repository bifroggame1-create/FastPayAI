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
