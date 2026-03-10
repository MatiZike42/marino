// Authentication logic shared across pages

// Function to decode JWT visually (since we do this frontend-only)
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Global callback for Google Login
window.handleGoogleLogin = function(response) {
    const payload = parseJwt(response.credential);
    
    // Store basic user info
    localStorage.setItem('userEmail', payload.email);
    localStorage.setItem('userName', payload.name);
    
    // Admin check
    const adminEmails = [
        'decoracionesmar.dm@gmail.com',
        'matiasschvabauer@gmail.com'
    ];
    
    if (adminEmails.includes(payload.email)) {
        localStorage.setItem('isAdmin', 'true');
    } else {
        localStorage.removeItem('isAdmin'); // just a normal user
    }
    
    // Redirect to index
    window.location.href = 'index.html';
};

document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const userEmail = localStorage.getItem('userEmail');
    const navLoginIcon = document.getElementById('nav-login');

    if (navLoginIcon && userEmail) {
        // If logged in (admin or regular user)
        let label = isAdmin ? 'Panel Admin' : 'Cerrar Sesión';
        let icon = isAdmin ? 'fa-user-cog' : 'fa-sign-out-alt';
        let color = isAdmin ? 'var(--accent-color)' : 'var(--danger-color)';
        
        navLoginIcon.innerHTML = `<span style="font-size: 0.9rem; font-family: Outfit, sans-serif;">${label}</span> <i class="fas ${icon}"></i>`;
        
        if (isAdmin && window.location.pathname.indexOf('admin.html') === -1) {
             // Admin clicking icon usually goes to an admin panel, for now let's just make it a logout for simplicity if they click it directly, or redirect to a dashboard if you had one.
             // We'll keep it as a logout to allow easy account switching.
             navLoginIcon.innerHTML = '<span style="font-size: 0.9rem; font-family: Outfit, sans-serif;">Cerrar (Admin)</span> <i class="fas fa-sign-out-alt"></i>';
        }

        navLoginIcon.href = '#';
        navLoginIcon.title = 'Cerrar Sesión';
        navLoginIcon.style.color = color;
        
        navLoginIcon.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            window.location.reload();
        });
    }
});
