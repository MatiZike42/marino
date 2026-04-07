import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/doissrwhj/image/upload";
const CLOUDINARY_PRESET = "marino_preset";

// Obras Logic
let projectsData = [];
let galleryData = [];

// Admin check vía Firebase Auth SDK
function isAdminUser() {
    return typeof window._firebaseIsAdmin === 'function' ? window._firebaseIsAdmin() : false;
}

// Helper for image optimization via Cloudinary
function optimizeImg(url, width = 800) {
    if (!url || !url.includes('cloudinary.com')) return url;
    if (url.includes('upload/')) {
        return url.replace('upload/', `upload/w_${width},q_auto,f_auto/`);
    }
    return url;
}

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
        const pSnap = await getDocs(collection(db, "projects"));
        projectsData = [];
        pSnap.forEach(doc => projectsData.push({ id: doc.id, ...doc.data() }));

        if (projectsData.length === 0 && isAdminUser()) {
             for (const p of defaultProjects) {
                 await saveProject(p);
                 projectsData.push(p);
             }
        } else if (projectsData.length === 0) {
             projectsData = [...defaultProjects];
        }

        const gSnap = await getDocs(collection(db, "gallery"));
        galleryData = [];
        gSnap.forEach(doc => galleryData.push({ id: doc.id, ...doc.data() }));

        if (galleryData.length === 0 && isAdminUser()) {
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
    }
}

async function saveProject(project) {
    await setDoc(doc(db, "projects", String(project.id)), project);
}

async function saveGalleryItem(galleryItem) {
    await setDoc(doc(db, "gallery", String(galleryItem.id)), galleryItem);
}

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
        wrapper.style.zIndex = index + 1;
        wrapper.style.top = `${150 + (index * 30)}px`;

        const tagHtml = proj.tags.map(t => `<span class="project-tag">${t.trim()}</span>`).join('');
        let imgsHtml = (proj.imgs || []).map((im, i) => `<img src="${optimizeImg(im, 800)}" class="${i === 0 ? 'active' : ''}" data-idx="${i}" alt="Galeria">`).join('');
        const galleryControls = proj.imgs && proj.imgs.length > 1 ? `
            <div class="gallery-controls">
                <button class="g-btn prev-g" data-id="${proj.id}"><i class="fas fa-chevron-left"></i></button>
                <button class="g-btn next-g" data-id="${proj.id}"><i class="fas fa-chevron-right"></i></button>
            </div>
        ` : '';

        const adminHtml = isAdminUser() ? `
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

        wrapper.querySelector('.project-card').addEventListener('click', (e) => {
            if (e.target.closest('.admin-controls-card') || e.target.closest('.gallery-controls') || e.target.closest('.g-btn')) return;
            openProjectModal(proj.id);
        });
        container.appendChild(wrapper);
    });

    window.addEventListener('scroll', handleCardsScroll);
    handleCardsScroll();

    document.querySelectorAll('.prev-g').forEach(btn => {
        btn.addEventListener('click', (e) => navigateGallery(e.currentTarget.getAttribute('data-id'), -1));
    });
    document.querySelectorAll('.next-g').forEach(btn => {
        btn.addEventListener('click', (e) => navigateGallery(e.currentTarget.getAttribute('data-id'), 1));
    });
}

function handleCardsScroll() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const targetTop = 150 + (index * 30);
        if (rect.top <= targetTop + 10) {
            const overScroll = targetTop - rect.top;
            if (overScroll > 0) {
                const scale = Math.max(0.9, 1 - (overScroll / 2000));
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
    activeIdx = (activeIdx + direction + imgs.length) % imgs.length;
    imgs[activeIdx].classList.add('active');
}

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
        let delBtn = isAdminUser() ? `<button class="bento-admin-delete" onclick="event.stopPropagation(); deleteGalleryItem('${g.id}')"><i class="fas fa-trash"></i></button>` : '';
        let editBtn = isAdminUser() ? `<button class="bento-admin-edit" onclick="event.stopPropagation(); editGalleryItem('${g.id}')"><i class="fas fa-edit"></i></button>` : '';
        item.innerHTML = `<img src="${optimizeImg(g.img, 400)}" alt="${g.title}"><div class="bento-caption">${g.title}</div>${editBtn}${delBtn}`;
        item.addEventListener('click', () => {
            const lb = document.getElementById('lightbox');
            document.getElementById('lightbox-img').src = g.img;
            lb.style.display = 'flex';
        });
        grid.appendChild(item);
    });
}

window.editProject = async function (id) {
    const p = projectsData.find(x => x.id === id);
    if (!p) return;
    document.getElementById('p-id').value = p.id;
    document.getElementById('p-client').value = p.client;
    document.getElementById('p-title').value = p.title;
    document.getElementById('p-desc').value = p.desc;
    document.getElementById('p-tags').value = p.tags.join(', ');
    document.getElementById('p-imgs').value = p.imgs.join(', ');
    if (document.getElementById('p-order')) document.getElementById('p-order').value = p.order || '';
    document.getElementById('modal-project-title').innerText = 'Editar Proyecto';
    document.getElementById('addProjectModal').style.display = 'flex';
}

window.deleteProject = async function (id) {
    if (confirm("¿Eliminar proyecto?")) {
        try {
            await deleteDoc(doc(db, "projects", id));
            projectsData = projectsData.filter(p => p.id !== id);
            renderStackedCards();
        } catch(e) { console.error(e); }
    }
}

window.editGalleryItem = function (id) {
    const g = galleryData.find(x => x.id === id);
    if (!g) return;
    document.getElementById('g-id').value = g.id;
    document.getElementById('g-title').value = g.title;
    document.getElementById('g-img').value = g.img;
    document.getElementById('modal-gallery-title').innerText = 'Editar Foto';
    document.getElementById('addGalleryModal').style.display = 'flex';
}

window.deleteGalleryItem = async function (id) {
    if (confirm("¿Eliminar foto?")) {
        try {
            await deleteDoc(doc(db, "gallery", id));
            galleryData = galleryData.filter(g => g.id !== id);
            renderBentoGallery();
        } catch(e) { console.error(e); }
    }
}

let popupGalleryIdx = 0, popupImgs = [];
function openProjectModal(id) {
    const proj = projectsData.find(p => p.id === id);
    if (!proj) return;
    popupImgs = proj.imgs || [];
    popupGalleryIdx = 0;
    const modal = document.getElementById('projectDetailModal');
    modal.querySelector('.pdm-client').textContent = proj.client;
    modal.querySelector('.pdm-title').textContent = proj.title;
    modal.querySelector('.pdm-desc').innerHTML = proj.desc.replace(/\n/g, '<br>');
    modal.querySelector('.pdm-tags').innerHTML = proj.tags.map(t => `<span class="project-tag">${t}</span>`).join('');
    updatePopupGallery();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function updatePopupGallery() {
    const modal = document.getElementById('projectDetailModal');
    const imgEl = modal.querySelector('.pdm-img');
    imgEl.src = popupImgs[popupGalleryIdx];
    const counter = modal.querySelector('.pdm-counter');
    if (counter) counter.textContent = `${popupGalleryIdx + 1} / ${popupImgs.length}`;
}

window.closeProjectModal = function() {
    document.getElementById('projectDetailModal').style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('stacked-cards-container')) return;
    initializeObras();

    const lb = document.getElementById('lightbox');
    if (lb) {
        document.getElementById('lightbox-close').onclick = () => lb.style.display = 'none';
        lb.onclick = (e) => { if (e.target === lb) lb.style.display = 'none'; };
    }

    const pdModal = document.getElementById('projectDetailModal');
    if (pdModal) {
        pdModal.onclick = (e) => { if (e.target === pdModal) closeProjectModal(); };
        pdModal.querySelector('.pdm-prev').onclick = () => { popupGalleryIdx = (popupGalleryIdx - 1 + popupImgs.length) % popupImgs.length; updatePopupGallery(); };
        pdModal.querySelector('.pdm-next').onclick = () => { popupGalleryIdx = (popupGalleryIdx + 1) % popupImgs.length; updatePopupGallery(); };
    }

    const btnAddProject = document.getElementById('btn-add-project');
    const btnAddGallery = document.getElementById('btn-add-gallery');
    const pModal = document.getElementById('addProjectModal');
    const gModal = document.getElementById('addGalleryModal');

    const updateAdminUI = () => {
        const isAdm = isAdminUser();
        if (btnAddProject) btnAddProject.style.display = isAdm ? 'inline-block' : 'none';
        if (btnAddGallery) btnAddGallery.style.display = isAdm ? 'inline-block' : 'none';
    };
    updateAdminUI();
    window.addEventListener('authReady', () => { updateAdminUI(); renderStackedCards(); renderBentoGallery(); });

    if (btnAddProject) {
        btnAddProject.onclick = () => { document.getElementById('add-project-form').reset(); document.getElementById('p-id').value = ''; pModal.style.display = 'flex'; };
        document.getElementById('close-project-modal').onclick = () => pModal.style.display = 'none';
    }
    if (btnAddGallery) {
        btnAddGallery.onclick = () => { document.getElementById('add-gallery-form').reset(); document.getElementById('g-id').value = ''; gModal.style.display = 'flex'; };
        document.getElementById('close-gallery-modal').onclick = () => gModal.style.display = 'none';
    }

    const projForm = document.getElementById('add-project-form');
    if (projForm) {
        projForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true; btn.innerText = 'Guardando...';
            try {
                const id = document.getElementById('p-id').value || 'proj_' + Date.now();
                const uploaded = [];
                const files = document.getElementById('p-img-files').files;
                for (let f of files) {
                    const fd = new FormData(); fd.append('file', f); fd.append('upload_preset', CLOUDINARY_PRESET);
                    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
                    const data = await res.json(); uploaded.push(data.secure_url);
                }
                const existing = document.getElementById('p-imgs').value.split(',').map(s => s.trim()).filter(s => s);
                const project = {
                    id, client: document.getElementById('p-client').value,
                    title: document.getElementById('p-title').value,
                    desc: document.getElementById('p-desc').value,
                    tags: document.getElementById('p-tags').value.split(',').map(s => s.trim()),
                    imgs: [...existing, ...uploaded],
                    order: document.getElementById('p-order') ? document.getElementById('p-order').value : null
                };
                await saveProject(project);
                location.reload();
            } catch(e) { console.error(e); alert("Error"); }
            finally { btn.disabled = false; btn.innerText = 'Publicar'; }
        };
    }

    const galForm = document.getElementById('add-gallery-form');
    if (galForm) {
        galForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                let img = document.getElementById('g-img').value;
                const file = document.getElementById('g-img-file').files[0];
                if (file) {
                    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', CLOUDINARY_PRESET);
                    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
                    const data = await res.json(); img = data.secure_url;
                }
                const item = { id: document.getElementById('g-id').value || 'gal_' + Date.now(), title: document.getElementById('g-title').value, img };
                await saveGalleryItem(item);
                location.reload();
            } catch(e) { console.error(e); }
            finally { btn.disabled = false; }
        };
    }
});
