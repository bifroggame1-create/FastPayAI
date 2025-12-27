# Конфигурация переменных окружения для Render

## Backend Service - Environment Variables

Откройте ваш backend сервис на Render → Environment → Add Environment Variable

Добавьте следующие переменные:

```
CRYPTOBOT_TOKEN=73448:AAQ8MQU0NP78iPtunmwzuj4FIuD973q3AaS
FRONTEND_URL=https://fast-pay-ai.vercel.app
PORT=3001
HOST=0.0.0.0
```

## После добавления переменных:

1. Нажмите **Save Changes**
2. Render автоматически перезапустит сервис
3. Подождите 2-3 минуты пока сервис запустится
4. Проверьте статус в разделе **Logs**

## Проверка работоспособности:

После запуска откройте в браузере:
```
https://your-backend-url.onrender.com/payment/test-cryptobot
```

Должен вернуть:
```json
{
  "success": true,
  "configured": true,
  "bot_info": { ... }
}
```

Если видите `"configured": false` - значит токен не применился, перезапустите сервис вручную через **Manual Deploy**.

## Настройка вебхука в CryptoBot:

1. Откройте @CryptoBot в Telegram
2. Перейдите в настройки вашего приложения
3. Установите Webhook URL:
```
https://your-backend-url.onrender.com/payment/webhook
```

## Важно:

- Все переменные должны быть **БЕЗ** кавычек
- URL должны быть **БЕЗ** слеша в конце (кроме случаев когда это явно указано)
- После изменения переменных обязательно дождитесь полного перезапуска сервиса
