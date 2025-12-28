# Конфигурация переменных окружения для Render

## Backend Service - Environment Variables

Откройте ваш backend сервис на Render → Environment → Add Environment Variable

Добавьте следующие переменные:

```
CRYPTOBOT_TOKEN=<your_cryptobot_token>
CACTUSPAY_TOKEN=<your_cactuspay_token>
FRONTEND_URL=https://fast-pay-ai.vercel.app
PORT=3001
HOST=0.0.0.0
```

### Как получить токены:

**CRYPTOBOT_TOKEN:**
1. Откройте @CryptoBot в Telegram
2. Отправьте /pay
3. Создайте новое приложение
4. Скопируйте API токен (формат: `12345:ABCDEF...`)

**CACTUSPAY_TOKEN:**
1. Зарегистрируйтесь на https://cactuspay.pro
2. Получите API токен в личном кабинете

### КРИТИЧЕСКИ ВАЖНО:

1. **БЕЗ кавычек** - вводите токен как есть, без `"` или `'`
2. **БЕЗ пробелов** - до или после токена не должно быть пробелов
3. **БЕЗ переносов строк** - токен должен быть в одну строку
4. **Копируйте аккуратно** - не захватывайте лишние символы при копировании

**Правильно:**
```
CRYPTOBOT_TOKEN=12345:ABCDEFghijklmnop123456789
```

**Неправильно:**
```
CRYPTOBOT_TOKEN="12345:ABCDEFghijklmnop123456789"    ❌ (есть кавычки)
CRYPTOBOT_TOKEN= 12345:ABCDEFghijklmnop123456789     ❌ (есть пробел)
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
- **НИКОГДА** не коммитьте токены в репозиторий!
