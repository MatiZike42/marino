// Toast Notification System
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-closing');
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
};

// Copy to Clipboard Utility
window.copyToClipboard = function(text, element = null) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado: ' + text, 'success');
        if (element) {
            const originalHTML = element.innerHTML;
            element.innerHTML = '<i class="fas fa-check" style="font-size: 2rem;"></i><h4>Copiado!</h4><p>' + text + '</p>';
            setTimeout(() => {
                element.innerHTML = originalHTML;
            }, 2000);
        }
    }).catch(err => {
        console.error('Error al copiar:', err);
        showToast('Error al copiar al portapapeles', 'error');
    });
};

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

// Animation Observer
window.initAnimations = function () {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal:not(.active)');
    revealElements.forEach(el => observer.observe(el));
};

document.addEventListener('DOMContentLoaded', () => {
    window.initAnimations();

    // Auto-fill user data if logged in
    const consultaForm = document.getElementById('consulta-form');
    if (consultaForm) {
        
        const storedName = localStorage.getItem('userName');
        const storedEmail = localStorage.getItem('userEmail');
        
        if (storedName && document.getElementById('nombre')) {
            document.getElementById('nombre').value = storedName;
        }
        if (storedEmail && document.getElementById('email')) {
            document.getElementById('email').value = storedEmail;
        }

        consultaForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = consultaForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            // UI Loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Procesando...';
            
            const nombre = document.getElementById('nombre').value;
            const telefono = document.getElementById('telefono').value;
            const localidad = document.getElementById('localidad').value;
            const email = document.getElementById('email').value;
            const mensaje = document.getElementById('mensaje').value;
            const fileInput = document.getElementById('adjunto');
            
            const GAS_URL = "https://script.google.com/macros/s/AKfycbzO6cIkWhCij1jRUVdoztY5hVdOLja-xXinqFmk9SQ4OkWwGCvwlnYmWKAZqZ3yIBFs/exec";
            
            let requestData = {
                tipo: "Consulta",
                nombre: nombre,
                telefono: telefono,
                localidad: localidad,
                email: email,
                mensaje: mensaje
            };

            // Process File to Base64
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.readAsDataURL(file);
                
                reader.onload = async function() {
                    const base64 = reader.result.split(',')[1];
                    requestData.file = base64;
                    requestData.filename = file.name;
                    requestData.mimeType = file.type;
                    
                    sendToScript(requestData);
                };
                reader.onerror = function() {
                    showToast('Error al leer el archivo. Intente enviar su consulta sin adjunto o intente de nuevo.', 'error');
                    resetFormUI();
                };
            } else {
                // No file attached
                sendToScript(requestData);
            }

            async function sendToScript(data) {
                try {
                    const response = await fetch(GAS_URL, {
                        method: "POST",
                        body: JSON.stringify(data) // GAS works best with plain text JSON body content for simple configs
                    });
                    
                    const result = await response.json();
                    
                    if(result.status === "success") {
                        submitBtn.style.backgroundColor = "#25d366"; // WhatsApp Green
                        submitBtn.innerHTML = '<i class="fas fa-check" style="margin-right: 8px;"></i> Consulta Enviada!';
                        consultaForm.reset();
                        
                        setTimeout(() => {
                            resetFormUI();
                        }, 5000);
                    } else {
                        throw new Error("Server response error");
                    }
                    
                } catch (error) {
                    console.error('Error al enviar:', error);
                    showToast("Ocurrió un error al enviar la consulta. Por favor, intente más tarde.", 'error');
                    resetFormUI();
                }
            }

            function resetFormUI() {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                submitBtn.style.backgroundColor = "var(--accent-color)";
            }
        });
    }
});
