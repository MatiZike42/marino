// Cart Logic
const CART_KEY = 'marino_cart';
const WA_NUMBER = '5493404505350'; // Reemplazar despues si es distinto
const EMAIL = 'decoracionesmar.dm@gmail.com';
let cart = [];

function loadCart() {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) {
        cart = JSON.parse(stored);
    }
}

function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartIcon();
    renderCartItems();
}

window.addToCart = function (id, name, img, priceOrDesc = '', qty = 1) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ id, name, img, desc: priceOrDesc, qty });
    }
    saveCart();

    // Feedback visual
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.style.transform = 'scale(1.5)';
        setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }

    // Optional: show a mini toast
    const qtyLabel = qty > 1 ? ` (x${qty})` : '';
    showCartToast(`${name}${qtyLabel} ha sido agregado`);
}

window.removeFromCart = function (id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
}

window.updateQty = function (id, delta) {
    const item = cart.find(x => x.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
        }
    }
}

function updateCartIcon() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const total = cart.reduce((acc, obj) => acc + obj.qty, 0);
        badge.innerText = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    container.innerHTML = '';
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 2rem 0;">El carrito de presupuesto está vacío.</p>';
        return;
    }

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-qty">
                    <button onclick="updateQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="updateQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}

function getCheckoutText() {
    if (cart.length === 0) return '';
    let text = 'Hola, me gustaría solicitar un presupuesto por los siguientes artículos de su catálogo:\n\n';
    cart.forEach(item => {
        text += `- ${item.qty}x ${item.name}\n`;
    });
    text += '\n¡Muchas gracias!';
    return text;
}

window.checkoutWhatsApp = function () {
    if (cart.length === 0) {
        alert("El carrito está vacío");
        return;
    }
    const text = encodeURIComponent(getCheckoutText());
    window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, '_blank');
}

window.checkoutGmail = function () {
    if (cart.length === 0) {
        alert("El carrito está vacío");
        return;
    }
    const subject = encodeURIComponent('Solicitud de Presupuesto - Catálogo Web');
    const body = encodeURIComponent(getCheckoutText());
    let mailtoUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${subject}&body=${body}`;

    // Fallback to standard mailto if on mobile or prefer native
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        mailtoUrl = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
    }

    window.open(mailtoUrl, '_blank');
}

function showCartToast(msg) {
    // Small delay to ensure modules like app.js are initialized
    requestAnimationFrame(() => {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, 'success');
        } else {
            console.log("Cart Toast:", msg);
        }
    });
}

window.openCart = function() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.style.display = 'flex';
        // Hide notifications when opening cart as requested
        if (typeof window.hideAllToasts === 'function') {
            window.hideAllToasts();
        }
    }
};

window.closeCart = function() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Inject UI on load
document.addEventListener('DOMContentLoaded', () => {
    loadCart();

    // Inject Styles for Cart
    const style = document.createElement('style');
    style.innerHTML = `
        /* Floating Cart Button */
        #floating-cart-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: var(--accent-color);
            color: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(251, 211, 65, 0.4);
            z-index: 1000;
            transition: transform 0.3s ease;
        }
        #floating-cart-btn:hover {
            transform: scale(1.1);
        }
        #cart-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background-color: #ef4444;
            color: white;
            font-size: 0.8rem;
            font-weight: bold;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        /* Cart Modal */
        #cartModal {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 2000;
            justify-content: flex-end; /* Slide from right */
        }
        .cart-content {
            background: var(--bg-color);
            width: 100%;
            max-width: 400px;
            height: 100%;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            border-left: 1px solid var(--glass-border);
            animation: slideInRight 0.3s forwards;
        }
        @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        .cart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .close-cart {
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-secondary);
        }
        
        #cart-items-container {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding-right: 0.5rem;
        }
        
        .cart-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: rgba(255,255,255,0.02);
            padding: 0.8rem;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .cart-item img {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
        }
        .cart-item-info {
            flex: 1;
        }
        .cart-item-info h4 {
            font-size: 0.95rem;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
        .cart-item-qty {
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }
        .cart-item-qty button {
            background: rgba(255,255,255,0.1);
            border: none; color: white;
            width: 24px; height: 24px;
            border-radius: 4px; cursor: pointer;
        }
        .cart-item-qty button:hover { background: var(--accent-color); color: black; }
        .cart-item-remove {
            background: transparent;
            border: none;
            color: #ef4444;
            cursor: pointer;
            padding: 0.5rem;
        }
        
        .cart-footer {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }
        
    `;
    document.head.appendChild(style);

    // Inject DOM
    const cartHTML = `
        <!-- Floating Button -->
        <div id="floating-cart-btn" onclick="window.openCart()">
            <i class="fas fa-shopping-cart"></i>
            <span id="cart-badge" style="display:none;">0</span>
        </div>
        
        <!-- Cart Modal -->
        <div id="cartModal" onclick="if(event.target === this) window.closeCart()">
            <div class="cart-content">
                <div class="cart-header">
                    <h3 style="margin:0; color:var(--accent-color);"><i class="fas fa-list"></i> Mi Presupuesto</h3>
                    <span class="close-cart" onclick="window.closeCart()">&times;</span>
                </div>
                
                <div id="cart-items-container">
                    <!-- Items -->
                </div>
                
                <div class="cart-footer">
                    <button class="btn btn-primary" onclick="checkoutWhatsApp()" style="width:100%; border-radius:8px; display:flex; justify-content:center; align-items:center; gap:0.5rem; padding: 0.8rem; margin: 0;">
                        <i class="fab fa-whatsapp" style="font-size:1.2rem; transform: translateY(1px);"></i> Pedir por WhatsApp
                    </button>
                    <button class="btn btn-secondary" onclick="checkoutGmail()" style="width:100%; border-radius:8px; display:flex; justify-content:center; align-items:center; gap:0.5rem; padding: 0.8rem; margin: 0; background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border);">
                        <i class="fab fa-google" style="font-size:1.2rem; transform: translateY(1px);"></i> Pedir por Gmail
                    </button>
                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = cartHTML;
    document.body.appendChild(wrapper);

    updateCartIcon();
    renderCartItems();
});
