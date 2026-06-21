import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, ShieldCheck, Lock, ShoppingCart, CheckCircle2, X, ArrowRight, Loader2, Star } from 'lucide-react';
import axios from 'axios';

interface CheckoutBlockProps {
  data: {
    title: string;
    description: string;
    productIds: string[];
    buttonText: string;
  };
  apiUrl: string;
  slug: string;
  tenantId: string;
}

export const CheckoutBlock: React.FC<CheckoutBlockProps> = ({ data, apiUrl, slug, tenantId }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [points, setPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);

  const fetchPoints = async () => {
    if (!email) return;
    try {
      const res = await axios.get(`${apiUrl}/api/crm/contacts/by-email?email=${email}`, {
        headers: { 'x-tenant-id': tenantId }
      });
      if (res.data?.metadata?.points) {
        setPoints(res.data.metadata.points);
      }
    } catch (err) {
      console.log('User not found yet for points');
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      if (!data.productIds || data.productIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${apiUrl}/api/ecommerce/storefront/${slug}/products`);
        const filtered = res.data.filter((p: any) => data.productIds.includes(p.id));
        setProducts(filtered);
      } catch (err) {
        console.error('Error fetching products for checkout:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [data.productIds, apiUrl, slug]);

  const total = products.reduce((acc, p) => acc + p.price, 0);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentStatus('processing');

    try {
      // Simulate Stripe/Payment Gateway delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create order in backend
      const orderData = {
        customerName,
        email,
        total: usePoints ? Math.max(0, total - points * 0.1) : total,
        capsuleId: slug,
        usePoints,
        pointsUsed: usePoints ? points : 0,
        items: products.map(p => ({
          productId: p.id,
          quantity: 1,
          price: p.price
        }))
      };

      await axios.post(`${apiUrl}/api/ecommerce/storefront/${slug}/orders`, orderData);
      
      setPaymentStatus('success');
    } catch (err) {
      console.error('Payment processing failed:', err);
      setPaymentStatus('error');
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Cargando terminal de pago...</div>;
  if (products.length === 0) return null;

  return (
    <section className="py-20 px-6 bg-slate-50/50 rounded-[3rem] border border-slate-100 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -z-10" />
      
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
            <Lock size={12} /> Pago 100% Seguro
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-[#001A41] leading-tight">{data.title || 'Adquisición Directa'}</h2>
            <p className="text-slate-500 font-medium leading-relaxed">{data.description || 'Completa tu pedido ahora y recibe acceso prioritario a la solución.'}</p>
          </div>

          <div className="space-y-4">
            {products.map((p, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl.startsWith('http') ? p.imageUrl : `${apiUrl}${p.imageUrl}`} className="w-full h-full object-cover" alt={p.name} />
                  ) : (
                    <ShoppingCart size={20} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-[#001A41]">{p.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Incluido en paquete</p>
                </div>
                <div className="text-sm font-black text-blue-600">${p.price.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm font-black text-slate-400 uppercase tracking-widest">Inversión Total</div>
            <div className="text-right">
              {usePoints && (
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 line-through opacity-50">${total.toFixed(2)}</p>
              )}
              <div className="text-4xl font-black text-[#001A41]">
                ${(usePoints ? Math.max(0, total - points * 0.1) : total).toFixed(2)} <span className="text-xs text-slate-300">USD</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-slate-50 space-y-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#001A41]">Checkout PitayaCore</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Procesado por Stripe & SSL</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email de Contacto</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={fetchPoints}
                  placeholder="juan@ejemplo.com"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
                {points > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black"
                  >
                    <Star size={12} fill="currentColor" /> {points} AcuaPoints
                  </motion.div>
                )}
              </div>
            </div>
            
            {points > 0 && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Descuento Disponible</p>
                  <p className="text-xs font-bold text-emerald-600">-${(points * 0.1).toFixed(2)} USD canjeando tus puntos</p>
                </div>
                <button 
                  onClick={() => setUsePoints(!usePoints)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${usePoints ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-emerald-600 border border-emerald-200'}`}
                >
                  {usePoints ? 'Aplicado' : 'Canjear'}
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          <button 
            onClick={() => setShowPaymentModal(true)}
            disabled={!email || !customerName}
            className="w-full bg-[#001A41] hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-900/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale group"
          >
            <CreditCard size={18} />
            {data.buttonText || 'Pagar Ahora'}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center justify-center gap-6 opacity-40">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-4" alt="Stripe" />
            <div className="w-px h-4 bg-slate-300" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3" alt="Visa" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5" alt="Mastercard" />
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => paymentStatus !== 'processing' && setShowPaymentModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 overflow-hidden"
            >
              {paymentStatus === 'success' ? (
                <div className="text-center space-y-6 py-4">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-[#001A41]">¡Compra Exitosa!</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">Hemos enviado los detalles y tu factura al correo: <br/><span className="font-bold text-slate-900">{email}</span></p>
                  </div>
                  <button 
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full bg-[#001A41] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[#001A41]">Pasarela de Pago</h3>
                    <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>

                  <form onSubmit={handleProcessPayment} className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Resumen</span>
                        <span className="text-slate-900">${total.toFixed(2)} USD</span>
                      </div>
                      <div className="h-px bg-slate-200/50" />
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número de Tarjeta</label>
                          <div className="relative">
                            <input type="text" placeholder="**** **** **** ****" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none" required />
                            <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MM / YY</label>
                            <input type="text" placeholder="12/28" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CVC</label>
                            <input type="text" placeholder="123" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none" required />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={paymentStatus === 'processing'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {paymentStatus === 'processing' ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Procesando...
                        </>
                      ) : (
                        <>Confirmar Pago de ${total.toFixed(2)}</>
                      )}
                    </button>
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                      <Lock size={10} /> Conexión Encriptada de Punto a Punto
                    </p>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
