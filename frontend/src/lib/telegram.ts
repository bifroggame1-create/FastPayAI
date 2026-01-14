// TelegramWebApp types are defined in @/types/index.ts

export const useTelegramWebApp = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.Telegram?.WebApp || null
}

// SECURITY: Removed hardcoded admin ID - admin status must be verified by backend via JWT

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

  // SECURITY: No localStorage fallback - authentication must go through backend
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

  // Theme is now synced via store in AuthProvider
}

// Get Telegram color scheme or fallback to system preference
export const getTelegramColorScheme = (): 'dark' | 'light' => {
  const webApp = useTelegramWebApp()
  
  // First try Telegram theme
  if (webApp && webApp.colorScheme) {
    return webApp.colorScheme === 'dark' ? 'dark' : 'light'
  }
  
  // Fallback to system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  // Default to dark
  return 'dark'
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

