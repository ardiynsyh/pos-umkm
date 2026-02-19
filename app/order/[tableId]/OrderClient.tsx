"use client";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  nama: string;
  hargaJual: number;
  stok: number;
  image?: string | null;
};

export default function OrderClient({ tableId }: { tableId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public/products')
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

  function addToCart(p: Product) {
    setCart((c) => {
      const found = c.find((x) => x.productId === p.id);
      if (found) return c.map((x) => x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...c, { productId: p.id, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((c) => c.filter((x) => x.productId !== productId));
  }

  async function submitOrder() {
    if (cart.length === 0) {
      setMessage('Keranjang kosong');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const items = cart.map((c) => ({ productId: c.productId, quantity: c.quantity }));
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, customerName: null, paymentMethod: 'TUNAI', items }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.message || 'Gagal membuat pesanan');
      } else {
        setMessage('Pesanan dibuat: ' + (body.orderNumber || body.orderId));
        setCart([]);
      }
    } catch (err) {
      setMessage('Gagal koneksi ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 className="text-2xl font-bold mb-4">Pemesanan Meja</h1>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <h2 className="font-semibold mb-2">Menu</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {products.map((p) => (
              <div key={p.id} className="border rounded p-3 flex flex-col items-stretch">
                <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.nama} style={{ maxWidth: '100%', maxHeight: '130px', objectFit: 'cover' }} />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="font-semibold">{p.nama}</div>
                  <div className="text-sm text-gray-500">Rp {p.hargaJual}</div>
                </div>
                <div className="mt-2" style={{ marginTop: 'auto' }}>
                  <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={() => addToCart(p)}>Tambah</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 320 }}>
          <h2 className="font-semibold mb-2">Keranjang</h2>
          <div className="border rounded p-3">
            {cart.length === 0 && <div className="text-sm text-gray-500">Keranjang kosong</div>}
            {cart.map((c) => {
              const prod = products.find((p) => p.id === c.productId);
              return (
                <div key={c.productId} className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    {prod?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.image} alt={prod.nama} className="w-12 h-12 rounded object-cover" style={{ width: 48, height: 48 }} />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">-</div>
                    )}
                    <div>
                      <div className="font-medium">{prod?.nama}</div>
                      <div className="text-xs text-gray-500">{c.quantity} × Rp {prod?.hargaJual}</div>
                    </div>
                  </div>
                  <div>
                    <button onClick={() => removeFromCart(c.productId)} className="text-red-500">Hapus</button>
                  </div>
                </div>
              );
            })}

            <div className="mt-4">
              <button disabled={loading} onClick={submitOrder} className="bg-green-600 text-white px-4 py-2 rounded">
                {loading ? 'Mengirim...' : 'Kirim Pesanan'}
              </button>
            </div>
            {message && <div className="mt-3 text-sm">{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
