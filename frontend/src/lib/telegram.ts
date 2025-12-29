declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          setText: (text: string) => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          selectionChanged: () => void
        }
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
            photo_url?: string
          }
          query_id?: string
          auth_date?: number
          hash?: string
          start_param?: string
        }
        colorScheme: 'light' | 'dark'
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
        }
      }
    }
  }
}

export const useTelegramWebApp = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.Telegram?.WebApp || null
}

// Bootstrap admin ID for fallback
const BOOTSTRAP_ADMIN_ID = '1301598469'

export const getTelegramUser = () => {
  const webApp = useTelegramWebApp()

  if (webApp) {
    const user = webApp.initDataUnsafe.user
    if (user) {
      return {
        id: user.id.toString(),
        name: `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
        username: user.username,
        avatar: user.photo_url,
        languageCode: user.language_code,
      }
    }
  }

  // Fallback for bootstrap admin when Telegram WebApp data is not available
  // This allows admin access during development or when WebApp is not properly initialized
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('fastpay_user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        if (parsed.id === BOOTSTRAP_ADMIN_ID) {
          console.log('📱 Using stored bootstrap admin user')
          return {
            id: parsed.id,
            name: parsed.name || 'Admin',
            username: parsed.username,
            avatar: parsed.avatar,
            languageCode: 'ru',
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  return null
}

export const getTelegramStartParam = () => {
  const webApp = useTelegramWebApp()
  if (!webApp) return null

  return webApp.initDataUnsafe.start_param || null
}

export const initTelegramWebApp = () => {
  const webApp = useTelegramWebApp()
  if (!webApp) return

  webApp.ready()
  webApp.expand()

  // Set theme colors
  if (webApp.colorScheme === 'dark') {
    document.documentElement.classList.add('dark')
  }
}

// Haptic feedback functions
export const hapticImpact = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
  try {
    const webApp = useTelegramWebApp()
    webApp?.HapticFeedback?.impactOccurred(style)
  } catch (e) {
    // Silently fail if haptic feedback is not available
  }
}

export const hapticNotification = (type: 'error' | 'success' | 'warning') => {
  try {
    const webApp = useTelegramWebApp()
    webApp?.HapticFeedback?.notificationOccurred(type)
  } catch (e) {
    // Silently fail if haptic feedback is not available
  }
}

// Get raw initData for backend validation
export const getTelegramInitData = (): string | null => {
  const webApp = useTelegramWebApp()
  if (!webApp) return null
  return webApp.initData || null
}

