import { db, storage } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

// Product Data Management
const ITEMS_PER_PAGE = 24;
let productsData = [];
let currentPage = 1;
let currentSearch = '';

// Filter States
let selectedCategories = new Set();
let selectedProviders = new Set();
let selectedColors = new Set();

// Check if admin to show controls
const isAdminUser = localStorage.getItem('isAdmin') === 'true';

// Basic initial data (fallback if Firestore is empty)
const defaultProducts = [
    // DURLOCK
    { id: "p_1", name: "Placa Durlock Estándar 12.5mm", desc: "Placa de yeso para cielorrasos y revestimientos interiores en ambientes secos.", category: "Placa de Yeso", provider: "Durlock", color: "Gris", size: "1.20x2.40m", img: "proveedores/durlock.png" },
    { id: "p_2", name: "Placa Durlock Resistente a la Humedad", desc: "Placa verde ideal para baños, cocinas y ambientes con grado de humedad.", category: "Placa de Yeso", provider: "Durlock", color: "Verde", size: "1.20x2.40m", img: "proveedores/durlock.png" },
    { id: "p_3", name: "Masilla Durlock Lista Para Usar", desc: "Masilla de secado rápido especial para tomado de juntas.", category: "Masilla", provider: "Durlock", color: "Blanco", size: "32kg", img: "proveedores/durlock.png" },
    // JMA
    { id: "p_4", name: "Montante 69mm JMA", desc: "Perfil de acero galvanizado estructural para tabiques y cielorrasos.", category: "Perfil de Acero", provider: "JMA", color: "Metálico", size: "2.60m", img: "proveedores/JMA.png" },
    { id: "p_5", name: "Solera 70mm JMA", desc: "Perfil guía inferior y superior de acero galvanizado para construcción en seco.", category: "Perfil de Acero", provider: "JMA", color: "Metálico", size: "2.60m", img: "proveedores/JMA.png" }
];

// Load from Firestore
async function initializeProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        productsData = [];
        querySnapshot.forEach((doc) => {
            productsData.push({ id: doc.id, ...doc.data() });
        });
        
        // If empty, init with default data to Firestore
        if (productsData.length === 0 && isAdminUser) {
            console.log("Firestore is empty. Creating default products...");
             for (const p of defaultProducts) {
                 await setDoc(doc(db, "products", p.id), p);
                 productsData.push(p);
             }
        } else if (productsData.length === 0) {
             productsData = [...defaultProducts]; // Fallback read for normal users just in case
        }
        
        // Render
        renderFilters();
        renderProducts();
    } catch (error) {
        console.error("Error loading products:", error);
        alert("Error cargando productos. Verifica tu conexión a internet.");
    }
}

async function saveProduct(product) {
    try {
        await setDoc(doc(db, "products", String(product.id)), product);
    } catch (e) {
        console.error("Error saving product: ", e);
        throw e;
    }
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
                    <button class="btn btn-secondary" style="width: 100%; border-radius: 8px; padding: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin: 0;" onclick="event.preventDefault(); window.addToCart('${p.id}', '${p.name.replace(/'/g, "\\'")}', '${p.img}', '${p.category}')">
                        <i class="fas fa-cart-plus" style="transform: translateY(1px);"></i> Sumar al Carrito
                    </button>
                </div>
                ` : ''}

                ${isAdminUser ? `
                <div class="admin-controls" style="display: flex; gap: 0.5rem; padding: 0 1.5rem 1.5rem 1.5rem;">
                    <button class="btn btn-secondary" onclick="event.preventDefault(); editProduct('${p.id}')" style="flex: 1; padding: 0.5rem;">
                       <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="event.preventDefault(); deleteProduct('${p.id}')" style="flex: 1; padding: 0.5rem;">
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
window.editProduct = window.editProduct || async function (id) {
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

    // If we have an image field wrapper, change it to show it's a file or URL
    // (We also need to adapt the HTML to allow file upload)

    document.getElementById('modal-product-title').innerText = 'Editar Producto';
    document.getElementById('addModal').style.display = 'flex';
}

window.deleteProduct = window.deleteProduct || async function (id) {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
        const p = productsData.find(x => x.id === id);
        if(p) {
            try {
                await deleteDoc(doc(db, "products", String(id)));
                productsData = productsData.filter(x => x.id !== id);
                renderProducts();
                renderFilters();
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert("Hubo un error al eliminar.");
            }
        }
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
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = addForm.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Guardando...';

            try {
                const editId = document.getElementById('p-id').value;
                const name = document.getElementById('p-name').value;
                const category = document.getElementById('p-category').value;
                const provider = document.getElementById('p-provider').value;
                const color = document.getElementById('p-color').value;
                const size = document.getElementById('p-size').value;
                const desc = document.getElementById('p-desc').value;
                
                // Allow file upload or URL
                const imgFileInput = document.getElementById('p-img-file');
                let img = document.getElementById('p-img').value; 

                // Process image upload if a file is selected
                if (imgFileInput && imgFileInput.files.length > 0) {
                    const file = imgFileInput.files[0];
                    const storageRef = ref(storage, 'products/' + file.name + '_' + Date.now());
                    btnSubmit.innerText = 'Subiendo imagen...';
                    await uploadBytes(storageRef, file);
                    img = await getDownloadURL(storageRef);
                } else if (!img) {
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
                        await saveProduct(productsData[idx]);
                    }
                } else {
                    // Add new
                    const newId = 'p_' + Date.now();
                    const newObj = {
                        id: newId,
                        name,
                        desc,
                        category: category,
                        provider: provider,
                        color: color,
                        size: size,
                        img
                    };
                    await saveProduct(newObj);
                    productsData.unshift(newObj);
                    currentPage = 1;
                }

                modal.style.display = 'none';
                addForm.reset();
                renderFilters();
                renderProducts();
            } catch(error) {
                console.error("Error submitting product: ", error);
                alert("Error al guardar el producto.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Guardar Producto';
                if(document.getElementById('p-img-file')) {
                    document.getElementById('p-img-file').value = '';
                }
            }
        });
    }
});
