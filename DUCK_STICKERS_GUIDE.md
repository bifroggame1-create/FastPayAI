# Duck Stickers Integration Guide 🦆

## Overview

FastPayAI теперь использует анимированных уток из стикерпака "Utya Pack2" для улучшения пользовательского опыта на страницах покупки Telegram Stars.

## Где используются утки

### 1. Главная страница - BannerCarousel
- **Файл:** `frontend/src/components/BannerCarousel.tsx`
- **Стикер:** `duck-1.json` (из `Utya Pack2/1.tgs`)
- **Размер:** 64x64px
- **Расположение:** В баннере "Купить Telegram Stars" слева от текста

### 2. Страница /stars - Hero Section
- **Файл:** `frontend/src/app/stars/page.tsx`
- **Стикер:** `duck-10.json` (из `Utya Pack2/10.tgs`)
- **Размер:** 96x96px
- **Расположение:** В верхнем градиентном блоке слева

### 3. Страница /stars - Features
- **Файл:** `frontend/src/app/stars/page.tsx`
- **Стикер:** `duck-5.json` (из `Utya Pack2/5.tgs`)
- **Размер:** 48x48px
- **Расположение:** В третьем блоке Features (Гарантия)

## Технические детали

### Формат файлов

Telegram стикеры (.tgs) — это Lottie анимации в формате gzip. Процесс конвертации:

```bash
# Конвертация .tgs в .json
cd "Utya Pack2"
gunzip -c 1.tgs > duck-1.json
```

### Библиотека для воспроизведения

Используется **lottie-react** для рендера анимаций:

```bash
npm install lottie-react
```

### Пример использования

```tsx
import dynamic from 'next/dynamic'
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })
import duckAnimation from '../public/duck-stickers/duck-1.json'

// В компоненте
<div className="w-16 h-16">
  <Lottie
    animationData={duckAnimation}
    loop={true}
    style={{ width: '100%', height: '100%' }}
  />
</div>
```

## Доступные стикеры

Всего конвертировано **10 стикеров**:
- `duck-1.json` - Основная утка (баннер)
- `duck-5.json` - Утка успеха (features)
- `duck-10.json` - Утка с подарком (hero)
- `duck-20.json` - Резерв
- `duck-30.json` - Резерв
- `duck-42.json` - Резерв
- `duck-50.json` - Резерв
- `duck-69.json` - Резерв
- `duck-88.json` - Резерв
- `duck-99.json` - Резерв

## Добавление новых стикеров

### Шаг 1: Выбор стикера

Откройте папку `Utya Pack2` и найдите нужный номер стикера (0-119).

### Шаг 2: Конвертация

```bash
cd "/Users/onlyonhigh/work/webappaishop/Utya Pack2"
gunzip -c <NUMBER>.tgs > /Users/onlyonhigh/work/webappaishop/frontend/public/duck-stickers/duck-<NUMBER>.json
```

### Шаг 3: Импорт в компонент

```tsx
import duckNewAnimation from '../../public/duck-stickers/duck-<NUMBER>.json'
```

### Шаг 4: Использование

```tsx
<Lottie
  animationData={duckNewAnimation}
  loop={true}
  style={{ width: '100%', height: '100%' }}
/>
```

## Оптимизация

### Размер файлов

Lottie JSON файлы могут быть большими (до 200KB). Для оптимизации:

1. **Используйте динамический импорт:** Уже реализовано через `next/dynamic`
2. **Lazy loading:** Анимации загружаются только при необходимости
3. **Compression:** Next.js автоматически сжимает статические файлы

### Performance

- Все Lottie компоненты имеют `ssr: false` для предотвращения проблем с SSR
- Анимации оптимизированы для mobile устройств
- Используется `loop: true` для постоянного воспроизведения

## Возможные улучшения

1. **Адаптивная подгрузка:** Показывать статичные изображения на медленных соединениях
2. **Контроль воспроизведения:** Добавить play/pause при взаимодействии
3. **Редактирование анимаций:** Изменить цвет/скорость через Lottie API
4. **Больше контекстных уток:**
   - Утка с деньгами для оплаты
   - Грустная утка для ошибок
   - Танцующая утка для успеха

## Troubleshooting

### Проблема: Анимация не показывается

**Решение:**
1. Проверьте, что файл существует в `public/duck-stickers/`
2. Убедитесь что импорт правильный
3. Проверьте console на ошибки

### Проблема: Анимация тормозит на мобильных

**Решение:**
1. Уменьшите размер контейнера
2. Используйте `rendererSettings` для оптимизации:

```tsx
<Lottie
  animationData={duckAnimation}
  loop={true}
  rendererSettings={{
    preserveAspectRatio: 'xMidYMid slice',
    progressiveLoad: true
  }}
/>
```

### Проблема: SSR ошибки

**Решение:**
Всегда используйте динамический импорт:

```tsx
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })
```

## Ресурсы

- **Lottie React:** https://www.npmjs.com/package/lottie-react
- **Lottie Files:** https://lottiefiles.com/
- **Telegram Stickers Format:** https://core.telegram.org/animated_stickers

---

**Создано:** 16 января 2026
**Автор:** FastPayAI Team 🦆
