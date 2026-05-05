import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateTicket } from '../components/TicketPDF';
import '../styles/POS.css';

function POS() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const searchRef = useRef(null);
  const barcodeBuffer = useRef('');

  // Búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim().length > 0) {
        fetch(`/api/products/search?q=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setResults(data))
          .catch(console.error);
      } else {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, token]);

  // Simular escáner de código de barras: capturar teclas rápidamente y al Enter buscar
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Si el foco está en otro input (p.ej. cantidad) no interferir
      if (document.activeElement !== searchRef.current) return;
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 0) {
          setSearch(barcodeBuffer.current);
          barcodeBuffer.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        // Limpiar buffer después de 100ms de inactividad (escáner es rápido)
        clearTimeout(window.barcodeTimer);
        window.barcodeTimer = setTimeout(() => { barcodeBuffer.current = ''; }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cargar clientes para selector
  useEffect(() => {
    fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCustomers(data));
  }, [token]);

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        discount_percent: 0,
        is_service: product.is_service
      }]);
    }
    setSearch('');
    searchRef.current?.focus();
  };

  const removeFromCart = (product_id) => {
    setCart(cart.filter(item => item.product_id !== product_id));
  };

  const updateQuantity = (product_id, qty) => {
    if (qty < 1) return;
    setCart(cart.map(item =>
      item.product_id === product_id ? { ...item, quantity: qty } : item
    ));
  };

  const updateDiscount = (product_id, discount) => {
    setCart(cart.map(item =>
      item.product_id === product_id ? { ...item, discount_percent: Number(discount) } : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity * (1 - item.discount_percent / 100), 0);
  const change = paymentMethod === 'cash' && cashAmount ? Number(cashAmount) - subtotal : 0;

  const processSale = async () => {
    if (cart.length === 0) {
      setMessage('Agrega productos al carrito');
      return;
    }
    setLoading(true);
    try {
      const body = {
        customer_id: selectedCustomer?.id || null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discount_percent: item.discount_percent
        })),
        payment_method: paymentMethod,
        cash_amount: paymentMethod === 'cash' ? Number(cashAmount) : null
      };
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      generateTicket(data.sale, data.items);
      setCart([]);
      setCashAmount('');
      setSelectedCustomer(null);
      setMessage('Venta realizada con éxito');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-container">
      <div className="pos-left">
        <h2>Venta rápida</h2>
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar por nombre, código o escanear código de barras..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
          autoFocus
        />
        {results.length > 0 && (
          <div className="search-results">
            {results.map(prod => (
              <div key={prod.id} className="result-item" onClick={() => addToCart(prod)}>
                <span>{prod.name}</span>
                <span>${prod.price.toFixed(2)} | Stock: {prod.is_service ? '∞' : prod.stock}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pos-right">
        <div className="customer-select">
          <label>Cliente (opcional): </label>
          <select onChange={e => setSelectedCustomer(customers.find(c => c.id == e.target.value) || null)}>
            <option value="">Público en general</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
            ))}
          </select>
        </div>

        <div className="cart">
          <h3>Carrito</h3>
          {cart.length === 0 ? <p>Sin productos</p> : (
            <ul>
              {cart.map(item => (
                <li key={item.product_id} className="cart-item">
                  <div className="item-info">
                    <span>{item.name}</span>
                    <div className="item-controls">
                      <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>+</button>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount_percent}
                        onChange={e => updateDiscount(item.product_id, e.target.value)}
                        style={{ width: '50px' }}
                      />%
                      <button onClick={() => removeFromCart(item.product_id)}>🗑️</button>
                    </div>
                  </div>
                  <span>${ (item.price * item.quantity * (1 - item.discount_percent/100)).toFixed(2) }</span>
                </li>
              ))}
            </ul>
          )}
          <div className="totals">
            <p>Subtotal: ${subtotal.toFixed(2)}</p>
            {paymentMethod === 'cash' && (
              <div>
                <label>Efectivo recibido: $</label>
                <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                <p>Cambio: ${change.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="payment-methods">
          <label>Método de pago:</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="mixed">Mixto</option>
          </select>
        </div>

        <button className="checkout-btn" onClick={processSale} disabled={loading}>
          {loading ? 'Procesando...' : `Cobrar $${subtotal.toFixed(2)}`}
        </button>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}

export default POS;