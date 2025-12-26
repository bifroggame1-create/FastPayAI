'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAppStore } from '@/lib/store'
import { Product } from '@/types'
import { productsApi, adminApi } from '@/lib/api'

const ADMIN_IDS = ['1301598469']

type Tab = 'products' | 'sellers' | 'reviews' | 'promo'

interface Seller {
  id: string
  name: string
  avatar: string
  rating: number
}

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  text: string
  date: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Sellers state
  const [sellers, setSellers] = useState<Seller[]>([
    { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0 }
  ])
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null)

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [editingReview, setEditingReview] = useState<Review | null>(null)

  useEffect(() => {
    // Check admin access
    const userId = user?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString()
    if (!userId || !ADMIN_IDS.includes(userId)) {
      router.push('/')
      return
    }
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      const productsData = await productsApi.getAll({})
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProduct = async (product: Product) => {
    try {
      if (isAddingNew) {
        // Add new product via API
        const result = await adminApi.createProduct(product)
        if (result.success) {
          setProducts([result.product, ...products])
        }
      } else {
        // Update existing via API
        const result = await adminApi.updateProduct(product._id, product)
        if (result.success) {
          setProducts(products.map(p => p._id === product._id ? result.product : p))
        }
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Ошибка сохранения товара')
    }
    setEditingProduct(null)
    setIsAddingNew(false)
  }

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Удалить товар?')) {
      try {
        const result = await adminApi.deleteProduct(productId)
        if (result.success) {
          setProducts(products.filter(p => p._id !== productId))
        }
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Ошибка удаления товара')
      }
    }
  }

  const handleSaveSeller = (seller: Seller) => {
    if (sellers.find(s => s.id === seller.id)) {
      setSellers(sellers.map(s => s.id === seller.id ? seller : s))
    } else {
      setSellers([...sellers, seller])
    }
    setEditingSeller(null)
  }

  const handleSaveReview = (review: Review) => {
    if (reviews.find(r => r.id === review.id)) {
      setReviews(reviews.map(r => r.id === review.id ? review : r))
    } else {
      setReviews([...reviews, { ...review, id: String(Date.now()) }])
    }
    setEditingReview(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-20">
      <Header title="Админ-панель" showBack onBack={() => router.push('/')} />

      {/* Tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {[
          { id: 'products', label: 'Товары' },
          { id: 'sellers', label: 'Продавцы' },
          { id: 'reviews', label: 'Отзывы' },
          { id: 'promo', label: 'Промокоды' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-accent-cyan text-white'
                : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setIsAddingNew(true)
                setEditingProduct({
                  _id: '',
                  name: '',
                  price: 0,
                  images: ['/products/placeholder.png'],
                  condition: 'new',
                  category: 'ai-subscriptions',
                  seller: sellers[0],
                  rating: 5.0,
                  description: '',
                  inStock: true,
                  createdAt: new Date().toISOString(),
                  variants: []
                })
              }}
              className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              + Добавить товар
            </button>

            {products.map(product => (
              <div
                key={product._id}
                className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
              >
                <div className="flex gap-3">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-light-text dark:text-dark-text">
                      {product.name}
                    </h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {product.category} • {product.price}₽
                    </p>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {product.variants?.length || 0} вариантов
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setIsAddingNew(false)
                        setEditingProduct(product)
                      }}
                      className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sellers Tab */}
        {activeTab === 'sellers' && (
          <div className="space-y-4">
            <button
              onClick={() => setEditingSeller({ id: '', name: '', avatar: '', rating: 5.0 })}
              className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              + Добавить продавца
            </button>

            {sellers.map(seller => (
              <div
                key={seller.id}
                className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border flex items-center gap-3"
              >
                <img
                  src={seller.avatar}
                  alt={seller.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-light-text dark:text-dark-text">{seller.name}</h3>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    ID: {seller.id} • Рейтинг: {seller.rating}
                  </p>
                </div>
                <button
                  onClick={() => setEditingSeller(seller)}
                  className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                >
                  Изменить
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <button
              onClick={() => setEditingReview({
                id: '',
                productId: products[0]?._id || '',
                userId: '',
                userName: '',
                rating: 5,
                text: '',
                date: new Date().toISOString()
              })}
              className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              + Добавить отзыв
            </button>

            {reviews.length === 0 && (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Отзывов пока нет
              </p>
            )}

            {reviews.map(review => (
              <div
                key={review.id}
                className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-light-text dark:text-dark-text">{review.userName}</h3>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <span key={star} className={star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingReview(review)}
                    className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                  >
                    Изменить
                  </button>
                </div>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{review.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Promo Tab */}
        {activeTab === 'promo' && (
          <div className="space-y-4">
            <button className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold">
              + Добавить промокод
            </button>
            <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
              Управление промокодами в разработке
            </p>
          </div>
        )}
      </div>

      {/* Product Editor Modal */}
      {editingProduct && (
        <ProductEditor
          product={editingProduct}
          sellers={sellers}
          onSave={handleSaveProduct}
          onClose={() => {
            setEditingProduct(null)
            setIsAddingNew(false)
          }}
          isNew={isAddingNew}
        />
      )}

      {/* Seller Editor Modal */}
      {editingSeller && (
        <SellerEditor
          seller={editingSeller}
          onSave={handleSaveSeller}
          onClose={() => setEditingSeller(null)}
        />
      )}

      {/* Review Editor Modal */}
      {editingReview && (
        <ReviewEditor
          review={editingReview}
          products={products}
          onSave={handleSaveReview}
          onClose={() => setEditingReview(null)}
        />
      )}
    </div>
  )
}

// Product Editor Component
function ProductEditor({
  product,
  sellers,
  onSave,
  onClose,
  isNew
}: {
  product: Product
  sellers: Seller[]
  onSave: (product: Product) => void
  onClose: () => void
  isNew: boolean
}) {
  const [form, setForm] = useState(product)
  const [variantsText, setVariantsText] = useState(
    product.variants?.map(v => `${v.name}|${v.price}|${v.period || ''}|${v.features?.join(',')||''}`).join('\n') || ''
  )

  const handleSubmit = () => {
    // Parse variants from text
    const variants = variantsText.split('\n').filter(line => line.trim()).map((line, i) => {
      const [name, price, period, features] = line.split('|')
      return {
        id: `var-${Date.now()}-${i}`,
        name: name?.trim() || '',
        price: parseInt(price) || 0,
        period: period?.trim() || undefined,
        features: features?.split(',').map(f => f.trim()).filter(Boolean) || []
      }
    })

    onSave({
      ...form,
      variants,
      price: variants[0]?.price || form.price
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <div className="sticky top-0 bg-light-card dark:bg-dark-card p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
            {isNew ? 'Новый товар' : 'Редактирование'}
          </h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Название</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Категория</label>
            <select
              value={form.category}
              onChange={e => setForm({...form, category: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            >
              <option value="ai-subscriptions">AI Подписки</option>
              <option value="vpn">VPN</option>
              <option value="streaming">Стриминг</option>
              <option value="gaming">Игры</option>
              <option value="software">Софт</option>
              <option value="education">Образование</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">URL изображения</label>
            <input
              type="text"
              value={form.images[0]}
              onChange={e => setForm({...form, images: [e.target.value]})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
              Варианты (название|цена|период|особенности через запятую)
            </label>
            <textarea
              value={variantsText}
              onChange={e => setVariantsText(e.target.value)}
              rows={5}
              placeholder="Pro (1 месяц)|1990|1 месяц|Функция 1,Функция 2"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text font-mono text-sm"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Seller Editor Component
function SellerEditor({
  seller,
  onSave,
  onClose
}: {
  seller: Seller
  onSave: (seller: Seller) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(seller)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full rounded-t-3xl">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Редактирование продавца</h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">ID</label>
            <input
              type="text"
              value={form.id}
              onChange={e => setForm({...form, id: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Имя</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">URL аватара</label>
            <input
              type="text"
              value={form.avatar}
              onChange={e => setForm({...form, avatar: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Рейтинг</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={e => setForm({...form, rating: parseFloat(e.target.value)})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold">
              Отмена
            </button>
            <button onClick={() => onSave(form)} className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold">
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Review Editor Component
function ReviewEditor({
  review,
  products,
  onSave,
  onClose
}: {
  review: Review
  products: Product[]
  onSave: (review: Review) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(review)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full rounded-t-3xl">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Редактирование отзыва</h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Товар</label>
            <select
              value={form.productId}
              onChange={e => setForm({...form, productId: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            >
              {products.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Имя пользователя</label>
            <input
              type="text"
              value={form.userName}
              onChange={e => setForm({...form, userName: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Рейтинг</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onClick={() => setForm({...form, rating: star})}
                  className={`text-3xl ${star <= form.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Текст отзыва</label>
            <textarea
              value={form.text}
              onChange={e => setForm({...form, text: e.target.value})}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-500 text-white rounded-xl font-semibold">
              Отмена
            </button>
            <button onClick={() => onSave(form)} className="flex-1 py-3 bg-accent-cyan text-white rounded-xl font-semibold">
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
