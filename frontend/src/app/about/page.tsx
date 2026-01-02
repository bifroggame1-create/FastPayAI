'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/lib/store'

const content = {
  ru: {
    title: 'О FastPay',
    tagline: 'Маркетплейс цифровых товаров в Telegram',
    description: 'FastPay — это современная платформа для безопасной покупки и продажи цифровых товаров. Мы объединяем удобство Telegram Mini Apps с надёжной системой защиты сделок.',
    features: [
      { icon: '🛡️', title: 'Безопасность', desc: 'Escrow защита каждой сделки' },
      { icon: '⚡', title: 'Скорость', desc: 'Мгновенная автоматическая доставка' },
      { icon: '💳', title: 'Удобная оплата', desc: 'Крипта и банковские карты' },
      { icon: '👥', title: 'Сообщество', desc: 'Проверенные продавцы и отзывы' }
    ],
    stats: [
      { value: '10K+', label: 'Пользователей' },
      { value: '5K+', label: 'Товаров' },
      { value: '99%', label: 'Успешных сделок' },
      { value: '24/7', label: 'Поддержка' }
    ],
    team: {
      title: 'Наша команда',
      description: 'Мы — команда разработчиков и предпринимателей, создающих удобные цифровые продукты. FastPay — это наш вклад в развитие безопасной торговли в Telegram.'
    },
    contact: {
      title: 'Связаться с нами',
      items: [
        { icon: '💬', label: 'Поддержка', value: '@fastpay_sup' },
        { icon: '📢', label: 'Новости', value: '@FastPayNews' },
        { icon: '👨‍💻', label: 'Разработчик', value: '@cheffofgang' }
      ]
    },
    footer: 'Made with ❤️ by cheffofgang'
  },
  en: {
    title: 'About FastPay',
    tagline: 'Digital goods marketplace in Telegram',
    description: 'FastPay is a modern platform for secure buying and selling of digital goods. We combine the convenience of Telegram Mini Apps with a reliable transaction protection system.',
    features: [
      { icon: '🛡️', title: 'Security', desc: 'Escrow protection for every deal' },
      { icon: '⚡', title: 'Speed', desc: 'Instant automatic delivery' },
      { icon: '💳', title: 'Easy Payment', desc: 'Crypto and bank cards' },
      { icon: '👥', title: 'Community', desc: 'Verified sellers and reviews' }
    ],
    stats: [
      { value: '10K+', label: 'Users' },
      { value: '5K+', label: 'Products' },
      { value: '99%', label: 'Successful deals' },
      { value: '24/7', label: 'Support' }
    ],
    team: {
      title: 'Our Team',
      description: 'We are a team of developers and entrepreneurs creating convenient digital products. FastPay is our contribution to the development of secure trading in Telegram.'
    },
    contact: {
      title: 'Contact Us',
      items: [
        { icon: '💬', label: 'Support', value: '@fastpay_sup' },
        { icon: '📢', label: 'News', value: '@FastPayNews' },
        { icon: '👨‍💻', label: 'Developer', value: '@cheffofgang' }
      ]
    },
    footer: 'Made with ❤️ by cheffofgang'
  }
}

export default function AboutPage() {
  const router = useRouter()
  const { language } = useAppStore()
  const t = content[language]

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header
        title={t.title}
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-accent-cyan to-accent-blue rounded-2xl flex items-center justify-center">
            <span className="text-4xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
            FastPay
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            {t.tagline}
          </p>
        </div>

        {/* Description */}
        <p className="text-light-text dark:text-dark-text text-center mb-8 leading-relaxed">
          {t.description}
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {t.features.map((feature, i) => (
            <div
              key={i}
              className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border text-center"
            >
              <span className="text-3xl mb-2 block">{feature.icon}</span>
              <h3 className="font-bold text-light-text dark:text-dark-text text-sm mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-accent-cyan to-accent-blue rounded-xl p-5 mb-8">
          <div className="grid grid-cols-4 gap-2">
            {t.stats.map((stat, i) => (
              <div key={i} className="text-center text-white">
                <div className="text-xl font-bold">{stat.value}</div>
                <div className="text-xs opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-5 border border-light-border dark:border-dark-border mb-6">
          <h2 className="font-bold text-light-text dark:text-dark-text mb-2">
            {t.team.title}
          </h2>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {t.team.description}
          </p>
        </div>

        {/* Contact */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-5 border border-light-border dark:border-dark-border mb-6">
          <h2 className="font-bold text-light-text dark:text-dark-text mb-4">
            {t.contact.title}
          </h2>
          <div className="space-y-3">
            {t.contact.items.map((item, i) => (
              <a
                key={i}
                href={`https://t.me/${item.value.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-light-bg dark:bg-dark-bg rounded-lg hover:bg-accent-cyan/10 transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {item.label}
                  </span>
                </div>
                <span className="text-accent-cyan font-medium text-sm">
                  {item.value}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          {t.footer}
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
