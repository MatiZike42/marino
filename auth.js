// Authentication logic shared across pages
document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const navLoginIcon = document.getElementById('nav-login');

    if (navLoginIcon) {
        if (isAdmin) {
            navLoginIcon.innerHTML = '<span style="font-size: 0.9rem; font-family: Outfit, sans-serif;">Cerrar Sesión</span> <i class="fas fa-sign-out-alt"></i>';
            navLoginIcon.href = '#';
            navLoginIcon.title = 'Cerrar Sesión';
            navLoginIcon.style.color = 'var(--danger-color)';
            navLoginIcon.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('isAdmin');
                window.location.reload();
            });
        }
    }
});
