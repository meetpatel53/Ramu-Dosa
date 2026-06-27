import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import LoginPage from './LoginPage';
import './App.css';
// app.js
import { getTableManager } from './qr/tableManager.js';

async function initApp() {
  const tableManager = getTableManager();
  
  // Initialize
  const result = await tableManager.initialize();
  
  if (result.success) {
    console.log(`✅ Welcome! Table: ${result.table}`);
    // Load menu
    loadMenu(result.table);
  } else {
    console.error('❌', result.message);
    // Show QR scan page
    showQRScanner();
  }
}

function loadMenu(tableNumber) {
  // Fetch orders for this table
  fetch(`/api/orders?table=${tableNumber}`)
    .then(response => response.json())
    .then(orders => {
      // Display orders
    });
}

// Order placement
async function placeOrder(items) {
  const tableManager = getTableManager();
  const table = tableManager.getTable();
  
  if (!table) {
    alert('Please scan QR first!');
    return;
  }
  
  await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      table: table,
      items: items
    })
  });
}

const ContactForm = ({ onSubmitSuccess, showToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      if (response.ok) {
        setName('');
        setSubject('');
        setMessage('');
        onSubmitSuccess();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to send message', 'error');
      }
    } catch (err) {
      showToast('Network error, please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      <h3>Send us a Message</h3>
      <div className="form-group">
        <input
          type="text"
          placeholder="Your Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <input
          type="email"
          placeholder="Your Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <textarea
          placeholder="Message *"
          rows="4"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          disabled={loading}
        ></textarea>
      </div>
      <button type="submit" className="contact-submit-btn" disabled={loading}>
        {loading ? <span className="btn-spinner"></span> : 'Send Message ➔'}
      </button>
    </form>
  );
};

const App = () => {
  const [user, setUser] = useState(localStorage.getItem('userEmail'));
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [toasts, setToasts] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const getInitials = (email) => {
    if (!email) return '👤';
    const namePart = email.split('@')[0];
    if (namePart.length >= 2) {
      return namePart.slice(0, 2).toUpperCase();
    }
    return namePart.toUpperCase();
  };

  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'payment', 'success'
  const [paymentMethod, setPaymentMethod] = useState(''); // 'UPI', 'Cash'
  const [placedOrder, setPlacedOrder] = useState(null); // stores success order info
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [transactionId, setTransactionId] = useState('');

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    fetchMenuData();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const closeDropdown = () => setIsProfileDropdownOpen(false);
    if (isProfileDropdownOpen) {
      window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [isProfileDropdownOpen]);

  const fetchMenuData = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          categories (
            name,
            is_chinese
          )
        `)
        .order('name');

      if (error) throw error;

      // Group items by category to match the original UI structure
      const groupedMenu = data.reduce((acc, item) => {
        const catName = item.categories.name;
        const existing = acc.find(c => c.category === catName);
        const itemWithLegacyPrice = {
          ...item,
          price: item.price,
          half: item.half_price,
          full: item.full_price,
          image: item.image_url
        };

        if (existing) {
          existing.items.push(itemWithLegacyPrice);
        } else {
          acc.push({
            category: catName,
            isChinese: item.categories.is_chinese,
            items: [itemWithLegacyPrice]
          });
        }
        return acc;
      }, []);

      setMenu(groupedMenu);
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId));
  };

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_number', user)
      .order('created_at', { ascending: false });
    if (!error) setOrders(data);
  }, [user]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('userEmail');
    setUser(null);
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const addToCart = useCallback((item, type = 'normal') => {
    const cartId = `${item.id}-${type}`;
    setCart(prev => {
      const exists = prev.find(i => i.cartId === cartId);
      if (exists) {
        return prev.map(i => i.cartId === cartId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, cartId, orderType: type, quantity: 1 }];
    });
    setLastAddedItem({ cartId });
    showToast(`Added ${item.name} to cart`);
  }, [showToast]);

  const updateQuantity = useCallback((cartId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.cartId === cartId) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  }, []);

  const categories = useMemo(() => ['All', ...menu.map(item => item.category)], [menu]);

  const filteredMenu = useMemo(() => {
    return menu
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }))
      .filter(cat =>
        (activeCategory === 'All' || cat.category === activeCategory) &&
        cat.items.length > 0
      );
  }, [menu, searchTerm, activeCategory]);

  const totalAmount = useMemo(() => cart.reduce((acc, i) => {
    const price = i.orderType === 'Half' ? i.half : (i.orderType === 'Full' ? i.full : i.price);
    return acc + price * i.quantity;
  }, 0), [cart]);

  const handleCheckout = useCallback(async (method) => {
    if (cart.length === 0) return;

    if (method === 'UPI' && (!transactionId || transactionId.length !== 12)) {
      showToast('Please enter a valid 12-digit UPI Transaction ID', 'error');
      return;
    }

    setCheckoutLoading(true);

    const itemsList = cart.map(i => ({
      name: i.name,
      quantity: i.quantity,
      price: i.orderType === 'Half' ? i.half : (i.orderType === 'Full' ? i.full : i.price),
      type: i.orderType
    }));

    const orderData = {
      customer_number: user,
      items: itemsList,
      total_amount: totalAmount,
      status: 'Pending',
      payment_method: method,
      payment_status: method === 'UPI' ? 'Pending' : 'Unpaid',
      transaction_id: method === 'UPI' ? transactionId : null
    };

    // Try inserting with payment fields
    let { data, error } = await supabase.from('orders').insert([orderData]).select();

    // Fallback: If migration hasn't been run and column doesn't exist, store inside items array
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const fallbackItems = [
        ...itemsList,
        {
          is_payment_meta: true,
          payment_method: method,
          payment_status: method === 'UPI' ? 'Pending' : 'Unpaid',
          transaction_id: method === 'UPI' ? transactionId : null
        }
      ];
      const fallbackOrderData = {
        customer_number: user,
        items: fallbackItems,
        total_amount: totalAmount,
        status: 'Pending'
      };
      const res = await supabase.from('orders').insert([fallbackOrderData]).select();
      error = res.error;
      data = res.data;
    }

    setCheckoutLoading(false);

    if (!error) {
      showToast('🚀 Order placed successfully!');
      const orderInfo = (data && data[0]) ? data[0] : { id: 'Success', items: itemsList, total_amount: totalAmount, payment_method: method };
      setPlacedOrder(orderInfo);
      setCart([]);
      setCheckoutStep('success');
      fetchOrders();
    } else {
      showToast('Failed to place order: ' + error.message, 'error');
    }
  }, [cart, user, totalAmount, fetchOrders, showToast]);

  if (!user) {
    return <LoginPage onLogin={(email) => { setUser(email); fetchMenuData(); }} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className={`header glass ${scrolled ? 'scrolled' : ''}`}>
        <div className="logo animate-slide">RAMU DOSA ANJAR</div>
        <nav className="nav-links">
          <button className="nav-link-btn" onClick={() => { fetchOrders(); setIsOrdersOpen(true); }}>History</button>
          
          <div className="user-profile-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="user-profile" onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} title={user}>
              <span className="user-initials">{getInitials(user)}</span>
              <span className="user-email" title={user}>{user}</span>
            </div>
            {isProfileDropdownOpen && (
              <div className="profile-dropdown glass animate-fade">
                <div className="profile-card-info">
                  <div className="profile-card-name">{user.split('@')[0]}</div>
                  <div className="profile-card-email">{user}</div>
                </div>
                <div className="profile-dropdown-divider"></div>
                <button className="dropdown-item" onClick={() => { fetchOrders(); setIsOrdersOpen(true); setIsProfileDropdownOpen(false); }}>
                  📜 Order History
                </button>
                <button className="dropdown-item logout-btn-item" onClick={() => { handleLogout(); setIsProfileDropdownOpen(false); }}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>

          <button className="nav-link-btn" onClick={() => setIsContactOpen(true)}>Contact</button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h1 className="animate-fade">Ramu Dosa Anjar</h1>
        <p className="animate-fade">Authentic South Indian Delicacies. Fresh, Hot & Crispy.</p>

        <div className="search-container animate-fade" style={{ animationDelay: '0.2s' }}>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search for Dosa, Uttapam, Idli, Pav Bhaji..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Menu Container */}
      <main className="menu-container" id="menu">
        <div className="category-tabs">
          {categories.map(cat => (
            <div
              key={cat}
              className={`tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="menu-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton-item">
                <div className="skeleton skeleton-img"></div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-sub"></div>
              </div>
            ))}
          </div>
        ) : (
          filteredMenu.map((section, sIndex) => (
            <div key={sIndex} className="animate-fade" style={{ marginBottom: '5rem' }}>
              <h2 className="section-title">{section.category}</h2>
              <div className="menu-grid">
                {section.items.map((item) => (
                  <div key={item.id} className="menu-item">
                    <div className="item-image-container">
                      <img src={item.image} alt={item.name} className="item-image" loading="lazy" />
                    </div>
                    <div className="item-info">
                      <h3>{item.name}</h3>
                      {item.description && <p className="item-desc">{item.description}</p>}

                      <div className="item-actions">
                        {section.isChinese ? (
                          <div className="chinese-actions">
                            {/* Half portion */}
                            {(() => {
                              const halfItem = cart.find(i => i.id === item.id && i.orderType === 'Half');
                              const qty = halfItem ? halfItem.quantity : 0;
                              if (qty === 0) {
                                return (
                                  <div className="size-pill" onClick={() => addToCart(item, 'Half')}>
                                    <span className="size-label">Half</span>
                                    <span className="size-price">₹{item.half}</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="size-pill active-qty">
                                  <span className="size-label">Half</span>
                                  <div className="size-qty-controls">
                                    <button onClick={(e) => { e.stopPropagation(); updateQuantity(halfItem.cartId, -1); }}>−</button>
                                    <span>{qty}</span>
                                    <button onClick={(e) => { e.stopPropagation(); updateQuantity(halfItem.cartId, 1); }}>+</button>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Full portion */}
                            {(() => {
                              const fullItem = cart.find(i => i.id === item.id && i.orderType === 'Full');
                              const qty = fullItem ? fullItem.quantity : 0;
                              if (qty === 0) {
                                return (
                                  <div className="size-pill" onClick={() => addToCart(item, 'Full')}>
                                    <span className="size-label">Full</span>
                                    <span className="size-price">₹{item.full}</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="size-pill active-qty">
                                  <span className="size-label">Full</span>
                                  <div className="size-qty-controls">
                                    <button onClick={(e) => { e.stopPropagation(); updateQuantity(fullItem.cartId, -1); }}>−</button>
                                    <span>{qty}</span>
                                    <button onClick={(e) => { e.stopPropagation(); updateQuantity(fullItem.cartId, 1); }}>+</button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <>
                            <span className="price-tag">₹{item.price}</span>
                            <div className="action-add-btn-wrapper">
                              {(() => {
                                const cartItem = cart.find(i => i.id === item.id && i.orderType === 'normal');
                                const qty = cartItem ? cartItem.quantity : 0;
                                if (qty === 0) {
                                  return (
                                    <button className="swiggy-add-btn" onClick={() => addToCart(item, 'normal')}>
                                      ADD <span className="plus-icon">+</span>
                                    </button>
                                  );
                                }
                                return (
                                  <div className="swiggy-qty-selector">
                                    <button className="qty-btn-minus" onClick={() => updateQuantity(cartItem.cartId, -1)}>−</button>
                                    <span className="qty-value">{qty}</span>
                                    <button className="qty-btn-plus" onClick={() => updateQuantity(cartItem.cartId, 1)}>+</button>
                                  </div>
                                );
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        {!loading && filteredMenu.length === 0 && (
          <div className="empty-search">
            <p>No dishes found matching "{searchTerm}"</p>
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>
                {checkoutStep === 'cart' && 'My Order'}
                {checkoutStep === 'payment' && 'Payment Method'}
                {checkoutStep === 'success' && 'Order Confirmed!'}
              </h2>
              <button
                className="close-btn"
                onClick={() => {
                  setIsCartOpen(false);
                  if (checkoutStep === 'success') {
                    setCheckoutStep('cart');
                    setPlacedOrder(null);
                    setPaymentMethod('');
                    setTransactionId('');
                  }
                }}
              >
                ✕
              </button>
            </div>
            <div className="cart-content">
              {checkoutStep === 'cart' && (
                cart.length === 0 ? (
                  <div className="empty-cart">
                    <span style={{ fontSize: '4rem' }}>🛒</span>
                    <p>Your cart is empty.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.cartId} className="cart-item animate-fade">
                      <img src={item.image} alt={item.name} className="cart-item-img" />
                      <div className="cart-item-details">
                        <div className="cart-item-name">{item.name}</div>
                        <div className="cart-item-price">
                          {item.orderType !== 'normal' && <span className="order-tag">{item.orderType} • </span>}
                          ₹{item.orderType === 'Half' ? item.half : (item.orderType === 'Full' ? item.full : item.price)}
                        </div>
                        <div className="quantity-controls">
                          <button className="q-btn" onClick={() => updateQuantity(item.cartId, -1)}>−</button>
                          <span>{item.quantity}</span>
                          <button className="q-btn" onClick={() => updateQuantity(item.cartId, 1)}>+</button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}

              {checkoutStep === 'payment' && (
                <div className="payment-container animate-fade">
                  <div className="total-amount-badge glass">
                    <span>Amount to Pay</span>
                    <h2>₹{totalAmount}</h2>
                  </div>

                  <div className="payment-options">
                    <div
                      className={`payment-option-card glass ${paymentMethod === 'UPI' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('UPI'); setTransactionId(''); }}
                    >
                      <div className="option-header">
                        <span className="option-icon">📱</span>
                        <div className="option-text">
                          <h4>UPI (GPay / PhonePe / Paytm)</h4>
                          <p>Scan QR code & pay instantly</p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`payment-option-card glass ${paymentMethod === 'Cash' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('Cash'); setTransactionId(''); }}
                    >
                      <div className="option-header">
                        <span className="option-icon">💵</span>
                        <div className="option-text">
                          <h4>Cash at Counter</h4>
                          <p>Pay cash after your order is ready</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {paymentMethod === 'UPI' && (
                    <div className="upi-qr-container animate-slide">
                      <p className="qr-instruction">Scan to pay <strong>₹{totalAmount}</strong> using any UPI App</p>
                      <div className="qr-wrapper">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=ramudosa038@okaxis&pn=Ramu Dosa Anjar&am=${totalAmount}&cu=INR`)}`}
                          alt="UPI Payment QR Code"
                          className="upi-qr-image"
                        />
                      </div>
                      <span className="payee-vpa">UPI ID: <strong>ramudosa038@okaxis</strong></span>

                      <div className="upi-txn-group">
                        <label htmlFor="txnId">UPI Transaction ID / UTR (12 digits) *</label>
                        <input
                          type="text"
                          id="txnId"
                          placeholder="e.g. 123456789012"
                          maxLength="12"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          required
                          disabled={checkoutLoading}
                          className="upi-txn-input"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'Cash' && (
                    <div className="cash-container animate-slide">
                      <div className="cash-info-box">
                        <p>ℹ️ Place your order now, and pay <strong>₹{totalAmount}</strong> in cash at the counter once ready.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {checkoutStep === 'success' && placedOrder && (
                <div className="success-container animate-fade">
                  <div className="success-header-icon">🎉</div>
                  <h3>Order Placed!</h3>
                  <p className="success-order-id">Order ID: #{placedOrder.id}</p>

                  <div className="success-summary glass">
                    <div className="summary-title">Order Info</div>
                    <div className="summary-row">
                      <span>Method:</span>
                      <strong>{paymentMethod}</strong>
                    </div>
                    {paymentMethod === 'UPI' && (placedOrder.transaction_id || transactionId) && (
                      <div className="summary-row">
                        <span>Transaction ID:</span>
                        <strong>{placedOrder.transaction_id || transactionId}</strong>
                      </div>
                    )}
                    <div className="summary-row">
                      <span>Total:</span>
                      <strong className="text-gradient">₹{placedOrder.total_amount}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Status:</span>
                      <span className={`payment-status-tag ${paymentMethod === 'UPI' ? 'pending' : 'cash'}`}>
                        {paymentMethod === 'UPI' ? 'Pending Verification' : 'Pay Cash at Counter'}
                      </span>
                    </div>
                  </div>

                  <div className="success-instructions">
                    {paymentMethod === 'UPI' ? (
                      <p>✅ Your order is received! Please keep your UPI receipt handy. Our team will verify it and prepare your order shortly.</p>
                    ) : (
                      <p>🏃‍♂️ Your order is sent to the kitchen! Please proceed to the counter to pay <strong>₹{placedOrder.total_amount}</strong> in cash.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {checkoutStep === 'cart' && cart.length > 0 && (
              <div className="cart-footer">
                <div className="total-row">
                  <span>Total</span>
                  <span className="text-gradient">₹{totalAmount}</span>
                </div>
                <button className="checkout-btn" onClick={() => setCheckoutStep('payment')}>Proceed to Payment ➔</button>
              </div>
            )}

            {checkoutStep === 'payment' && paymentMethod && (
              <div className="cart-footer payment-footer">
                <button
                  className="back-to-cart-btn"
                  onClick={() => setCheckoutStep('cart')}
                  disabled={checkoutLoading}
                >
                  ⬅ Back
                </button>
                <button
                  className="checkout-btn pay-confirm-btn"
                  onClick={() => handleCheckout(paymentMethod)}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <span className="btn-spinner"></span>
                  ) : paymentMethod === 'UPI' ? (
                    'Confirm UPI Order ➔'
                  ) : (
                    'Confirm Cash Order ➔'
                  )}
                </button>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="cart-footer">
                <button
                  className="checkout-btn success-home-btn"
                  onClick={() => {
                    setCheckoutStep('cart');
                    setPlacedOrder(null);
                    setPaymentMethod('');
                    setTransactionId('');
                    setIsCartOpen(false);
                  }}
                >
                  Back to Menu ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders History Modal */}
      {isOrdersOpen && (
        <div className="cart-overlay" onClick={() => setIsOrdersOpen(false)}>
          <div className="cart-drawer glass" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Recent Orders</h2>
              <button className="close-btn" onClick={() => setIsOrdersOpen(false)}>✕</button>
            </div>
            <div className="cart-content">
              {orders.length === 0 ? (
                <div className="empty-cart">
                  <p>No orders yet. Time to eat!</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="order-history-card glass">
                    <div className="order-date">{new Date(order.created_at).toLocaleDateString()}</div>
                    <div className="order-status-badge">{order.status}</div>
                    <div className="order-items-list">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="order-item-mini">{it.quantity}x {it.name} ({it.type})</div>
                      ))}
                    </div>
                    <div className="order-total-mini">Total: ₹{order.total_amount}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type} animate-slide`}>
            {t.type === 'success' ? '✅' : '❌'} {t.message}
          </div>
        ))}
      </div>

      {/* Contact Drawer */}
      {isContactOpen && (
        <div className="cart-overlay" onClick={() => setIsContactOpen(false)}>
          <div className="cart-drawer glass" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Contact Us</h2>
              <button className="close-btn" onClick={() => setIsContactOpen(false)}>✕</button>
            </div>
            <div className="cart-content contact-drawer-content">
              {/* Business Info Card */}
              <div className="contact-info-card glass">
                <h3>Get in Touch</h3>
                <p>📍 Ramu Dosa Anjar, Anjar, Gujarat, India</p>
                <p>📞 Phone: +91 98765 43210</p>
                <p>✉️ Email: <a href="mailto:ramudosa038@gmail.com">ramudosa038@gmail.com</a></p>
                <p>⏰ Hours: 5:00 PM - 11:30 PM (Everyday)</p>
              </div>

              {/* Form Submission */}
              <ContactForm onSubmitSuccess={() => {
                showToast('✉️ Message sent successfully!');
                setIsContactOpen(false);
              }} showToast={showToast} />
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="bottom-cart-bar animate-slide-up" onClick={() => setIsCartOpen(true)}>
          <div className="bottom-cart-left">
            <span className="cart-bar-icon">🛒</span>
            <div className="cart-bar-details">
              {(() => {
                const lastItem = lastAddedItem || (cart.length > 0 ? cart[cart.length - 1] : null);
                const matchingCartItem = lastItem ? cart.find(i => i.cartId === lastItem.cartId) : null;
                if (matchingCartItem) {
                  return (
                    <>
                      <span className="cart-bar-qty">{matchingCartItem.quantity}x</span>
                      <span className="cart-bar-name">{matchingCartItem.name} {matchingCartItem.orderType !== 'normal' ? `(${matchingCartItem.orderType})` : ''}</span>
                    </>
                  );
                }
                return <span className="cart-bar-name">Items in cart</span>;
              })()}
            </div>
          </div>
          <div className="bottom-cart-right">
            <div className="cart-bar-total">
              <span>Total:</span>
              <strong>₹{totalAmount}</strong>
            </div>
            <button className="cart-bar-view-btn">
              View Cart ➔
            </button>
          </div>
        </div>
      )}

      <footer className="footer black-footer">
        <div className="footer-content">
          <div className="footer-column branding-col">
            <div className="footer-logo">RAMU DOSA ANJAR</div>
            <p className="footer-tagline">Authentic South Indian Delicacies. Fresh, Hot & Crispy.</p>
            <p className="copyright-text">© 2026 Ramu Dosa Anjar. All rights reserved.</p>
          </div>
          <div className="footer-column contact-col">
            <h4>Contact Us</h4>
            <p>📍 Anjar, Gujarat, India</p>
            <p>📞 Phone: <a href="tel:+919876543210">+91 98765 43210</a></p>
            <p>✉️ Email: <a href="mailto:ramudosa038@gmail.com">ramudosa038@gmail.com</a></p>
            <p>⏰ Hours: 5:00 PM - 11:30 PM</p>
          </div>
          <div className="footer-column links-col">
            <h4>Quick Links</h4>
            <div className="footer-links-grid">
              <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Menu</a>
              <a href="#" onClick={(e) => { e.preventDefault(); fetchOrders(); setIsOrdersOpen(true); }}>Order History</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setIsContactOpen(true); }}>Support Message</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
