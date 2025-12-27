'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAppStore } from '@/lib/store'
import { Product, ProductVariant } from '@/types'
import { productsApi, adminApi } from '@/lib/api'

const ADMIN_IDS = ['1301598469']

type Tab = 'products' | 'sellers' | 'reviews' | 'promo' | 'files'

interface Seller {
  id: string
  name: string
  avatar: string
  rating: number
  isVerified?: boolean
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

interface PromoCode {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount: number
  maxUses: number
  usedCount: number
  isActive: boolean
  description: string
  expiresAt?: string
}

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: string
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
    { id: '1301598469', name: 'FastPay', avatar: '/fastpay-avatar.png', rating: 5.0, isVerified: true }
  ])
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null)

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [editingReview, setEditingReview] = useState<Review | null>(null)

  // Promo state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)

  // Files state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  useEffect(() => {
    // Check admin access
    const userId = user?.id || (typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() : null)
    if (!userId || !ADMIN_IDS.includes(userId)) {
      router.push('/')
      return
    }
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      const [productsData, promoData] = await Promise.all([
        productsApi.getAll({}),
        adminApi.getPromoCodes().catch(() => [])
      ])
      setProducts(productsData)
      setPromoCodes(promoData || [])

      // Load files from localStorage
      const savedFiles = localStorage.getItem('admin-files')
      if (savedFiles) {
        setUploadedFiles(JSON.parse(savedFiles))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProduct = async (product: Product) => {
    try {
      if (isAddingNew) {
        const result = await adminApi.createProduct(product)
        if (result.success) {
          setProducts([result.product, ...products])
          alert('Товар успешно создан!')
        }
      } else {
        const result = await adminApi.updateProduct(product._id, product)
        if (result.success) {
          setProducts(products.map(p => p._id === product._id ? result.product : p))
          alert('Товар успешно обновлён!')
        }
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Ошибка сохранения товара: ' + (error as any).message)
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
          alert('Товар удалён')
        }
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Ошибка удаления товара')
      }
    }
  }

  const handleSaveSeller = async (seller: Seller) => {
    try {
      const existingSeller = sellers.find(s => s.id === seller.id)
      if (existingSeller) {
        await adminApi.updateSeller(seller.id, seller)
        setSellers(sellers.map(s => s.id === seller.id ? seller : s))
      } else {
        await adminApi.createSeller(seller)
        setSellers([...sellers, { ...seller, id: seller.id || String(Date.now()) }])
      }
      setEditingSeller(null)
      alert('Продавец сохранён')
      // Reload products to get updated seller info
      const productsData = await productsApi.getAll({})
      setProducts(productsData)
    } catch (error) {
      console.error('Error saving seller:', error)
      alert('Ошибка сохранения продавца')
    }
  }

  const handleSaveReview = (review: Review) => {
    if (reviews.find(r => r.id === review.id)) {
      setReviews(reviews.map(r => r.id === review.id ? review : r))
    } else {
      setReviews([...reviews, { ...review, id: String(Date.now()) }])
    }
    setEditingReview(null)
    alert('Отзыв сохранён')
  }

  const handleSavePromo = async (promo: PromoCode) => {
    try {
      const existingPromo = promoCodes.find(p => p.code === promo.code)
      if (existingPromo) {
        await adminApi.updatePromoCode(promo.code, promo)
        setPromoCodes(promoCodes.map(p => p.code === promo.code ? promo : p))
      } else {
        await adminApi.createPromoCode(promo)
        setPromoCodes([...promoCodes, promo])
      }
      setEditingPromo(null)
      alert('Промокод сохранён')
    } catch (error) {
      console.error('Error saving promo:', error)
      alert('Ошибка сохранения промокода')
    }
  }

  const handleDeletePromo = async (code: string) => {
    if (confirm('Удалить промокод?')) {
      try {
        await adminApi.deletePromoCode(code)
        setPromoCodes(promoCodes.filter(p => p.code !== code))
        alert('Промокод удалён')
      } catch (error) {
        console.error('Error deleting promo:', error)
        alert('Ошибка удаления промокода')
      }
    }
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const newFile: UploadedFile = {
          id: String(Date.now()) + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string,
          uploadedAt: new Date().toISOString()
        }
        setUploadedFiles(prev => {
          const updated = [newFile, ...prev]
          localStorage.setItem('admin-files', JSON.stringify(updated))
          return updated
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDeleteFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId)
      localStorage.setItem('admin-files', JSON.stringify(updated))
      return updated
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Скопировано!')
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
      <Header title="Админ-панель" showBack onBack={() => router.push('/')} showNavButtons={false} />

      {/* Tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'products', label: 'Товары', count: products.length },
          { id: 'sellers', label: 'Продавцы', count: sellers.length },
          { id: 'reviews', label: 'Отзывы', count: reviews.length },
          { id: 'promo', label: 'Промокоды', count: promoCodes.length },
          { id: 'files', label: 'Файлы', count: uploadedFiles.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-accent-cyan text-white'
                : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-light-bg dark:bg-dark-bg'
            }`}>
              {tab.count}
            </span>
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-light-text dark:text-dark-text truncate">
                      {product.name}
                    </h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {product.category} • {product.price.toLocaleString()}₽
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
              onClick={() => setEditingSeller({ id: '', name: '', avatar: '/fastpay-avatar.png', rating: 5.0 })}
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
                  src={seller.avatar || '/default-avatar.png'}
                  alt={seller.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <h3 className="font-semibold text-light-text dark:text-dark-text">{seller.name}</h3>
                    {seller.isVerified && (
                      <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
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

            {reviews.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Отзывов пока нет
              </p>
            ) : (
              reviews.map(review => (
                <div
                  key={review.id}
                  className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-light-text dark:text-dark-text">{review.userName}</h3>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={`text-lg ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingReview(review)}
                        className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => setReviews(reviews.filter(r => r.id !== review.id))}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{review.text}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Promo Tab */}
        {activeTab === 'promo' && (
          <div className="space-y-4">
            <button
              onClick={() => setEditingPromo({
                code: '',
                discountType: 'percentage',
                discountValue: 10,
                minOrderAmount: 0,
                maxUses: 100,
                usedCount: 0,
                isActive: true,
                description: ''
              })}
              className="w-full py-3 bg-accent-cyan text-white rounded-xl font-semibold"
            >
              + Добавить промокод
            </button>

            {promoCodes.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Промокодов пока нет
              </p>
            ) : (
              promoCodes.map(promo => (
                <div
                  key={promo.code}
                  className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-mono font-bold text-lg text-accent-cyan">{promo.code}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${promo.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {promo.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                      <p className="text-sm text-light-text dark:text-dark-text mb-1">
                        {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `${promo.discountValue}₽`} скидка
                      </p>
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        Использовано: {promo.usedCount}/{promo.maxUses} • Мин. сумма: {promo.minOrderAmount}₽
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPromo(promo)}
                        className="px-3 py-1 bg-accent-blue text-white rounded-lg text-sm"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeletePromo(promo.code)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <FileUploader onUpload={handleFileUpload} />

            {uploadedFiles.length === 0 ? (
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                Файлов пока нет. Загрузите изображения или текстовые файлы.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {uploadedFiles.map(file => (
                  <div
                    key={file.id}
                    className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border overflow-hidden"
                  >
                    {file.type.startsWith('image/') ? (
                      <img src={file.url} alt={file.name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-light-bg dark:bg-dark-bg">
                        <svg className="w-12 h-12 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium text-light-text dark:text-dark-text truncate">{file.name}</p>
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => copyToClipboard(file.url)}
                          className="flex-1 py-1 bg-accent-cyan text-white text-xs rounded"
                        >
                          Копировать
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Editor Modal */}
      {editingProduct && (
        <ProductEditor
          product={editingProduct}
          sellers={sellers}
          uploadedFiles={uploadedFiles}
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
          uploadedFiles={uploadedFiles}
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

      {/* Promo Editor Modal */}
      {editingPromo && (
        <PromoEditor
          promo={editingPromo}
          onSave={handleSavePromo}
          onClose={() => setEditingPromo(null)}
        />
      )}
    </div>
  )
}

// File Uploader Component
function FileUploader({ onUpload }: { onUpload: (files: FileList | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className="w-full py-8 border-2 border-dashed border-light-border dark:border-dark-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent-cyan transition-colors"
    >
      <svg className="w-10 h-10 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
        Нажмите для загрузки файлов
      </p>
      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
        Изображения, TXT, PDF
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.pdf,.json"
        onChange={(e) => onUpload(e.target.files)}
        className="hidden"
      />
    </div>
  )
}

// Product Editor Component
function ProductEditor({
  product,
  sellers,
  uploadedFiles,
  onSave,
  onClose,
  isNew
}: {
  product: Product
  sellers: Seller[]
  uploadedFiles: UploadedFile[]
  onSave: (product: Product) => void
  onClose: () => void
  isNew: boolean
}) {
  const [form, setForm] = useState({
    ...product,
    price: product.price || 0
  })
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants || [])
  const [showFilePicker, setShowFilePicker] = useState(false)

  const handleAddVariant = () => {
    setVariants([...variants, {
      id: `var-${Date.now()}`,
      name: '',
      price: 0,
      period: '',
      features: []
    }])
  }

  const handleUpdateVariant = (index: number, field: string, value: any) => {
    const updated = [...variants]
    if (field === 'features') {
      updated[index] = { ...updated[index], features: value.split(',').map((f: string) => f.trim()).filter(Boolean) }
    } else if (field === 'price') {
      updated[index] = { ...updated[index], price: parseInt(value) || 0 }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setVariants(updated)
  }

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert('Введите название товара')
      return
    }

    const finalPrice = variants.length > 0 ? variants[0].price : form.price

    onSave({
      ...form,
      price: finalPrice,
      variants: variants.filter(v => v.name.trim())
    })
  }

  const selectImage = (url: string) => {
    setForm({ ...form, images: [url] })
    setShowFilePicker(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <div className="sticky top-0 bg-light-card dark:bg-dark-card p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
            {isNew ? 'Новый товар' : 'Редактирование'}
          </h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Image Preview */}
          <div className="flex gap-3 items-start">
            <img
              src={form.images[0] || '/products/placeholder.png'}
              alt="Preview"
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="flex-1">
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Изображение</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.images[0]}
                  onChange={e => setForm({...form, images: [e.target.value]})}
                  placeholder="/brands/example.webp"
                  className="flex-1 px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                />
                <button
                  onClick={() => setShowFilePicker(true)}
                  className="px-3 py-2 bg-accent-cyan text-white rounded-lg text-sm"
                >
                  Выбрать
                </button>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Название *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="ChatGPT Plus"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          {/* Category & Seller */}
          <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Продавец</label>
              <select
                value={form.seller.id}
                onChange={e => {
                  const seller = sellers.find(s => s.id === e.target.value)
                  if (seller) setForm({...form, seller})
                }}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Base Price (if no variants) */}
          {variants.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Базовая цена (₽)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-light-text dark:text-dark-text">Варианты товара</label>
              <button
                onClick={handleAddVariant}
                className="px-3 py-1 bg-accent-cyan text-white rounded-lg text-sm"
              >
                + Добавить
              </button>
            </div>

            {variants.length === 0 ? (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary py-4 text-center">
                Добавьте варианты товара (например, разные периоды подписки)
              </p>
            ) : (
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={variant.id} className="bg-light-bg dark:bg-dark-bg rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
                        Вариант {index + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveVariant(index)}
                        className="text-red-500 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={variant.name}
                        onChange={e => handleUpdateVariant(index, 'name', e.target.value)}
                        placeholder="Pro (1 месяц)"
                        className="px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                      />
                      <input
                        type="number"
                        value={variant.price}
                        onChange={e => handleUpdateVariant(index, 'price', e.target.value)}
                        placeholder="Цена"
                        className="px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      value={variant.period || ''}
                      onChange={e => handleUpdateVariant(index, 'period', e.target.value)}
                      placeholder="Период (1 месяц, 3 месяца...)"
                      className="w-full px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                    />
                    <input
                      type="text"
                      value={variant.features?.join(', ') || ''}
                      onChange={e => handleUpdateVariant(index, 'features', e.target.value)}
                      placeholder="Особенности через запятую"
                      className="w-full px-3 py-2 rounded-lg bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 pb-8">
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

        {/* File Picker Modal */}
        {showFilePicker && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-light-text dark:text-dark-text">Выберите изображение</h3>
                <button onClick={() => setShowFilePicker(false)} className="text-2xl">×</button>
              </div>
              {uploadedFiles.filter(f => f.type.startsWith('image/')).length === 0 ? (
                <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">
                  Нет загруженных изображений. Загрузите их во вкладке "Файлы".
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedFiles.filter(f => f.type.startsWith('image/')).map(file => (
                    <button
                      key={file.id}
                      onClick={() => selectImage(file.url)}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-accent-cyan"
                    >
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Seller Editor Component
function SellerEditor({
  seller,
  uploadedFiles,
  onSave,
  onClose
}: {
  seller: Seller
  uploadedFiles: UploadedFile[]
  onSave: (seller: Seller) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(seller)
  const [showFilePicker, setShowFilePicker] = useState(false)

  const selectImage = (url: string) => {
    setForm({ ...form, avatar: url })
    setShowFilePicker(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full rounded-t-3xl relative">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Редактирование продавца</h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <img
              src={form.avatar || '/default-avatar.png'}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
            <button
              onClick={() => setShowFilePicker(true)}
              className="px-4 py-2 bg-accent-cyan text-white rounded-lg text-sm"
            >
              Изменить аватар
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">ID</label>
            <input
              type="text"
              value={form.id}
              onChange={e => setForm({...form, id: e.target.value})}
              placeholder="Telegram ID"
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
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Рейтинг</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={e => setForm({...form, rating: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="verified"
              checked={form.isVerified || false}
              onChange={e => setForm({...form, isVerified: e.target.checked})}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="verified" className="text-sm text-light-text dark:text-dark-text">
              Верифицированный продавец
            </label>
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

        {/* File Picker */}
        {showFilePicker && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-light-text dark:text-dark-text">Выберите аватар</h3>
                <button onClick={() => setShowFilePicker(false)} className="text-2xl">×</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {uploadedFiles.filter(f => f.type.startsWith('image/')).map(file => (
                  <button
                    key={file.id}
                    onClick={() => selectImage(file.url)}
                    className="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-accent-cyan"
                  >
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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

// Promo Editor Component
function PromoEditor({
  promo,
  onSave,
  onClose
}: {
  promo: PromoCode
  onSave: (promo: PromoCode) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(promo)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-light-card dark:bg-dark-card w-full max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <div className="sticky top-0 bg-light-card dark:bg-dark-card p-4 border-b border-light-border dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-light-text dark:text-dark-text">Редактирование промокода</h2>
          <button onClick={onClose} className="text-2xl text-light-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Код</label>
            <input
              type="text"
              value={form.code}
              onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
              placeholder="PROMO2025"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Описание</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Скидка на первый заказ"
              className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Тип скидки</label>
              <select
                value={form.discountType}
                onChange={e => setForm({...form, discountType: e.target.value as 'percentage' | 'fixed'})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                <option value="percentage">Процент (%)</option>
                <option value="fixed">Фиксированная (₽)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Размер скидки</label>
              <input
                type="number"
                value={form.discountValue}
                onChange={e => setForm({...form, discountValue: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Мин. сумма заказа</label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={e => setForm({...form, minOrderAmount: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Макс. использований</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={e => setForm({...form, maxUses: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 rounded-xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="promo-active"
              checked={form.isActive}
              onChange={e => setForm({...form, isActive: e.target.checked})}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="promo-active" className="text-sm text-light-text dark:text-dark-text">
              Активен
            </label>
          </div>

          <div className="flex gap-2 pt-4 pb-8">
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
