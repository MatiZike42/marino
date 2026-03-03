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
if (!localStorage.getItem('marino_v2_migrated')) {
    localStorage.removeItem(PRODUCTS_KEY);
    localStorage.setItem('marino_v2_migrated', 'true');
}

// Check if admin to show controls
const isAdminUser = localStorage.getItem('isAdmin') === 'true';

// Initial Seeding to handle 1000+ products
function initializeProducts() {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    if (!stored) {
        productsData = [];
        const categories = ["Placa de Yeso", "Perfil de Acero", "Revestimiento PVC", "Pintura Interior", "Masilla", "Cinta", "Tornillos", "Aislante Térmico", "Cielo Raso Desmontable"];
        const providers = ["Durlock", "Barbieri", "Isover", "Placo", "Knauf", "Alba", "Sika", "Brevant"];
        const colors = ["Blanco", "Gris", "Negro", "Natural", "Madera Claro", "Madera Oscuro", "Metálico"];
        const sizes = ["1.20x2.40m", "1.22x2.44m", "3m", "2.60m", "5kg", "10kg", "30kg", "Standard"];

        for (let i = 1; i <= 1050; i++) {
            const cat = categories[Math.floor(Math.random() * categories.length)];
            const prov = providers[Math.floor(Math.random() * providers.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = sizes[Math.floor(Math.random() * sizes.length)];

            productsData.push({
                id: i,
                name: `${cat} ${prov} Modelo ${i}`,
                desc: `Material de alta calidad para construcción en seco. Ideal para acabados profesionales. Resistencia y durabilidad garantizada instalando con accesorios originales.`,
                category: cat,
                provider: prov,
                color: color,
                size: size,
                img: `https://picsum.photos/seed/${i + 1000}/400/300`
            });
        }
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
            card.className = 'product-card glass';
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
                ${isAdminUser ? `
                <div class="admin-controls" style="display: block; padding: 0 1.5rem 1.5rem 1.5rem;">
                    <button class="btn btn-danger" onclick="deleteProduct(${p.id})" style="width: 100%;">
                       <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>` : ''}
            `;
            grid.appendChild(card);
        });
    }

    stats.innerText = `Mostrando ${paginated.length} de ${filtered.length} productos (Página ${currentPage} de ${totalPages || 1})`;
    renderPagination(totalPages);
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
        btnAdd.addEventListener('click', () => modal.style.display = 'flex');
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

    // Add Product
    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('p-name').value;
            const desc = document.getElementById('p-desc').value;
            let img = document.getElementById('p-img').value;

            if (!img) {
                img = `https://picsum.photos/seed/${Date.now()}/400/300`;
            }

            const newId = productsData.length > 0 ? Math.max(...productsData.map(p => p.id)) + 1 : 1;

            productsData.unshift({
                id: newId,
                name,
                desc,
                category: 'General',
                provider: 'Desconocido',
                color: 'Vario',
                size: 'Standard',
                img
            });

            saveProducts();
            modal.style.display = 'none';
            addForm.reset();
            currentPage = 1;
            renderFilters();
            renderProducts();
        });
    }
});
