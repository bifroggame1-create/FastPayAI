'use client'

interface HeaderProps {
  title?: string
  logo?: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
}

export default function Header({ title, logo, showBack, onBack, rightAction }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-light-card dark:bg-dark-bg border-b border-light-border dark:border-dark-border px-4 py-3">
      <div className="flex items-center justify-between relative">
        {/* Left side - Back button or empty space */}
        <div className="w-20">
          {showBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Center - Logo or Title */}
        <div className="flex-1 flex items-center justify-center">
          {logo && (
            <img
              src={logo}
              alt="FastPay"
              className="h-12 w-auto object-contain [mix-blend-mode:multiply] dark:[mix-blend-mode:screen]"
            />
          )}
          {title && !logo && (
            <h1 className="text-xl font-semibold text-light-text dark:text-dark-text">{title}</h1>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="w-20 flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  )
}
