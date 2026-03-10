// Product Data Management
const PRODUCTS_KEY = 'marino_products';
const ITEMS_PER_PAGE = 24;
let productsData = [];
let currentPage = 1;
let currentSearch = '';

// Filter States
let selectedCategories = new Set();
let selectedProviders = new Set();
let selectedColors = new Set();

// Ensure advanced mock data is loaded by clearing old simple structure once
if (!localStorage.getItem('marino_v4_real_products_atenneas')) {
    localStorage.removeItem(PRODUCTS_KEY);
    localStorage.setItem('marino_v4_real_products_atenneas', 'true');
}
if (!localStorage.getItem('marino_v5_casermeiro_maropor')) {
    localStorage.removeItem(PRODUCTS_KEY);
    localStorage.setItem('marino_v5_casermeiro_maropor', 'true');
}

// Check if admin to show controls
const isAdminUser = localStorage.getItem('isAdmin') === 'true';

// Initial Seeding to handle real supplier products
function initializeProducts() {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    if (!stored) {
        productsData = [
            // DURLOCK
            { id: 1, name: "Placa Durlock Estándar 12.5mm", desc: "Placa de yeso para cielorrasos y revestimientos interiores en ambientes secos.", category: "Placa de Yeso", provider: "Durlock", color: "Gris", size: "1.20x2.40m", img: "proveedores/durlock.png" },
            { id: 2, name: "Placa Durlock Resistente a la Humedad", desc: "Placa verde ideal para baños, cocinas y ambientes con grado de humedad.", category: "Placa de Yeso", provider: "Durlock", color: "Verde", size: "1.20x2.40m", img: "proveedores/durlock.png" },
            { id: 3, name: "Placa Durlock Resistente al Fuego", desc: "Placa roja con aditivos especiales para mayor resistencia al fuego.", category: "Placa de Yeso", provider: "Durlock", color: "Rojo", size: "1.20x2.40m", img: "proveedores/durlock.png" },
            { id: 4, name: "Masilla Durlock Lista Para Usar", desc: "Masilla de secado rápido especial para tomado de juntas y recubrimiento de fijaciones.", category: "Masilla", provider: "Durlock", color: "Blanco", size: "32kg", img: "proveedores/durlock.png" },

            // JMA
            { id: 5, name: "Montante 69mm JMA", desc: "Perfil de acero galvanizado estructural para tabiques y cielorrasos.", category: "Perfil de Acero", provider: "JMA", color: "Metálico", size: "2.60m", img: "proveedores/JMA.png" },
            { id: 6, name: "Solera 70mm JMA", desc: "Perfil guía inferior y superior de acero galvanizado para construcción en seco.", category: "Perfil de Acero", provider: "JMA", color: "Metálico", size: "2.60m", img: "proveedores/JMA.png" },
            { id: 7, name: "Perfil Omega JMA", desc: "Perfil clavadera para cielorrasos aplicados y revestimientos.", category: "Perfil de Acero", provider: "JMA", color: "Metálico", size: "2.60m", img: "proveedores/JMA.png" },
            { id: 8, name: "Cantonera JMA", desc: "Perfil para la protección de esquinas en tabiques de placas de yeso.", category: "Perfil de Acero", provider: "JMA", color: "Metálico", size: "2.60m", img: "proveedores/JMA.png" },

            // SUPERBOARD
            { id: 9, name: "Placa Superboard Estándar 6mm", desc: "Placa de fibrocemento resistente a la intemperie y la humedad. Ideal para exteriores.", category: "Placa de Fibrocemento", provider: "Superboard", color: "Gris", size: "1.22x2.44m", img: "proveedores/superboard.png" },
            { id: 10, name: "Placa Superboard Madera Siding", desc: "Placa de fibrocemento texturada símil madera para fachadas y revestimientos decorativos exteriores.", category: "Placa de Fibrocemento", provider: "Superboard", color: "Madera Claro", size: "0.20x3.60m", img: "proveedores/superboard.png" },
            { id: 11, name: "Placa Superboard Entrepiso 15mm", desc: "Placa de alta densidad para bases de pisos y entrepisos secos estructurales.", category: "Placa de Fibrocemento", provider: "Superboard", color: "Gris", size: "1.22x2.44m", img: "proveedores/superboard.png" },

            // AISPLAC
            { id: 12, name: "Panel PVC Cielorraso Blanco", desc: "Revestimiento de PVC para cielorrasos. Libre de mantenimiento, lavable e ignífugo.", category: "Revestimiento PVC", provider: "Aisplac", color: "Blanco", size: "Contamos con todos los largos en 20cm", img: "proveedores/aisplac.png" },
            { id: 13, name: "Panel PVC Cielorraso Símil Madera", desc: "Revestimiento de PVC con textura y visual de madera. Aporta calidez y no requiere pintura.", category: "Revestimiento PVC", provider: "Aisplac", color: "Madera Oscuro", size: "Contamos con todos los largos en 20cm", img: "proveedores/aisplac.png" },
            { id: 14, name: "Zócalo Sanitario PVC", desc: "Zócalo sanitario de PVC ideal para industrias, comercios gastronómicos y hospitales.", category: "Revestimiento PVC", provider: "Aisplac", color: "Blanco", size: "Contamos con todos los largos", img: "proveedores/aisplac.png" },

            // POXIMIX
            { id: 15, name: "Poximix 15 Minutos Interior", desc: "Material base yeso ideal para rellenar, remendar y fijar en interiores.", category: "Masilla", provider: "Poximix", color: "Blanco", size: "5kg", img: "proveedores/poximix.png" },
            { id: 16, name: "Poximix 15 Minutos Exterior", desc: "Enduido resistente para reparar grietas, agujeros y desniveles en frentes y muros exteriores.", category: "Masilla", provider: "Poximix", color: "Blanco", size: "5kg", img: "proveedores/poximix.png" },

            // TELPLAST
            { id: 17, name: "Sellador Acrílico Pintable Telplast", desc: "Sellador elástico y pintable ideal para relleno de juntas de placas de yeso.", category: "Selladores", provider: "Telplast", color: "Blanco", size: "Cartucho 300ml", img: "proveedores/telplast.png" },
            { id: 18, name: "Adhesivo para Revestimientos Telplast", desc: "Pegamento extra fuerte para aplicaciones decorativas, zócalos de EPS y perfiles.", category: "Pegamentos", provider: "Telplast", color: "Transparente", size: "Cartucho", img: "proveedores/telplast.png" },

            // ATENNEAS
            { id: 19, name: "Zócalo EPS Blanco Atenneas", desc: "Zócalos de poliestireno expandido, resistentes a la humedad, listos para colocar.", category: "Terminaciones", provider: "Atenneas", color: "Blanco", size: "2.50m (Tiras)", img: "proveedores/atenneas.png" },
            { id: 20, name: "Moldura de Transición Atenneas", desc: "Perfil revestido de terminación de piso o cambio de nivel de primera calidad.", category: "Terminaciones", provider: "Atenneas", color: "Madera Claro", size: "2.40m", img: "proveedores/atenneas.png" },
            { id: 24, name: "Moldura Interior Línea AT Atenneas", desc: "Molduras elaboradas para ambientes interiores de gran terminación estética.", category: "Molduras Interiores", provider: "Atenneas", color: "Blanco", size: "2.40m", img: "proveedores/atenneas.png" },
            { id: 25, name: "Moldura Exterior Wing Decó Atenneas", desc: "Perfiles revestidos especialmente aplicados a fachadas exteriores de alta resistencia.", category: "Molduras Exteriores", provider: "Atenneas", color: "Natural", size: "2.40m", img: "proveedores/atenneas.png" },
            { id: 26, name: "Zócalo Foliado Atenneas", desc: "Zócalo foliado con símil madera para perfecta transición piso-pared.", category: "Zócalo", provider: "Atenneas", color: "Madera Oscuro", size: "2.40m", img: "proveedores/atenneas.png" },
            { id: 27, name: "Moldura Prepintada Atenneas", desc: "Moldura lista para pintura final, optimizando tiempos de colocación.", category: "Terminaciones", provider: "Atenneas", color: "Blanco", size: "2.40m", img: "proveedores/atenneas.png" },

            // IPROA (Cortinas a Medida)
            { id: 21, name: "Cortinas Roller IPROA", desc: "Cortina tipo Roller moderna de alta durabilidad.\n\nIMPORTANTE: A medida. Comuníquese por WhatsApp para medidas de ventana y recibir presupuesto al instante.", category: "Cortinas a Medida", provider: "Iproa", color: "A elección", size: "A medida", img: "proveedores/iproa.png" },
            { id: 22, name: "Cortinas Verticales IPROA", desc: "Cortinado en bandas verticales que permite un control visual y térmico excepcional.\n\nIMPORTANTE: A medida. Consulte con nuestro equipo por opciones de color y tamaño.", category: "Cortinas a Medida", provider: "Iproa", color: "A elección", size: "A medida", img: "proveedores/iproa.png" },
            { id: 23, name: "Cortinas Venecianas IPROA", desc: "Sistema clásico de láminas de aluminio resistente. Control preciso de la luz exterior.\n\nIMPORTANTE: Fabricadas a medida según requerimiento.", category: "Cortinas a Medida", provider: "Iproa", color: "A elección", size: "A medida", img: "proveedores/iproa.png" },

            // CASERMEIRO
            { id: 28, name: "Tornillo T2 Punta Aguja Casermeiro", desc: "Tornillo autoperforante punta aguja para fijación de placas de yeso a perfiles de acero.", category: "Fijaciones", provider: "Casermeiro", color: "Negro", size: "6x1 1/4", img: "proveedores/casemiro.png" },
            { id: 29, name: "Tornillo T1 Punta Mecha Casermeiro", desc: "Tornillo punta mecha cabeza tanque para unión de perfilería metálica.", category: "Fijaciones", provider: "Casermeiro", color: "Zincado", size: "8x1/2", img: "proveedores/casemiro.png" },

            // MAROPOR
            { id: 30, name: "Zócalo EPS Maropor", desc: "Zócalo de poliestireno expandido, alta resistencia a la humedad y de fácil instalación.", category: "Zócalo", provider: "Maropor", color: "Blanco", size: "2.50m", img: "proveedores/maropor.png" },
            { id: 31, name: "Placa Cielorraso Desmontable EPS Maropor", desc: "Placas para cielorrasos desmontables, excelente aislación térmica y acústica.", category: "Cielorrasos", provider: "Maropor", color: "Blanco", size: "0.60x0.60m", img: "proveedores/maropor.png" },
            { id: 32, name: "Panel PVC Maropor", desc: "Revestimiento de PVC resistente al agua, ignífugo, ideal para techos y paredes.", category: "Revestimiento PVC", provider: "Maropor", color: "Blanco", size: "A medida", img: "proveedores/maropor.png" },
            { id: 33, name: "Moldura EPS Maropor", desc: "Moldura decorativa de fácil colocación para terminaciones de techos.", category: "Molduras Interiores", provider: "Maropor", color: "Blanco", size: "2.00m", img: "proveedores/maropor.png" }
        ];
        saveProducts();
    } else {
        productsData = JSON.parse(stored);
    }
}

function saveProducts() {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(productsData));
}

// Function to render products
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const stats = document.getElementById('stats-info');
    grid.innerHTML = '';

    // Apply Filters
    let filtered = productsData;

    // 1. Text Search
    if (currentSearch.trim() !== '') {
        const term = currentSearch.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.desc.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term) ||
            p.provider.toLowerCase().includes(term)
        );
    }

    // 2. Categories Filter
    if (selectedCategories.size > 0) {
        filtered = filtered.filter(p => selectedCategories.has(p.category));
    }

    // 3. Providers Filter
    if (selectedProviders.size > 0) {
        filtered = filtered.filter(p => selectedProviders.has(p.provider));
    }

    // 4. Colors Filter
    if (selectedColors.size > 0) {
        filtered = filtered.filter(p => selectedColors.has(p.color));
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginated = filtered.slice(start, end);

    // Render
    if (paginated.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 1.2rem; padding: 2rem;">No se encontraron productos en el catálogo que coincidan con la búsqueda.</p>';
    } else {
        paginated.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card glass reveal delay-2';
            card.innerHTML = `
                <a href="producto-detalle.html?id=${p.id}" class="product-link" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1;">
                    <img src="${p.img}" alt="${p.name}" class="product-img" loading="lazy">
                    <div class="product-info">
                        <span style="font-size: 0.8rem; color: var(--accent-color); font-weight: 600; text-transform: uppercase;">${p.provider}</span>
                        <h3 class="product-title" style="margin-top: 0.2rem; font-size: 1.1rem;">${p.name}</h3>
                        <p class="product-desc" style="margin-bottom: 0.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${p.desc}</p>
                        <div style="margin-top: auto; display: flex; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                            <span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.6rem; border-radius: 4px;">${p.color}</span>
                        </div>
                    </div>
                </a>
                
                ${!isAdminUser ? `
                <div style="padding: 0 1.5rem 1.5rem 1.5rem;">
                    <button class="btn btn-secondary" style="width: 100%; border-radius: 8px; padding: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin: 0;" onclick="event.preventDefault(); window.addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', '${p.img}', '${p.category}')">
                        <i class="fas fa-cart-plus" style="transform: translateY(1px);"></i> Sumar al Carrito
                    </button>
                </div>
                ` : ''}

                ${isAdminUser ? `
                <div class="admin-controls" style="display: flex; gap: 0.5rem; padding: 0 1.5rem 1.5rem 1.5rem;">
                    <button class="btn btn-secondary" onclick="event.preventDefault(); editProduct(${p.id})" style="flex: 1; padding: 0.5rem;">
                       <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="event.preventDefault(); deleteProduct(${p.id})" style="flex: 1; padding: 0.5rem;">
                       <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            `;
            grid.appendChild(card);
        });
    }

    stats.innerText = `Mostrando ${paginated.length} de ${filtered.length} productos (Página ${currentPage} de ${totalPages || 1})`;
    renderPagination(totalPages);

    // Re-initialize animations for new elements
    if (typeof window.initAnimations === 'function') {
        setTimeout(window.initAnimations, 50);
    }
}

function renderPagination(totalPages) {
    const controls = document.getElementById('pagination-controls');
    controls.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev Button
    const prev = document.createElement('button');
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled = currentPage === 1;
    prev.onclick = () => { currentPage--; renderProducts(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    controls.appendChild(prev);

    // Page indicator
    const indicator = document.createElement('span');
    indicator.style.color = 'var(--text-secondary)';
    indicator.innerText = `${currentPage} / ${totalPages}`;
    controls.appendChild(indicator);

    // Next Button
    const next = document.createElement('button');
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled = currentPage === totalPages;
    next.onclick = () => { currentPage++; renderProducts(); window.scrollTo({ top: 400, behavior: 'smooth' }); };
    controls.appendChild(next);
}

// Admin Functions
window.editProduct = function (id) {
    const p = productsData.find(x => x.id === id);
    if (!p) return;

    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-category').value = p.category || '';
    document.getElementById('p-provider').value = p.provider || '';
    document.getElementById('p-color').value = p.color || '';
    document.getElementById('p-size').value = p.size || '';
    document.getElementById('p-desc').value = p.desc;
    document.getElementById('p-img').value = p.img || '';

    document.getElementById('modal-product-title').innerText = 'Editar Producto';
    document.getElementById('addModal').style.display = 'flex';
}

window.deleteProduct = function (id) {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
        productsData = productsData.filter(p => p.id !== id);
        saveProducts();
        renderProducts();
        renderFilters(); // Re-render filters in case a category/provider gets empty
    }
}

// Render dynamic filters based on current productsData
function renderFilters() {
    const catsContainer = document.getElementById('filter-categories');
    const provsContainer = document.getElementById('filter-providers');
    const colorsContainer = document.getElementById('filter-colors');

    if (!catsContainer || !provsContainer || !colorsContainer) return; // Exit if not in catalog page

    // Get unique sorted lists
    const uniqueCats = [...new Set(productsData.map(p => p.category))].sort();
    const uniqueProvs = [...new Set(productsData.map(p => p.provider))].sort();
    const uniqueColors = [...new Set(productsData.map(p => p.color))].sort();

    // Helper to generate checkboxes
    const generateCheckboxes = (container, items, selectedSet, filterType) => {
        container.innerHTML = '';
        items.forEach(item => {
            const label = document.createElement('label');
            label.className = 'filter-checkbox';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.5rem';
            label.style.cursor = 'pointer';
            label.style.marginBottom = '0.4rem';
            label.style.fontSize = '0.95rem';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item;
            checkbox.checked = selectedSet.has(item);

            // Update filter on change
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedSet.add(item);
                } else {
                    selectedSet.delete(item);
                }
                currentPage = 1;
                renderProducts();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(item));
            container.appendChild(label);
        });
    };

    generateCheckboxes(catsContainer, uniqueCats, selectedCategories, 'category');
    generateCheckboxes(provsContainer, uniqueProvs, selectedProviders, 'provider');
    generateCheckboxes(colorsContainer, uniqueColors, selectedColors, 'color');
}

// Clear all filters
function clearFilters() {
    selectedCategories.clear();
    selectedProviders.clear();
    selectedColors.clear();
    document.getElementById('search-input').value = '';
    currentSearch = '';
    currentPage = 1;
    renderFilters(); // Reset visual checkboxes
    renderProducts();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
    renderFilters();
    renderProducts();

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const btnAdd = document.getElementById('btn-add-product');
    const modal = document.getElementById('addModal');
    const btnCloseModal = document.getElementById('close-modal');
    const addForm = document.getElementById('add-product-form');

    // Admin display
    if (isAdminUser && btnAdd) {
        btnAdd.style.display = 'inline-block';
    }

    // Search
    let timeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            renderProducts();
        }, 300); // 300ms debounce
    });

    // Modal behavior
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            document.getElementById('p-id').value = '';
            document.getElementById('modal-product-title').innerText = 'Añadir Nuevo Producto';
            if (addForm) addForm.reset();
            modal.style.display = 'flex';
        });
        btnCloseModal.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Clear filters behavior
    const btnClearFilters = document.getElementById('btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', clearFilters);
    }

    // Add/Edit Product
    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = document.getElementById('p-id').value;
            const name = document.getElementById('p-name').value;
            const category = document.getElementById('p-category').value;
            const provider = document.getElementById('p-provider').value;
            const color = document.getElementById('p-color').value;
            const size = document.getElementById('p-size').value;
            const desc = document.getElementById('p-desc').value;
            let img = document.getElementById('p-img').value;

            if (!img) {
                img = `https://picsum.photos/seed/${Date.now()}/400/300`;
            }

            if (editId) {
                // Edit existing
                const idx = productsData.findIndex(p => p.id == editId);
                if (idx !== -1) {
                    productsData[idx].name = name;
                    productsData[idx].category = category;
                    productsData[idx].provider = provider;
                    productsData[idx].color = color;
                    productsData[idx].size = size;
                    productsData[idx].desc = desc;
                    productsData[idx].img = img;
                }
            } else {
                // Add new
                const newId = productsData.length > 0 ? Math.max(...productsData.map(p => p.id)) + 1 : 1;
                productsData.unshift({
                    id: newId,
                    name,
                    desc,
                    category: category,
                    provider: provider,
                    color: color,
                    size: size,
                    img
                });
                currentPage = 1;
            }

            saveProducts();
            modal.style.display = 'none';
            addForm.reset();
            renderFilters();
            renderProducts();
        });
    }
});
