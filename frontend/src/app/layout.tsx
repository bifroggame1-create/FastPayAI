import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import '@telegram-apps/telegram-ui/dist/styles.css'
import AuthProvider from '@/components/AuthProvider'
import ThemeProvider from '@/components/ThemeProvider'
import Toast from '@/components/Toast'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Digital Shop',
  description: 'Магазин цифровых товаров в Telegram',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#17212b',
}

// Script to set theme before React hydrates (prevents flash)
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('fastpay-storage');
    if (stored) {
      var parsed = JSON.parse(stored);
      var theme = parsed.state && parsed.state.theme;
      if (theme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
    }
  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-tg-bg text-tg-text antialiased">
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toast />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
