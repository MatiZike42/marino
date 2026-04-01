import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
// Cloudinary Config - No longer using Firebase Storage for images
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/doissrwhj/image/upload";
const CLOUDINARY_PRESET = "marino_preset";

// Obras Logic
let projectsData = [];
let galleryData = [];

// Determine if admin
const isAdminUser = localStorage.getItem('isAdmin') === 'true';

// Temporary Unsplash images for mock
const unsplashFotos = [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600566752355-35792bedcfea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1588854337236-6889d63114c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
];

const defaultProjects = [
    {
        id: "proj_1",
        client: "OFICINAS CORPORATIVAS",
        title: "Renovación Integral Planta Alta",
        desc: "Realizamos una renovación completa de 200m2. Incluyó tabiquería divisoria con aislamiento acústico, cielorraso desmontable para ocultar instalaciones de red y aire acondicionado, y revestimientos vinílicos en muros principales para mayor durabilidad.",
        tags: ["Durlock", "Cielorraso", "Acústica", "Oficinas"],
        imgs: [unsplashFotos[0], unsplashFotos[1], unsplashFotos[2]]
    },
    {
        id: "proj_2",
        client: "VIVIENDA FAMILIAR",
        title: "Ampliación Exterior Siding",
        desc: "Para esta ampliación utilizamos placas Superboard Siding símil madera, ofreciendo una estética cálida y moderna con los beneficios del fibrocemento: incombustible, resistente a la humedad y bajo mantenimiento.",
        tags: ["Exterior", "Siding", "Superboard", "Residencial"],
        imgs: [unsplashFotos[3], unsplashFotos[4]]
    }
];

const defaultGallery = [
    { id: "gal_1", title: "Detalle Cielorraso", img: unsplashFotos[0] },
    { id: "gal_2", title: "Divisiones Internas", img: unsplashFotos[1] },
    { id: "gal_3", title: "Revestimiento PVC", img: unsplashFotos[2] },
    { id: "gal_4", title: "Techo Desmontable", img: unsplashFotos[3] },
    { id: "gal_5", title: "Exterior Siding", img: unsplashFotos[4] },
    { id: "gal_6", title: "Local Comercial", img: unsplashFotos[5] },
    { id: "gal_7", title: "Terminaciones", img: unsplashFotos[0] }
];

// Initialize Data from Firestore
async function initializeObras() {
    try {
         // Load Projects
        const pSnap = await getDocs(collection(db, "projects"));
        projectsData = [];
        pSnap.forEach(doc => projectsData.push({ id: doc.id, ...doc.data() }));

        if (projectsData.length === 0 && isAdminUser) {
             for (const p of defaultProjects) {
                 await saveProject(p);
                 projectsData.push(p);
             }
        } else if (projectsData.length === 0) {
             projectsData = [...defaultProjects];
        }

        // Load Gallery
        const gSnap = await getDocs(collection(db, "gallery"));
        galleryData = [];
        gSnap.forEach(doc => galleryData.push({ id: doc.id, ...doc.data() }));

        if (galleryData.length === 0 && isAdminUser) {
             for (const g of defaultGallery) {
                 await saveGalleryItem(g);
                 galleryData.push(g);
             }
        } else if (galleryData.length === 0) {
             galleryData = [...defaultGallery];
        }

        const sortByOrder = (a, b) => {
            const oA = (a.order !== undefined && a.order !== null && a.order !== '') ? Number(a.order) : 9999;
            const oB = (b.order !== undefined && b.order !== null && b.order !== '') ? Number(b.order) : 9999;
            return oA - oB;
        };
        const sortByIdDesc = (a, b) => {
            const numA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
            const numB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
            return numB - numA;
        };
        projectsData.sort(sortByOrder);
        galleryData.sort(sortByIdDesc);

        renderStackedCards();
        renderBentoGallery();
    } catch (e) {
        console.error("Error loading obras: ", e);
        alert("Error cargando obras. Verifica tu conexión a internet.");
    }
}

async function saveProject(project) {
    await setDoc(doc(db, "projects", String(project.id)), project);
}

async function saveGalleryItem(galleryItem) {
    await setDoc(doc(db, "gallery", String(galleryItem.id)), galleryItem);
}

// Render Stacked Cards (chetanverma16 inspired)
function renderStackedCards() {
    const container = document.getElementById('stacked-cards-container');
    if (!container) return;

    container.innerHTML = '';

    if (projectsData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay proyectos detallados cargados.</p>';
        return;
    }

    projectsData.forEach((proj, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'project-card-wrapper';
        // Base z-index logic and top offset for stacking effect
        wrapper.style.zIndex = index + 1;
        wrapper.style.top = `${150 + (index * 30)}px`;

        const tagHtml = proj.tags.map(t => `<span class="project-tag">${t.trim()}</span>`).join('');

        let imgsHtml = '';
        if (proj.imgs && proj.imgs.length > 0) {
            imgsHtml = proj.imgs.map((im, i) => `<img src="${im}" class="${i === 0 ? 'active' : ''}" data-idx="${i}" alt="Galeria">`).join('');
        }

        const galleryControls = proj.imgs.length > 1 ? `
            <div class="gallery-controls">
                <button class="g-btn prev-g" data-id="${proj.id}"><i class="fas fa-chevron-left"></i></button>
                <button class="g-btn next-g" data-id="${proj.id}"><i class="fas fa-chevron-right"></i></button>
            </div>
        ` : '';

        const adminHtml = isAdminUser ? `
            <div class="admin-controls-card">
                <button class="btn btn-secondary" onclick="editProject('${proj.id}')"><i class="fas fa-edit"></i> Editar Proyecto</button>
                <button class="btn btn-danger" onclick="deleteProject('${proj.id}')"><i class="fas fa-trash"></i> Eliminar Proyecto</button>
            </div>
        ` : '';

        wrapper.innerHTML = `
            <div class="project-card" id="card-${proj.id}">
                <div class="project-info">
                    <h3><span>${proj.client}</span>${proj.title}</h3>
                    <p>${(proj.desc || '').replace(/\n/g, '<br>')}</p>
                    <div class="project-tags">${tagHtml}</div>
                    ${adminHtml}
                </div>
                <div class="project-gallery" id="gallery-${proj.id}">
                    ${imgsHtml}
                    ${galleryControls}
                </div>
            </div>
        `;

        // Click en la tarjeta abre el popup de detalle
        wrapper.querySelector('.project-card').addEventListener('click', (e) => {
            // Evitar abrir si el click fue en un botón de admin o de galería
            if (e.target.closest('.admin-controls-card') || e.target.closest('.gallery-controls') || e.target.closest('.g-btn')) return;
            openProjectModal(proj.id);
        });
        wrapper.querySelector('.project-card').style.cursor = 'pointer';

        container.appendChild(wrapper);
    });

    // Add scroll listener for stacked effect (scaling down cards as they stick and get overlaid)
    window.addEventListener('scroll', handleCardsScroll);
    handleCardsScroll(); // Initial call

    // Gallery button listeners
    document.querySelectorAll('.prev-g').forEach(btn => {
        btn.addEventListener('click', (e) => navigateGallery(e.currentTarget.getAttribute('data-id'), -1));
    });
    document.querySelectorAll('.next-g').forEach(btn => {
        btn.addEventListener('click', (e) => navigateGallery(e.currentTarget.getAttribute('data-id'), 1));
    });
}

// Stacked effect logic
function handleCardsScroll() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        // If card is sticking (near top offset)
        const targetTop = 150 + (index * 30);
        if (rect.top <= targetTop + 10) {
            // Distance scrolled past sticky point
            const overScroll = targetTop - rect.top;
            if (overScroll > 0) {
                // Calculate scale (shrinking slightly as it goes up)
                // Max shrink to 0.9, over maybe 500px of scroll
                const scale = Math.max(0.9, 1 - (overScroll / 2000));
                // Darken slightly
                const brightness = Math.max(0.5, 1 - (overScroll / 1000));
                card.style.transform = `scale(${scale})`;
                card.style.filter = `brightness(${brightness})`;
            } else {
                card.style.transform = `scale(1)`;
                card.style.filter = `brightness(1)`;
            }
        } else {
            card.style.transform = `scale(1)`;
            card.style.filter = `brightness(1)`;
        }
    });
}

function navigateGallery(projId, direction) {
    const galleryContainer = document.getElementById(`gallery-${projId}`);
    const imgs = galleryContainer.querySelectorAll('img');
    if (imgs.length <= 1) return;

    let activeIdx = 0;
    imgs.forEach((img, i) => {
        if (img.classList.contains('active')) activeIdx = i;
        img.classList.remove('active');
    });

    activeIdx = activeIdx + direction;
    if (activeIdx < 0) activeIdx = imgs.length - 1;
    if (activeIdx >= imgs.length) activeIdx = 0;

    imgs[activeIdx].classList.add('active');
}

// Render Bento Gallery
function renderBentoGallery() {
    const grid = document.getElementById('bento-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (galleryData.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No hay fotos en la galería.</p>';
        return;
    }

    galleryData.forEach(g => {
        const item = document.createElement('div');
        item.className = 'bento-item';

        let delBtn = '';
        let editBtn = '';
        if (isAdminUser) {
            editBtn = `<button class="bento-admin-edit" onclick="event.stopPropagation(); editGalleryItem('${g.id}')"><i class="fas fa-edit"></i></button>`;
            delBtn = `<button class="bento-admin-delete" onclick="event.stopPropagation(); deleteGalleryItem('${g.id}')"><i class="fas fa-trash"></i></button>`;
        }

        item.innerHTML = `
            <img src="${g.img}" alt="${g.title}">
            <div class="bento-caption">${g.title}</div>
            ${editBtn}
            ${delBtn}
        `;

        item.addEventListener('click', () => {
            const lb = document.getElementById('lightbox');
            const lbImg = document.getElementById('lightbox-img');
            lbImg.src = g.img;
            lb.style.display = 'flex';
        });

        grid.appendChild(item);
    });
}

// Admins
window.editProject = window.editProject || async function (id) {
    const p = projectsData.find(x => x.id === id);
    if (!p) return;

    document.getElementById('p-id').value = p.id;
    document.getElementById('p-client').value = p.client;
    document.getElementById('p-title').value = p.title;
    document.getElementById('p-desc').value = p.desc;
    document.getElementById('p-tags').value = p.tags.join(', ');
    document.getElementById('p-imgs').value = p.imgs.join(', ');
    const orderInput = document.getElementById('p-order');
    if (orderInput) orderInput.value = (p.order !== undefined && p.order !== null) ? p.order : '';

    document.getElementById('modal-project-title').innerText = 'Editar Proyecto Detallado';
    document.getElementById('addProjectModal').style.display = 'flex';
}

window.deleteProject = window.deleteProject || async function (id) {
    if (confirm("¿Seguro que deseas eliminar este proyecto detallado?")) {
        try {
            await deleteDoc(doc(db, "projects", String(id)));
            projectsData = projectsData.filter(p => p.id !== id);
            renderStackedCards();
        } catch(e) { console.error(e); }
    }
}

window.editGalleryItem = window.editGalleryItem || async function (id) {
    const g = galleryData.find(x => x.id === id);
    if (!g) return;

    document.getElementById('g-id').value = g.id;
    document.getElementById('g-title').value = g.title;
    document.getElementById('g-img').value = g.img;

    document.getElementById('modal-gallery-title').innerText = 'Editar Foto de Galería';
    document.getElementById('addGalleryModal').style.display = 'flex';
}

window.deleteGalleryItem = window.deleteGalleryItem || async function (id) {
    if (confirm("¿Deseas quitar esta foto de la galería?")) {
        try {
            await deleteDoc(doc(db, "gallery", String(id)));
            galleryData = galleryData.filter(p => p.id !== id);
            renderBentoGallery();
        } catch(e) { console.error(e); }
    }
}

// ─── PROJECT DETAIL POPUP ───────────────────────────────────────────────────
let popupGalleryIdx = 0;
let popupImgs = [];

function openProjectModal(id) {
    const proj = projectsData.find(p => p.id === id);
    if (!proj) return;

    const modal = document.getElementById('projectDetailModal');
    if (!modal) return;

    popupImgs = proj.imgs || [];
    popupGalleryIdx = 0;

    // Fill content
    modal.querySelector('.pdm-client').textContent = proj.client || '';
    modal.querySelector('.pdm-title').textContent = proj.title || '';
    modal.querySelector('.pdm-desc').innerHTML = (proj.desc || '').replace(/\n/g, '<br>');

    const tagsEl = modal.querySelector('.pdm-tags');
    tagsEl.innerHTML = (proj.tags || []).map(t => `<span class="project-tag">${t.trim()}</span>`).join('');

    updatePopupGallery();

    // Show/hide nav arrows
    const prevBtn = modal.querySelector('.pdm-prev');
    const nextBtn = modal.querySelector('.pdm-next');
    const counter = modal.querySelector('.pdm-counter');
    if (prevBtn && nextBtn) {
        prevBtn.style.display = popupImgs.length > 1 ? 'flex' : 'none';
        nextBtn.style.display = popupImgs.length > 1 ? 'flex' : 'none';
    }
    if (counter) {
        counter.style.display = popupImgs.length > 1 ? 'block' : 'none';
        counter.textContent = `1 / ${popupImgs.length}`;
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function updatePopupGallery() {
    const modal = document.getElementById('projectDetailModal');
    if (!modal) return;
    const imgEl = modal.querySelector('.pdm-img');
    if (imgEl && popupImgs.length > 0) {
        imgEl.style.opacity = '0';
        setTimeout(() => {
            imgEl.src = popupImgs[popupGalleryIdx];
            imgEl.style.opacity = '1';
        }, 180);
    } else if (imgEl) {
        imgEl.src = '';
        imgEl.style.display = 'none';
    }
    const counter = modal.querySelector('.pdm-counter');
    if (counter && popupImgs.length > 1) {
        counter.textContent = `${popupGalleryIdx + 1} / ${popupImgs.length}`;
    }
    // Dot indicators
    modal.querySelectorAll('.pdm-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === popupGalleryIdx);
    });
}

function closeProjectModal() {
    const modal = document.getElementById('projectDetailModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}
window.closeProjectModal = closeProjectModal;

document.addEventListener('DOMContentLoaded', () => {

    if (!document.getElementById('stacked-cards-container')) return;

    initializeObras();
    renderStackedCards();
    renderBentoGallery();

    // Lightbox
    const lb = document.getElementById('lightbox');
    const lbClose = document.getElementById('lightbox-close');
    if (lbClose) {
        lbClose.addEventListener('click', () => lb.style.display = 'none');
        lb.addEventListener('click', (e) => {
            if (e.target === lb) lb.style.display = 'none';
        });
    }

    // Project Detail Modal (popup de detalle de obra)
    const pdModal = document.getElementById('projectDetailModal');
    if (pdModal) {
        // Cerrar al click en el overlay
        pdModal.addEventListener('click', (e) => {
            if (e.target === pdModal) closeProjectModal();
        });
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && pdModal.style.display === 'flex') closeProjectModal();
        });
        // Flecha anterior
        const prevBtn = pdModal.querySelector('.pdm-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                popupGalleryIdx = (popupGalleryIdx - 1 + popupImgs.length) % popupImgs.length;
                updatePopupGallery();
            });
        }
        // Flecha siguiente
        const nextBtn = pdModal.querySelector('.pdm-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                popupGalleryIdx = (popupGalleryIdx + 1) % popupImgs.length;
                updatePopupGallery();
            });
        }
        // Swipe táctil
        let touchStartX = 0;
        pdModal.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
        pdModal.addEventListener('touchend', (e) => {
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) {
                if (diff > 0) { popupGalleryIdx = (popupGalleryIdx + 1) % popupImgs.length; }
                else          { popupGalleryIdx = (popupGalleryIdx - 1 + popupImgs.length) % popupImgs.length; }
                updatePopupGallery();
            }
        }, { passive: true });
    }

    // Modals & Admin
    const btnAddProject = document.getElementById('btn-add-project');
    const btnAddGallery = document.getElementById('btn-add-gallery');
    const pModal = document.getElementById('addProjectModal');
    const gModal = document.getElementById('addGalleryModal');

    if (isAdminUser) {
        if (btnAddProject) btnAddProject.style.display = 'inline-block';
        if (btnAddGallery) btnAddGallery.style.display = 'inline-block';

        btnAddProject.addEventListener('click', () => {
            document.getElementById('p-id').value = '';
            document.getElementById('modal-project-title').innerText = 'Cargar Nuevo Proyecto Detallado';
            const f = document.getElementById('add-project-form');
            if (f) f.reset();
            pModal.style.display = 'flex';
        });
        btnAddGallery.addEventListener('click', () => {
            document.getElementById('g-id').value = '';
            document.getElementById('modal-gallery-title').innerText = 'Añadir Foto a Galería General';
            const f = document.getElementById('add-gallery-form');
            if (f) f.reset();
            gModal.style.display = 'flex';
        });

        document.getElementById('close-project-modal').addEventListener('click', () => pModal.style.display = 'none');
        document.getElementById('close-gallery-modal').addEventListener('click', () => gModal.style.display = 'none');

        window.addEventListener('click', (e) => {
            if (e.target === pModal) pModal.style.display = 'none';
            if (e.target === gModal) gModal.style.display = 'none';
        });

        // Forms
        const projForm = document.getElementById('add-project-form');
        if(projForm) {
            projForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btnSubmit = e.target.querySelector('button[type="submit"]');
                btnSubmit.disabled = true;
                btnSubmit.innerText = 'Guardando...';

                try {
                    const editId = document.getElementById('p-id').value;
                    const client = document.getElementById('p-client').value;
                    const title = document.getElementById('p-title').value;
                    const desc = document.getElementById('p-desc').value;
                    const tags = document.getElementById('p-tags').value.split(',').map(t => t.trim()).filter(t => t);
                    const orderRaw = document.getElementById('p-order') ? document.getElementById('p-order').value.trim() : '';
                    const order = orderRaw !== '' ? Number(orderRaw) : null;
                    
                    // Allow file uploads (multiple)
                    const imgFileInputs = document.getElementById('p-img-files');
                    let newUploadedUrls = [];
                    
                    if (imgFileInputs && imgFileInputs.files.length > 0) {
                        let total = imgFileInputs.files.length;
                        
                        for (let i = 0; i < total; i++) {
                            const file = imgFileInputs.files[i];
                            btnSubmit.innerText = `Subiendo (${i+1}/${total})...`;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('upload_preset', CLOUDINARY_PRESET);

                            const response = await fetch(CLOUDINARY_URL, {
                                method: 'POST',
                                body: formData
                            });

                            if (!response.ok) throw new Error("Error al subir imagen a Cloudinary");
                            
                            const data = await response.json();
                            newUploadedUrls.push(data.secure_url);
                        }
                    }

                    // Read explicit URLs input in the text box (if any)
                    let manualUrls = document.getElementById('p-imgs').value.split(',').map(t => t.trim()).filter(t => t);
                    
                    let finalImgsArr = [];

                    if (editId) {
                        const idx = projectsData.findIndex(p => p.id == editId);
                        if (idx !== -1) {
                            // When editing, combine: Existing valid URLs in the input box + New uploaded images
                            // If the user didn't change the input box, it retains the existing ones. 
                            // If they cleared it, we drop them.
                            finalImgsArr = [...manualUrls, ...newUploadedUrls];
                            
                            projectsData[idx].client = client;
                            projectsData[idx].title = title;
                            projectsData[idx].desc = desc;
                            projectsData[idx].tags = tags;
                            projectsData[idx].imgs = finalImgsArr;
                            projectsData[idx].order = order;
                            
                            await saveProject(projectsData[idx]);
                        }
                    } else {
                        finalImgsArr = [...manualUrls, ...newUploadedUrls];
                        const newId = 'proj_' + Date.now();
                        const newObj = { id: newId, client, title, desc, tags, imgs: finalImgsArr, order };
                        await saveProject(newObj);
                        projectsData.unshift(newObj);
                    }
                    
                    // Re-sort after save
                    projectsData.sort((a, b) => {
                        const oA = (a.order !== undefined && a.order !== null && a.order !== '') ? Number(a.order) : 9999;
                        const oB = (b.order !== undefined && b.order !== null && b.order !== '') ? Number(b.order) : 9999;
                        return oA - oB;
                    });
                    
                    pModal.style.display = 'none';
                    e.target.reset();
                    renderStackedCards();
                    window.scrollTo({ top: document.getElementById('obras-detalladas').offsetTop, behavior: 'smooth' });
                } catch(err) {
                    console.error("Error detallado:", err);
                    alert("Error al guardar: " + err.message);
                } finally {
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = 'Publicar Proyecto';
                    if(document.getElementById('p-img-files')) document.getElementById('p-img-files').value = '';
                }
            });
        }

        const galForm = document.getElementById('add-gallery-form');
        if(galForm) {
            galForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btnSubmit = e.target.querySelector('button[type="submit"]');
                btnSubmit.disabled = true;
                btnSubmit.innerText = 'Guardando...';

                try {
                    const editId = document.getElementById('g-id').value;
                    const title = document.getElementById('g-title').value;
                    
                    const imgFileInput = document.getElementById('g-img-file');
                    let img = document.getElementById('g-img').value;
                    
                    if (imgFileInput && imgFileInput.files.length > 0) {
                         const file = imgFileInput.files[0];
                         btnSubmit.innerText = `Subiendo Foto...`;
                         
                         const formData = new FormData();
                         formData.append('file', file);
                         formData.append('upload_preset', CLOUDINARY_PRESET);

                         const response = await fetch(CLOUDINARY_URL, {
                             method: 'POST',
                             body: formData
                         });

                         if (!response.ok) throw new Error("Error al subir a Cloudinary");
                         
                         const data = await response.json();
                         img = data.secure_url;
                    }

                    if (editId) {
                        const idx = galleryData.findIndex(g => g.id == editId);
                        if (idx !== -1) {
                            galleryData[idx].title = title;
                            galleryData[idx].img = img;
                            await saveGalleryItem(galleryData[idx]);
                        }
                    } else {
                        const newId = 'gal_' + Date.now();
                        const newObj = { id: newId, title, img };
                        await saveGalleryItem(newObj);
                        galleryData.unshift(newObj);
                    }
                    
                    gModal.style.display = 'none';
                    e.target.reset();
                    renderBentoGallery();
                } catch(err) {
                    console.error(err);
                    alert("Error guardando");
                } finally {
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = 'Añadir Foto';
                    if(document.getElementById('g-img-file')) document.getElementById('g-img-file').value = '';
                }
            });
        }
    }
});
