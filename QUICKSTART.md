# Быстрый старт

## Запуск проекта за 5 минут

### 1. Установка зависимостей

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Настройка MongoDB

Запустите MongoDB локально или используйте Docker:

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. Настройка переменных окружения

Backend (.env):
```bash
cd backend
cp .env.example .env
```

Frontend (.env.local):
```bash
cd frontend
cp .env.local.example .env.local
```

### 4. Заполнение базы данных

```bash
cd backend
npm run seed
```

### 5. Запуск приложения

В одном терминале (Backend):
```bash
cd backend
npm run dev
```

В другом терминале (Frontend):
```bash
cd frontend
npm run dev
```

### 6. Открыть приложение

Откройте браузер и перейдите на `http://localhost:3000`

## Проверка работы

- Backend API: `http://localhost:3001/health`
- Frontend: `http://localhost:3000`

## Что дальше?

- Изучите [README.md](./README.md) для подробной документации
- Настройте интеграцию с Telegram Bot
- Добавьте свои товары через API или админ-панель

## Проблемы?

Если что-то не работает:

1. Проверьте, что MongoDB запущен
2. Проверьте, что порты 3000 и 3001 свободны
3. Проверьте логи в терминале
4. Убедитесь, что все зависимости установлены
