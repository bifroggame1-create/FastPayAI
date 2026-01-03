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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark">
      <head>
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
