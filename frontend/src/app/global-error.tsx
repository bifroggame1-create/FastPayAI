'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-4">
              Что-то пошло не так
            </h2>
            <p className="text-gray-400 mb-6">
              Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
