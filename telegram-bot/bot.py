import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, MenuButtonWebApp, CallbackQuery
from dotenv import load_dotenv
import asyncio
import logging

# Загрузка переменных окружения
load_dotenv()

BOT_TOKEN = os.getenv('BOT_TOKEN', '8374538997:AAHe-J7hR0NJYtyafNNCA5Khz9YkdjQHvV4')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://fast-pay-ai.vercel.app/')

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота и диспетчера
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(Command('start'))
async def cmd_start(message: types.Message):
    """Обработчик команды /start"""

    # Создаем клавиатуру с кнопками Web App и Информация
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Открыть магазин",
                    web_app=WebAppInfo(url=WEB_APP_URL)
                ),
                InlineKeyboardButton(
                    text="ℹ️ Информация",
                    callback_data="info"
                )
            ]
        ]
    )

    welcome_text = (
        f"👋 Привет, {message.from_user.first_name}!\n\n"
        "🚀 Добро пожаловать в FastPay - магазин цифровых товаров!\n\n"
        "🤖 AI Подписки (Claude, ChatGPT, Gemini, Midjourney)\n"
        "🔐 VPN Сервисы (NordVPN)\n"
        "🎵 Стриминг (Spotify Premium)\n"
        "🎮 Игры и валюта (Roblox, игровые ключи)\n"
        "💻 Программное обеспечение (Adobe)\n"
        "📚 Образование (Coursera)\n\n"
        "✨ Мгновенная доставка • Гарантия • Лучшие цены\n\n"
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


@dp.callback_query(F.data == "info")
async def callback_info(callback: CallbackQuery):
    """Обработчик кнопки Информация"""
    info_text = (
        "💡 <b>Помощь и контакты</b>\n\n"
        "Если есть вопросы — пишите @cheffofgang\n\n"
        "🔒 <b>Политика конфиденциальности:</b> "
        "<a href='https://telegra.ph/Politika-konfidencialnosti-08-15-17'>читать</a>\n\n"
        "📜 <b>Пользовательское соглашение:</b> "
        "<a href='https://telegra.ph/Polzovatelskoe-soglashenie-08-15-10'>читать</a>"
    )

    # Кнопка "Назад"
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="◀️ Назад",
                    callback_data="back_to_start"
                )
            ]
        ]
    )

    await callback.message.edit_text(info_text, reply_markup=keyboard, parse_mode='HTML')
    await callback.answer()


@dp.callback_query(F.data == "back_to_start")
async def callback_back_to_start(callback: CallbackQuery):
    """Обработчик кнопки Назад - возврат к стартовому сообщению"""
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Открыть магазин",
                    web_app=WebAppInfo(url=WEB_APP_URL)
                ),
                InlineKeyboardButton(
                    text="ℹ️ Информация",
                    callback_data="info"
                )
            ]
        ]
    )

    welcome_text = (
        f"👋 Привет, {callback.from_user.first_name}!\n\n"
        "🚀 Добро пожаловать в FastPay - магазин цифровых товаров!\n\n"
        "🤖 AI Подписки (Claude, ChatGPT, Gemini, Midjourney)\n"
        "🔐 VPN Сервисы (NordVPN)\n"
        "🎵 Стриминг (Spotify Premium)\n"
        "🎮 Игры и валюта (Roblox, игровые ключи)\n"
        "💻 Программное обеспечение (Adobe)\n"
        "📚 Образование (Coursera)\n\n"
        "✨ Мгновенная доставка • Гарантия • Лучшие цены\n\n"
        "Нажмите на кнопку ниже, чтобы открыть каталог 👇"
    )

    await callback.message.edit_text(welcome_text, reply_markup=keyboard)
    await callback.answer()


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
