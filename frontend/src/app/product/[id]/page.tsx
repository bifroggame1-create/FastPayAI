'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import BottomNav from '@/components/BottomNav'
import { Product, ProductVariant } from '@/types'
import { productsApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const { toggleFavorite, isFavorite } = useAppStore()

  useEffect(() => {
    loadProduct()
  }, [params.id])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const data = await productsApi.getById(params.id as string)
      setProduct(data)

      // Select first variant by default if available
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0])
      }

      // Load recommended products
      const allProducts = await productsApi.getAll({ category: data.category })
      const recommended = allProducts.filter(p => p._id !== data._id).slice(0, 5)
      setRecommendedProducts(recommended)
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-cyan"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <p className="text-light-text-secondary dark:text-dark-text-secondary">Товар не найден</p>
      </div>
    )
  }

  const specifications = [
    { text: 'Мгновенная доставка за 5 минут', show: true },
    { text: 'Официальная подписка/ключ', show: product.condition === 'new' },
    { text: 'Гарантия возврата средств', show: true },
    { text: 'Поддержка 24/7', show: true },
    { text: 'Проверенный продавец', show: true },
  ]

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-32">
      <Header
        title={product.category.charAt(0).toUpperCase() + product.category.slice(1)}
        showBack
        onBack={() => router.back()}
      />

      {/* Image Gallery */}
      <div className="relative aspect-square bg-light-card dark:bg-dark-card mb-4">
        <img
          src={product.images[currentImageIndex] || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover rounded-2xl"
        />

        {product.images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {product.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4">
        {/* Price and Title */}
        <h1 className="text-3xl font-bold mb-2 text-light-text dark:text-dark-text">
          {(selectedVariant?.price || product.price).toLocaleString('ru-RU')} ₽
        </h1>
        <h2 className="text-xl font-semibold mb-4 text-light-text dark:text-dark-text">{product.name}</h2>

        {/* Variants Selection */}
        {product.variants && product.variants.length > 0 && (
          <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 mb-4 border border-light-border dark:border-dark-border">
            <h3 className="text-sm font-semibold mb-3 text-light-text-secondary dark:text-dark-text-secondary">
              Выберите вариант услуги
            </h3>
            <div className="space-y-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedVariant?.id === variant.id
                      ? 'border-accent-cyan bg-accent-cyan/10'
                      : 'border-light-border dark:border-dark-border hover:border-accent-cyan/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-light-text dark:text-dark-text">{variant.name}</span>
                    <span className="font-bold text-accent-cyan">{variant.price.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  {variant.features && variant.features.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {variant.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-light-bg dark:bg-dark-bg rounded-full text-light-text-secondary dark:text-dark-text-secondary"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Specifications */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 mb-4 border border-light-border dark:border-dark-border">
          {specifications.filter(s => s.show && s.text !== product.description).map((spec, index) => (
            <div key={index} className="flex items-start gap-2 mb-2 last:mb-0">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-light-text dark:text-dark-text">{spec.text}</span>
            </div>
          ))}
        </div>

        {/* Product Description */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 mb-4 border border-light-border dark:border-dark-border">
          <h3 className="text-base font-semibold mb-3 text-light-text dark:text-dark-text">Описание товара</h3>
          <div className="text-sm text-light-text dark:text-dark-text whitespace-pre-line leading-relaxed">
            {product.description}
          </div>
        </div>

        {/* Promo */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 mb-4 border border-light-border dark:border-dark-border">
          <p className="mb-3 text-light-text dark:text-dark-text">Бонус к каждому заказу 🎁</p>
          <div className="border-t border-light-border dark:border-dark-border my-3"></div>
          <p className="text-green-500 dark:text-green-400">✨ Скидка 10% на следующую покупку!</p>
        </div>

        {/* Safety and Delivery Badges */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Безопасная сделка</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-blue/10 dark:bg-accent-blue/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-medium text-light-text dark:text-dark-text">Доставка за 5 минут</span>
          </div>
        </div>

        {/* Contact Manager Button */}
        <button className="w-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-accent-cyan py-3 rounded-lg mb-4 hover:bg-light-border dark:hover:bg-dark-border transition-colors">
          Связаться с продавцом
        </button>

        {/* Seller Card */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 mb-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={product.seller.avatar || '/default-avatar.png'}
              alt={product.seller.name}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-light-text dark:text-dark-text">{product.seller.name}</span>
                <svg className="w-4 h-4 text-accent-cyan" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-light-text dark:text-dark-text">{product.seller.rating}</span>
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(product.seller.rating) ? 'text-yellow-500 fill-current' : 'text-gray-400 dark:text-gray-600'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-accent-cyan">99.6% успешных заказов</span>
                <svg className="w-4 h-4 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/seller/${product.seller.id}`)}
            className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-accent-cyan py-2 rounded-lg mb-3 hover:bg-light-border dark:hover:bg-dark-border transition-colors"
          >
            Открыть профиль
          </button>

          <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Мгновенная цифровая доставка</span>
          </div>
        </div>

        {/* Lot Number */}
        <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary text-sm mb-6">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Лот #{product._id.slice(-5)}</span>
        </div>

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-light-text dark:text-dark-text">Рекомендуемые товары</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {recommendedProducts.map((recProduct) => (
                <div key={recProduct._id} className="flex-shrink-0 w-64">
                  <ProductCard product={recProduct} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-light-bg dark:bg-dark-bg border-t border-light-border dark:border-dark-border">
        <div className="flex gap-3">
          <button
            onClick={() => {
              const params = new URLSearchParams({
                productId: product._id,
                ...(selectedVariant && { variantId: selectedVariant.id })
              })
              router.push(`/checkout?${params.toString()}`)
            }}
            className="flex-1 bg-accent-cyan text-white py-4 rounded-xl font-semibold hover:bg-accent-cyan/90 transition-colors"
          >
            Купить за {(selectedVariant?.price || product.price).toLocaleString('ru-RU')} ₽
          </button>
          <button
            onClick={() => toggleFavorite(product._id)}
            className="px-6 py-4 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl hover:bg-light-border dark:hover:bg-dark-border transition-colors"
          >
            <svg
              className={`w-6 h-6 ${isFavorite(product._id) ? 'fill-pink-500 text-pink-500' : 'fill-none text-light-text dark:text-dark-text'}`}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
