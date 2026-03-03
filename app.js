// Handle Navbar transparent-to-solid effect on scroll
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(75, 75, 75, 0.95)';
        navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
    } else {
        navbar.style.background = 'rgba(75, 75, 75, 0.7)';
        navbar.style.boxShadow = 'none';
    }
});
