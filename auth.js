// ═══════════════════════════════════════════════════════════════════
// auth.js — Autenticación con Firebase Auth SDK (Google Sign-In)
// Reemplaza el sistema anterior basado en localStorage + JWT manual.
// ═══════════════════════════════════════════════════════════════════
import { auth, googleProvider } from './firebase-config.js';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// ─── Correos autorizados como administradores ─────────────────────
const ADMIN_EMAILS = [
    'decoracionesmar.dm@gmail.com',
    'matiasschvabauer@gmail.com'
];

// ─── Helpers globales (accesibles desde otros scripts) ────────────
window.getCurrentUser = () => auth.currentUser;
window.isAdminUser = () => {
    const user = auth.currentUser;
    return user ? ADMIN_EMAILS.includes(user.email) : false;
};

// ─── Login con Google (llamado desde login.html) ──────────────────
window.loginWithGoogle = async function () {
    const btn = document.getElementById('google-login-btn');
    const errEl = document.getElementById('login-error');
    if (btn) { btn.disabled = true; btn.textContent = 'Conectando...'; }
    if (errEl) errEl.style.display = 'none';

    try {
        await signInWithPopup(auth, googleProvider);
        // onAuthStateChanged se encarga del resto — redirige automáticamente
    } catch (err) {
        console.error('Login error:', err);
        if (errEl) {
            errEl.textContent = 'Error al iniciar sesión. Intentá nuevamente.';
            errEl.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Continuar con Google'; }
    }
};

// ─── Logout ───────────────────────────────────────────────────────
window.logoutUser = async function () {
    await signOut(auth);
    window.location.reload();
};

// ─── Observer: reacciona a cambios de sesión en tiempo real ───────
onAuthStateChanged(auth, (user) => {
    // Actualizar navbar
    const navLoginIcon = document.getElementById('nav-login');
    if (!navLoginIcon) return;

    if (user) {
        const isAdmin = ADMIN_EMAILS.includes(user.email);

        if (isAdmin) {
            navLoginIcon.innerHTML = `<span style="font-size:0.9rem;font-family:Outfit,sans-serif;">Cerrar (Admin)</span> <i class="fas fa-sign-out-alt"></i>`;
            navLoginIcon.style.color = 'var(--accent-color)';
        } else {
            navLoginIcon.innerHTML = `<span style="font-size:0.9rem;font-family:Outfit,sans-serif;">Cerrar Sesión</span> <i class="fas fa-sign-out-alt"></i>`;
            navLoginIcon.style.color = 'var(--danger-color)';
        }

        navLoginIcon.href = '#';
        navLoginIcon.title = 'Cerrar Sesión';
        navLoginIcon.onclick = (e) => { e.preventDefault(); window.logoutUser(); };

        // Si estamos en la página de login y ya hay sesión → redirigir
        if (window.location.pathname.includes('login')) {
            const isMobile = window.location.pathname.includes('m_login');
            window.location.href = isMobile ? 'm_index.html' : 'index.html';
        }

        // Disparar evento para que otros scripts (products.js, etc.) puedan reaccionar
        window.dispatchEvent(new CustomEvent('authReady', { detail: { user, isAdmin } }));

    } else {
        // Sin sesión: resetear navbar al estado de login
        navLoginIcon.innerHTML = `<i class="fas fa-lock"></i>`;
        navLoginIcon.style.color = '';
        navLoginIcon.href = window.location.pathname.includes('m_') ? 'm_login.html' : 'login.html';
        navLoginIcon.onclick = null;

        window.dispatchEvent(new CustomEvent('authReady', { detail: { user: null, isAdmin: false } }));
    }
});
