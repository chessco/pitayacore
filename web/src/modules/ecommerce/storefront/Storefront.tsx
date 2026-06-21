import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { ShoppingBag, ShoppingCart, X, ChevronRight, Package, Tag, Star, ArrowRight, CheckCircle2, Loader2, Search, CreditCard, Plus, ArrowUpRight, Eye, RefreshCw, Layers, ShieldCheck, Zap, Share2, Heart, Filter, SlidersHorizontal, MapPin, User, Phone, ChevronDown } from 'lucide-react'
import axios from 'axios'
import { SECTOR_CONFIGS } from '../sectorConfigs'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/50 rounded-2xl ${className}`} />
}

function ProductSkeleton() {
  return (
    <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-4 border border-white/40">
      <Skeleton className="aspect-square mb-4 rounded-[2rem]" />
      <div className="px-2 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between items-center mt-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function Storefront() {
  const { slug, trackingId } = useParams()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(trackingId || null)
  const [flyingProduct, setFlyingProduct] = useState<any | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'MXN'>('USD')
  const [exchangeRate, setExchangeRate] = useState(17.5)
  const [sector, setSector] = useState<string>('retail')
  const [wishlist, setWishlist] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [shippingData, setShippingData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    zip: ''
  })
  
  // Attribution
  const capsuleId = new URLSearchParams(window.location.search).get('capsuleId')

  useEffect(() => {
    if (trackingId) {
      setCheckoutStep('success');
      setIsCartOpen(true);
    }
  }, [trackingId]);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014'

  useEffect(() => {
    fetchStoreData()
  }, [slug])

  // SEO & Meta Tags Update
  useEffect(() => {
    if (!loading && products.length > 0) {
      const storeName = slug?.toUpperCase() || 'PitayaCore'
      const activeProduct = selectedProduct || 
        (new URLSearchParams(window.location.search).get('addToCart') 
          ? products.find(p => p.id === new URLSearchParams(window.location.search).get('addToCart')) 
          : null)

      const title = activeProduct 
        ? `${activeProduct.name} | ${storeName}`
        : `${storeName} | Tienda Oficial Premium`
      
      const description = activeProduct
        ? activeProduct.description
        : `Explora el catálogo exclusivo de ${storeName}. Productos de alta tecnología con calidad certificada.`

      const image = activeProduct?.imageUrl || products[0]?.imageUrl || ''

      document.title = title
      
      // Update Meta Description
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.setAttribute('name', 'description')
        document.head.appendChild(metaDesc)
      }
      metaDesc.setAttribute('content', description)

      // Open Graph Tags
      const ogTags = [
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: image },
        { property: 'og:type', content: activeProduct ? 'product' : 'website' },
        { property: 'og:url', content: window.location.href },
        { property: 'og:site_name', content: 'PitayaCore' }
      ]

      // Add Meta Product-Specific Tags for Catalog Sync
      if (activeProduct) {
        ogTags.push(
          { property: 'product:price:amount', content: activeProduct.price.toString() },
          { property: 'product:price:currency', content: displayCurrency },
          { property: 'product:availability', content: activeProduct.stock > 0 ? 'instock' : 'oos' },
          { property: 'product:condition', content: 'new' },
          { property: 'product:retailer_item_id', content: activeProduct.id },
          { property: 'product:brand', content: storeName }
        )
      }

      ogTags.forEach(tag => {
        let el = document.querySelector(`meta[property="${tag.property}"]`)
        if (!el) {
          el = document.createElement('meta')
          el.setAttribute('property', tag.property)
          document.head.appendChild(el)
        }
        el.setAttribute('content', tag.content)
      })

      // JSON-LD Structured Data
      const structuredData = activeProduct ? {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": activeProduct.name,
        "image": activeProduct.imageUrl,
        "description": activeProduct.description,
        "sku": activeProduct.sku,
        "offers": {
          "@type": "Offer",
          "url": window.location.href,
          "priceCurrency": displayCurrency,
          "price": activeProduct.price,
          "availability": activeProduct.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
      } : {
        "@context": "https://schema.org/",
        "@type": "Store",
        "name": storeName,
        "description": `Tienda oficial de ${storeName} en PitayaCore.`,
        "url": window.location.href,
        "itemListElement": products.slice(0, 10).map((p, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "item": {
            "@type": "Product",
            "name": p.name,
            "image": p.imageUrl,
            "description": p.description,
            "offers": {
              "@type": "Offer",
              "price": p.price,
              "priceCurrency": "USD"
            }
          }
        }))
      }

      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.text = JSON.stringify(structuredData)
      script.id = 'json-ld-store'
      
      const oldScript = document.getElementById('json-ld-store')
      if (oldScript) oldScript.remove()
      document.head.appendChild(script)
    }
  }, [loading, products, slug, selectedProduct])

  useEffect(() => {
    const productId = new URLSearchParams(window.location.search).get('addToCart')
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId)
      if (product) {
        addToCart(product)
        setIsCartOpen(true)
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname + window.location.search.replace(`addToCart=${productId}`, ''))
      }
    }
  }, [products])

  const fetchStoreData = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes, rateRes] = await Promise.all([
        axios.get(`${apiUrl}/api/ecommerce/storefront/${slug}/products`),
        axios.get(`${apiUrl}/api/ecommerce/storefront/${slug}/categories`),
        axios.get(`${apiUrl}/api/ecommerce/exchange-rate`)
      ])
      setProducts(prodRes.data)
      setCategories(catRes.data)
      if (rateRes.data) setExchangeRate(rateRes.data)
      
      // Determine sector from first product or default
      if (prodRes.data.length > 0 && prodRes.data[0].tenant?.sector) {
        setSector(prodRes.data[0].tenant.sector)
      }
    } catch (err) {
      console.error('Error loading store:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async (product?: any) => {
    const shareData = {
      title: product ? product.name : `Tienda ${slug}`,
      text: product ? product.description : `Mira los productos increíbles en la tienda de ${slug}`,
      url: window.location.href + (product ? `?addToCart=${product.id}` : '')
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      navigator.clipboard.writeText(shareData.url)
      alert('Enlace copiado al portapapeles')
    }
  }

  const formatPrice = (price: number) => {
    const amount = displayCurrency === 'USD' ? price : price * exchangeRate
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: displayCurrency,
    }).format(amount)
  }

  const getProductBadge = (product: any) => {
    if (product.price < 50) return { label: 'Oferta', color: 'bg-rose-500' }
    if (product.stock < 10) return { label: 'Últimas Unidades', color: 'bg-amber-500' }
    if (new Date(product.createdAt).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)) return { label: 'Nuevo', color: 'bg-blue-500' }
    return null
  }

  const addToCart = (product: any, event?: React.MouseEvent) => {
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
    
    // Trigger flying animation
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      setFlyingProduct({
        ...product,
        x: rect.left,
        y: rect.top
      })
      setTimeout(() => setFlyingProduct(null), 1000)
    }

    setTimeout(() => setIsCartOpen(true), 800)
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

  useEffect(() => {
    const savedWishlist = localStorage.getItem(`wishlist_${slug}`)
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist))
  }, [])

  useEffect(() => {
    localStorage.setItem(`wishlist_${slug}`, JSON.stringify(wishlist))
  }, [wishlist])

  const toggleWishlist = (id: string) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleCheckout = async () => {
    if (checkoutStep === 'cart') setCheckoutStep('shipping')
    else if (checkoutStep === 'shipping') {
      if (!shippingData.name || !shippingData.address || !shippingData.phone) {
        alert('Por favor completa los datos de envío')
        return
      }
      setCheckoutStep('payment')
    }
    else if (checkoutStep === 'payment') {
      setLoading(true)
      try {
        const res = await axios.post(`${apiUrl}/api/ecommerce/storefront/${slug}/checkout`, {
          customerName: shippingData.name,
          shippingAddress: `${shippingData.address}, ${shippingData.city}`,
          phone: shippingData.phone,
          total: cartTotal,
          capsuleId: capsuleId,
          items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
        setOrderId(res.data.id)
        setCheckoutStep('success')
        setCart([])
      } catch (err) {
        alert('Error al procesar la orden')
      } finally {
        setLoading(false)
      }
    }
  }

  const filteredProducts = products
    .filter(p => 
      (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedCategory === null || p.categoryId === selectedCategory) &&
      (p.price >= priceRange[0] && p.price <= priceRange[1])
    )
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[120] bg-white/40 backdrop-blur-3xl border-b border-white/20 px-8 py-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30"
          >
            <ShoppingBag size={24} />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-800 tracking-tight font-outfit uppercase leading-none">Tienda <span className="text-emerald-500 italic">{slug}</span></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">PitayaCore Commerce</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Share Button */}
          <button 
            onClick={() => handleShare()}
            className="p-3 bg-white/50 backdrop-blur border border-white/60 rounded-2xl text-slate-400 hover:text-emerald-500 transition-all shadow-sm"
            title="Compartir Tienda"
          >
            <Share2 size={20} />
          </button>

          {/* Currency Switcher */}
          <div className="hidden sm:flex bg-white/50 backdrop-blur border border-white/60 p-1 rounded-2xl shadow-sm">
            <button 
              onClick={() => setDisplayCurrency('USD')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${displayCurrency === 'USD' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              USD
            </button>
            <button 
              onClick={() => setDisplayCurrency('MXN')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${displayCurrency === 'MXN' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              MXN
            </button>
          </div>

          <div className="relative hidden lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="¿Qué estás buscando hoy?"
              className="pl-12 pr-6 py-3 bg-white/50 border border-white/60 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all w-80 placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCartOpen(true)}
            className="relative w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-600 hover:text-emerald-500 hover:border-emerald-100 transition-all shadow-sm"
          >
            <ShoppingCart size={22} />
            <AnimatePresence>
              {cart.length > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-lg"
                >
                  {cart.length}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </nav>

      {/* Fly to cart effect */}
      <AnimatePresence>
        {flyingProduct && (
          <motion.div
            initial={{ x: flyingProduct.x, y: flyingProduct.y, scale: 1, opacity: 1 }}
            animate={{ 
              x: window.innerWidth - 80, 
              y: 20, 
              scale: 0.2, 
              opacity: 0 
            }}
            transition={{ duration: 0.8, ease: "circIn" }}
            className="fixed z-[200] w-20 h-20 bg-emerald-500 rounded-3xl overflow-hidden shadow-2xl pointer-events-none"
          >
            <img src={flyingProduct.imageUrl} className="w-full h-full object-cover" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="pt-36 pb-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[4rem] overflow-hidden bg-[#0A0C10] p-16 md:p-24 text-white shadow-3xl group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-blue-600/30 mix-blend-overlay group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] mb-10 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Nueva Colección Disponible
              </div>
              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1] font-outfit">
                Eleva tu <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">Potencial.</span>
              </h1>
              <p className="text-xl text-slate-400 mb-12 leading-relaxed max-w-lg">
                Ingeniería de precisión aplicada a cada detalle. Descubre nuestra selección curada de alta tecnología y rendimiento industrial.
              </p>
              <div className="flex flex-wrap gap-5">
                <button className="px-10 py-5 bg-white text-slate-900 font-black rounded-[2rem] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 text-sm shadow-2xl shadow-white/10">
                  Explorar Catálogo <Plus size={20} />
                </button>
                <button className="px-10 py-5 bg-white/5 backdrop-blur-md border border-white/10 text-white font-black rounded-[2rem] hover:bg-white/10 transition-all flex items-center gap-3 text-sm">
                  Casos de Éxito <ArrowUpRight size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-8 mb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-slate-800 font-outfit uppercase tracking-tight">Categorías</h2>
              <div className="w-12 h-1.5 bg-emerald-500 rounded-full mt-1" />
            </div>
            <div className="flex gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              Mostrando <span className="text-emerald-500">{filteredProducts.length} Productos</span>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar">
            <motion.button 
              whileHover={{ y: -4 }}
              onClick={() => setSelectedCategory(null)}
              className={`px-8 py-4 rounded-[1.5rem] text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 ${selectedCategory === null ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'}`}
            >
              Todos los Productos
            </motion.button>
            {categories.map(cat => (
              <motion.button 
                whileHover={{ y: -4 }}
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-8 py-4 rounded-[1.5rem] text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 ${selectedCategory === cat.id ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100 shadow-sm'}`}
              >
                {cat.name}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Filters & Sorting */}
      <section className="px-8 mb-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all ${isFilterOpen ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'}`}
            >
              <SlidersHorizontal size={16} /> Filtros {isFilterOpen ? 'Cerrar' : 'Abrir'}
            </button>
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none pl-6 pr-12 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black text-slate-600 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer shadow-sm"
              >
                <option value="newest">Más Recientes</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-xl"
              >
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Rango de Inversión</label>
                  <div className="space-y-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="10000" 
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between items-center text-xs font-black text-slate-800">
                      <span>{formatPrice(0)}</span>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg">Hasta {formatPrice(priceRange[1])}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Categoría Rápida</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(0, 4).map(c => (
                      <button 
                        key={c.id}
                        onClick={() => setSelectedCategory(selectedCategory === c.id ? null : c.id)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedCategory === c.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <button 
                    onClick={() => { setPriceRange([0, 10000]); setSelectedCategory(null); }}
                    className="w-full py-3 bg-slate-900 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all"
                  >
                    Restablecer Filtros
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Products Grid */}
      <section className="px-8 pb-32">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <ProductSkeleton key={n} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              <AnimatePresence mode='popLayout'>
                {filteredProducts.map((p, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ 
                      delay: idx * 0.05,
                      type: "spring",
                      stiffness: 100,
                      damping: 20
                    }}
                    key={p.id} 
                    className="group bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-4 border border-white/40 hover:shadow-[0_20px_50px_rgba(8,112,184,0.1)] hover:border-emerald-200 transition-all duration-500 flex flex-col"
                  >
                    <div className="relative aspect-square bg-[#F5F7FA] rounded-[2rem] overflow-hidden mb-5">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Package size={64} />
                        </div>
                      )}
                      
                      {/* Wishlist Button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
                        className={`absolute top-4 left-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-10 ${wishlist.includes(p.id) ? 'bg-rose-500 text-white shadow-lg' : 'bg-white/80 backdrop-blur text-slate-400 hover:text-rose-500 shadow-sm'}`}
                      >
                        <Heart size={18} fill={wishlist.includes(p.id) ? "currentColor" : "none"} />
                      </button>

                      {/* Badge */}
                      {getProductBadge(p) && (
                        <div className="absolute top-4 right-4">
                          <span className={`px-4 py-1.5 ${getProductBadge(p)?.color} text-white shadow-xl rounded-full text-[9px] font-black uppercase tracking-wider animate-in fade-in zoom-in duration-500`}>
                            {getProductBadge(p)?.label}
                          </span>
                        </div>
                      )}

                      <div className="absolute top-4 left-4">
                        <span className="px-4 py-1.5 bg-white shadow-xl shadow-slate-900/5 rounded-full text-[9px] font-black uppercase tracking-wider text-slate-900">
                          {p.category?.name || 'General'}
                        </span>
                      </div>
                      
                      {/* Quick View Button */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedProduct(p)}
                          className="px-6 py-3 bg-white text-slate-900 font-black rounded-2xl flex items-center gap-2 text-xs shadow-2xl"
                        >
                          <Eye size={16} /> Vista Rápida
                        </motion.button>
                      </div>
                    </div>
                    <div className="px-3 flex-1">
                      <h3 className="text-xl font-black text-slate-800 mb-2 font-outfit group-hover:text-emerald-500 transition-colors truncate">{p.name}</h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 mb-8 h-10">{p.description}</p>
                    </div>
                    <div className="px-3 pb-3 flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Inversión</span>
                        <span className="text-2xl font-black text-slate-900 font-outfit">{formatPrice(p.price)}</span>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => addToCart(p, e)}
                        className="w-14 h-14 rounded-[1.5rem] bg-slate-900 text-white flex items-center justify-center hover:bg-emerald-500 transition-all duration-300 shadow-xl shadow-slate-900/10"
                      >
                        <Plus size={28} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150]" 
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[160] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight font-outfit">Tu Carrito</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cart.length} Artículos</p>
                  </div>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {checkoutStep === 'success' ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6">
                      <CheckCircle2 size={48} />
                    </div>
                    <h4 className="text-2xl font-black text-slate-800 mb-2 font-outfit uppercase">¡Orden Completada!</h4>
                    <p className="text-sm text-slate-500 mb-8 px-4 font-medium">Gracias por tu compra. Tu pedido está siendo procesado por nuestro equipo.</p>
                    <div className="bg-slate-50 p-4 rounded-2xl w-full mb-8 border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest">ID de Seguimiento</span>
                      <span className="font-mono text-emerald-600 font-bold break-all text-xs">{orderId}</span>
                    </div>
                    <button 
                      onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                      className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      Seguir Comprando
                    </button>
                  </div>
                ) : checkoutStep === 'shipping' ? (
                  <div className="space-y-8 animate-in slide-in-from-right duration-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Información de Envío</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">¿A dónde enviamos tu pedido?</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Nombre Completo"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all outline-none"
                          value={shippingData.name}
                          onChange={(e) => setShippingData({...shippingData, name: e.target.value})}
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Dirección y Número"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all outline-none"
                          value={shippingData.address}
                          onChange={(e) => setShippingData({...shippingData, address: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="text" 
                          placeholder="Ciudad / Estado"
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all outline-none"
                          value={shippingData.city}
                          onChange={(e) => setShippingData({...shippingData, city: e.target.value})}
                        />
                        <input 
                          type="text" 
                          placeholder="C.P."
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all outline-none"
                          value={shippingData.zip}
                          onChange={(e) => setShippingData({...shippingData, zip: e.target.value})}
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="tel" 
                          placeholder="Teléfono de Contacto"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all outline-none"
                          value={shippingData.phone}
                          onChange={(e) => setShippingData({...shippingData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                ) : checkoutStep === 'payment' ? (
                  <div className="space-y-8 animate-in slide-in-from-right duration-500">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Método de Pago</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Seguridad Stripe de 256 bits</p>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                      <div className="flex justify-between items-start mb-12">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur">
                          <Zap size={24} className="text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Virtual Card</span>
                      </div>
                      <div className="mb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total a Pagar</p>
                        <p className="text-3xl font-black font-outfit">{formatPrice(cartTotal)}</p>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Titular</p>
                          <p className="text-sm font-bold truncate max-w-[150px]">{shippingData.name || 'Cliente PitayaCore'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Envío a</p>
                          <p className="text-sm font-bold">{shippingData.city || 'Confirmando...'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-3 items-center">
                      <ShieldCheck className="text-emerald-500" />
                      <p className="text-[10px] font-bold text-emerald-800 leading-tight uppercase">Tu pago está protegido por el sistema de garantía de PitayaCore AI.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-5 group">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100 group-hover:scale-105 transition-transform">
                          <img src={item.imageUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate font-outfit">{item.name}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-1">{item.quantity} x {formatPrice(item.price)}</span>
                          <div className="flex items-center gap-4 mt-3">
                            <button onClick={() => addToCart(item)} className="text-[10px] font-black text-emerald-600 uppercase hover:underline">Añadir</button>
                            <button onClick={() => removeFromCart(item.id)} className="text-[10px] font-black text-rose-400 uppercase hover:underline">Eliminar</button>
                          </div>
                        </div>
                        <div className="text-sm font-black text-slate-900 font-outfit">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                          <ShoppingBag size={48} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Carrito Vacío</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {cart.length > 0 && checkoutStep !== 'success' && (
                <div className="p-8 bg-slate-50 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total Estimado</span>
                    <span className="text-4xl font-black text-slate-900 font-outfit">{formatPrice(cartTotal)}</span>
                  </div>
                  
                  {checkoutStep === 'payment' && (
                    <div className="mb-8 p-5 bg-blue-50/50 border border-blue-100 rounded-[1.5rem] flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                        <CreditCard size={24} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-blue-400 uppercase block tracking-widest">Modo Seguro Activo</span>
                        <span className="text-xs font-bold text-blue-800">Procesamiento Encriptado</span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full py-5 bg-emerald-500 text-white font-black rounded-[2rem] shadow-2xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : (
                      <>
                        <span className="uppercase tracking-widest text-xs">
                          {checkoutStep === 'cart' ? 'Continuar al Envío' : checkoutStep === 'shipping' ? 'Ir al Pago' : 'Confirmar Compra'}
                        </span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick View Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200]" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl z-[210] overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Product Gallery (Left) */}
              <div className="md:w-1/2 bg-[#F8FAFC] p-8 flex flex-col">
                <div className="flex-1 relative rounded-[2rem] overflow-hidden bg-white shadow-inner flex items-center justify-center border border-slate-100">
                  <img src={selectedProduct.imageUrl} className="w-full h-full object-contain p-8" alt={selectedProduct.name} />
                  {getProductBadge(selectedProduct) && (
                    <div className="absolute top-6 left-6">
                      <span className={`px-5 py-2 ${getProductBadge(selectedProduct)?.color} text-white shadow-xl rounded-full text-xs font-black uppercase tracking-widest`}>
                        {getProductBadge(selectedProduct)?.label}
                      </span>
                    </div>
                  )}
                </div>
                {/* Simulated Thumbnails */}
                <div className="flex gap-4 mt-6 justify-center">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-20 h-20 rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${i === 1 ? 'border-emerald-500 scale-105' : 'border-slate-100 opacity-50 hover:opacity-100'}`}>
                      <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Info (Right) */}
              <div className="md:w-1/2 p-12 flex flex-col overflow-y-auto custom-scrollbar">
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-8 right-8 p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-500"
                >
                  <X size={20} />
                </button>

                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {selectedProduct.category?.name || 'General'}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                      <Star size={14} fill="currentColor" />
                    </div>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 font-outfit mb-4 leading-tight">{selectedProduct.name}</h2>
                  <p className="text-slate-500 leading-relaxed font-medium">{selectedProduct.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Precio</span>
                    <span className="text-3xl font-black text-slate-900 font-outfit">{formatPrice(selectedProduct.price)}</span>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Disponibilidad</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedProduct.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-sm font-bold text-slate-800">{selectedProduct.stock > 0 ? `${selectedProduct.stock} unidades` : 'Agotado'}</span>
                    </div>
                  </div>
                </div>

                {/* Sector Specific Fields */}
                {sector && SECTOR_CONFIGS[sector] && (
                  <div className="mb-10 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Layers size={18} className="text-emerald-500" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Especificaciones Técnicas</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {SECTOR_CONFIGS[sector].productFields.map(field => {
                        const val = selectedProduct.customFields?.[field.name];
                        if (!val) return null;
                        return (
                          <div key={field.name} className="flex flex-col p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{field.label}</span>
                            <span className="text-sm font-black text-slate-800">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-auto flex gap-4">
                  <button 
                    onClick={(e) => { addToCart(selectedProduct, e as any); setSelectedProduct(null); }}
                    className="flex-1 py-5 bg-emerald-500 text-white font-black rounded-[1.5rem] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Plus size={24} />
                    Añadir al Carrito
                  </button>
                  <button 
                    onClick={() => handleShare(selectedProduct)}
                    className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center hover:scale-110 transition-all shadow-xl"
                  >
                    <Share2 size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
