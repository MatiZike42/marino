import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const CLOUDINARY_URL_IMAGE = "https://api.cloudinary.com/v1_1/doissrwhj/image/upload";
const CLOUDINARY_URL_VIDEO = "https://api.cloudinary.com/v1_1/doissrwhj/video/upload";
const CLOUDINARY_PRESET = "marino_preset";

let videosData = [];
// Admin check vía Firebase Auth SDK
function isAdminUser() {
    return typeof window._firebaseIsAdmin === 'function' ? window._firebaseIsAdmin() : false;
}

// Helper for image optimization via Cloudinary
function optimizeImg(url, width = 600) {
    if (!url || !url.includes('cloudinary.com')) return url;
    if (url.includes('upload/')) {
        return url.replace('upload/', `upload/w_${width},q_auto,f_auto/`);
    }
    return url;
}

// Default mock videos to populate if empty
const defaultVideos = [
    {
        id: "vid_1",
        title: "Instalación de Cielorraso PVC",
        desc: "Proceso detallado de colocación de lamas de PVC en local comercial.",
        type: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Placeholder
        thumb: "IMG_4561.jpg"
    },
    {
        id: "vid_2",
        title: "Revestimiento Exterior Siding",
        desc: "Resultado final de obra con Siding Cedro en vivienda unifamiliar.",
        type: "instagram",
        url: "https://www.instagram.com/reels/C4_xyz/", // Placeholder
        thumb: "IMG_4420.jpg"
    }
];

async function initializeGaleria() {
    try {
        const querySnapshot = await getDocs(collection(db, "videos"));
        videosData = [];
        querySnapshot.forEach((doc) => {
            videosData.push({ id: doc.id, ...doc.data() });
        });

        if (videosData.length === 0 && isAdminUser()) {
            for (const v of defaultVideos) {
                await setDoc(doc(db, "videos", v.id), v);
                videosData.push(v);
            }
        } else if (videosData.length === 0) {
            videosData = [...defaultVideos];
        }

        // Ordenar por campo order (ascendente), sin order van al final
        videosData.sort((a, b) => {
            const oA = (a.order !== undefined && a.order !== null && a.order !== '') ? Number(a.order) : 9999;
            const oB = (b.order !== undefined && b.order !== null && b.order !== '') ? Number(b.order) : 9999;
            return oA - oB;
        });

        renderVideos();
        setupAdminUI();
    } catch (error) {
        console.error("Error initializing Galeria:", error);
    }
}

function renderVideos() {
    const grid = document.getElementById('video-grid');
    const mList = document.getElementById('video-list-m');
    
    if (grid) grid.innerHTML = '';
    if (mList) mList.innerHTML = '';

    videosData.forEach(v => {
        const platformIcon = getPlatformIcon(v.type);
        const cardHtml = `
            <div class="video-card reveal">
                <div class="video-thumbnail" onclick="playVideo('${v.id}')">
                    <span class="video-platform-badge">${platformIcon} ${v.type}</span>
                    <img src="${optimizeImg(v.thumb, 600)}" alt="${v.title}">
                    <div class="play-overlay">
                        <div class="play-btn"><i class="fas fa-play"></i></div>
                    </div>
                </div>
                <div class="video-info">
                    <h3>${v.title}</h3>
                    <p>${(v.desc || '').replace(/\n/g, '<br>')}</p>
                    ${isAdminUser() ? `
                        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary" style="flex:1; padding: 0.4rem;" onclick="editVideo('${v.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-danger" style="flex:1; padding: 0.4rem;" onclick="deleteVideo('${v.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        const mobileHtml = `
            <div class="video-card-m">
                <div class="video-thumb-m" onclick="playVideo('${v.id}')">
                    <span class="m-platform-badge">${platformIcon} ${v.type}</span>
                    <img src="${optimizeImg(v.thumb, 400)}" alt="${v.title}">
                    <div class="play-icon-m"><i class="fas fa-play"></i></div>
                </div>
                <div class="video-info-m">
                    <h3>${v.title}</h3>
                    <p>${(v.desc || '').replace(/\n/g, '<br>')}</p>
                    ${isAdminUser() ? `
                        <div style="margin-top: 0.8rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary" style="flex:1; font-size: 0.8rem;" onclick="editVideo('${v.id}')">Editar</button>
                            <button class="btn btn-danger" style="flex:1; font-size: 0.8rem;" onclick="deleteVideo('${v.id}')">Borrar</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        if (grid) {
            const div = document.createElement('div');
            div.innerHTML = cardHtml;
            grid.appendChild(div.firstElementChild);
        }
        if (mList) {
            const div = document.createElement('div');
            div.innerHTML = mobileHtml;
            mList.appendChild(div.firstElementChild);
        }
    });

    if (typeof window.initAnimations === 'function') window.initAnimations();
}

function getPlatformIcon(type) {
    switch(type) {
        case 'youtube': return '<i class="fab fa-youtube"></i>';
        case 'instagram': return '<i class="fab fa-instagram"></i>';
        case 'facebook': return '<i class="fab fa-facebook"></i>';
        case 'tiktok': return '<i class="fab fa-tiktok"></i>';
        default: return '<i class="fas fa-video"></i>';
    }
}

window.playVideo = function(id) {
    const video = videosData.find(v => v.id === id);
    if (!video) return;

    const modal = document.getElementById('video-player-modal') || document.getElementById('m-player-modal');
    const target = document.getElementById('player-target') || document.getElementById('m-player-target');
    const container = modal.querySelector('.player-container') || modal.querySelector('.m-player-container');

    let embedHtml = '';
    const url = video.url;

    if (container) {
        if (video.type === 'instagram') {
            container.style.aspectRatio = 'auto'; // Let Insta script size it
            container.style.width = '100%';
            container.style.maxWidth = '450px';
            container.style.height = '85vh';
            container.style.maxHeight = '90vh';
            container.style.backgroundColor = '#fff';
            container.style.overflowY = 'auto';
            container.style.borderRadius = '12px';

            if (!document.getElementById('ig-fix-css')) {
                const style = document.createElement('style');
                style.id = 'ig-fix-css';
                style.innerHTML = `
                    .player-container iframe.instagram-media,
                    .m-player-container iframe.instagram-media {
                        height: 700px !important;
                        min-height: 700px !important;
                        width: 100% !important;
                        max-height: none !important;
                    }
                `;
                document.head.appendChild(style);
            }
        } else if (video.type === 'tiktok') {
            container.style.aspectRatio = '9/16';
            container.style.maxWidth = '100%';
            container.style.width = 'auto';
            container.style.height = '85vh';
            container.style.backgroundColor = '#000';
            container.style.overflowY = 'visible';
            container.style.maxHeight = 'none';
        } else {
            container.style.aspectRatio = '16/9';
            container.style.maxWidth = '1000px';
            container.style.width = '100%';
            container.style.height = 'auto';
            container.style.backgroundColor = '#000';
            container.style.overflowY = 'visible';
            container.style.maxHeight = 'none';
        }
    }

    if (video.type === 'youtube') {
        const vidId = extractYoutubeId(url);
        embedHtml = `<iframe src="https://www.youtube.com/embed/${vidId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else if (video.type === 'instagram') {
        const urlStr = String(url).trim();
        if (urlStr.startsWith('<iframe') || urlStr.startsWith('<blockquote')) {
            embedHtml = urlStr;
        } else {
            const cleanUrl = urlStr.split('?')[0].replace(/\/$/, '') + '/';
            embedHtml = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${cleanUrl}" data-instgrm-version="14" style="background:#FFF; border:0; margin: 0 auto; max-width:450px; padding:0; width:100%;"></blockquote>`;
        }
    } else if (video.type === 'facebook') {
        embedHtml = `<iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
    } else if (video.type === 'tiktok') {
        const vidId = url.split('/').pop();
        embedHtml = `<iframe src="https://www.tiktok.com/embed/v2/${vidId}" allowfullscreen></iframe>`;
    } else {
        embedHtml = `<video src="${url}" controls autoplay playsinline style="width:100%; height:100%; object-fit: contain; outline: none; background-color: transparent;"></video>`;
    }

    target.innerHTML = embedHtml;
    modal.style.display = 'flex';

    if (video.type === 'instagram') {
        setTimeout(() => {
            if (window.instgrm) {
                window.instgrm.Embeds.process();
            }
        }, 500); // Wait a bit longer for modal display flex to fully layout
    }
};

function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Close player functions
function closeVideoPlayer() {
    const modal = document.getElementById('video-player-modal') || document.getElementById('m-player-modal');
    const target = document.getElementById('player-target') || document.getElementById('m-player-target');
    if(modal) modal.style.display = 'none';
    if(target) target.innerHTML = '';
}

const closePlayerBtn = document.getElementById('close-player') || document.getElementById('m-close-player');
if (closePlayerBtn) {
    closePlayerBtn.onclick = closeVideoPlayer;
}

const videoPlayerModal = document.getElementById('video-player-modal') || document.getElementById('m-player-modal');
if (videoPlayerModal) {
    videoPlayerModal.addEventListener('click', (e) => {
        if (e.target.id === 'video-player-modal' || e.target.id === 'm-player-modal') {
            closeVideoPlayer();
        }
    });
}

// Admin Logic
function setupAdminUI() {
    const updateAdminUI = () => {
        const btnAdd = document.getElementById('btn-add-video') || document.getElementById('m-btn-add-video');
        if (isAdminUser()) {
            if (btnAdd) btnAdd.style.display = 'block';
        } else {
            if (btnAdd) btnAdd.style.display = 'none';
        }
    };

    updateAdminUI();

    window.addEventListener('authReady', () => {
        updateAdminUI();
        renderVideos();
    });

    const btnAdd = document.getElementById('btn-add-video') || document.getElementById('m-btn-add-video');
    const modal = document.getElementById('videoModal');
    const closeBtn = document.getElementById('close-video-modal');
    const form = document.getElementById('add-video-form');

    if (btnAdd && modal) {
        btnAdd.onclick = () => {
            if (form) form.reset();
            document.getElementById('v-id').value = '';
            document.getElementById('modal-video-title').innerText = 'Cargar Nuevo Video Multimedia';
            modal.style.display = 'flex';
        };
    }

    if (closeBtn && modal) closeBtn.onclick = () => modal.style.display = 'none';

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btnSubmit = form.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = 'Cargando...';
            btnSubmit.disabled = true;

            try {
                const id = document.getElementById('v-id').value || 'vid_' + Date.now();
                const type = document.getElementById('v-type').value;
                let url = document.getElementById('v-url').value;
                let thumb = document.getElementById('v-thumb').value;

                // Handle Video File Upload
                if (type === 'file') {
                    const videoFile = document.getElementById('v-file').files[0];
                    if (videoFile) {
                        const formData = new FormData();
                        formData.append('file', videoFile);
                        formData.append('upload_preset', CLOUDINARY_PRESET);
                        const res = await fetch(CLOUDINARY_URL_VIDEO, { method: 'POST', body: formData });
                        const data = await res.json();
                        url = data.secure_url;
                        if (url && url.lastIndexOf('.') > -1) {
                            url = url.substring(0, url.lastIndexOf('.')) + '.mp4';
                        }
                    }
                }

                // Handle Thumbnail Upload
                const thumbFile = document.getElementById('v-thumb-file').files[0];
                if (thumbFile) {
                    const formData = new FormData();
                    formData.append('file', thumbFile);
                    formData.append('upload_preset', CLOUDINARY_PRESET);
                    const res = await fetch(CLOUDINARY_URL_IMAGE, { method: 'POST', body: formData });
                    const data = await res.json();
                    thumb = data.secure_url;
                }

                const videoObj = {
                    id,
                    title: document.getElementById('v-title').value,
                    desc: document.getElementById('v-desc').value,
                    type,
                    url,
                    thumb: thumb || '1.png',
                    order: (() => {
                        const raw = document.getElementById('v-order') ? document.getElementById('v-order').value.trim() : '';
                        return raw !== '' ? Number(raw) : null;
                    })()
                };

                await setDoc(doc(db, "videos", id), videoObj);
                
                alert('Video guardado con éxito');
                location.reload();
            } catch (err) {
                console.error(err);
                alert('Error al guardar el video');
            } finally {
                btnSubmit.innerText = originalText;
                btnSubmit.disabled = false;
            }
        };
    }
}

window.editVideo = function(id) {
    const v = videosData.find(video => video.id === id);
    if (!v) return;

    const modal = document.getElementById('videoModal');
    if (!modal) return;

    document.getElementById('v-id').value = v.id;
    document.getElementById('v-title').value = v.title;
    document.getElementById('v-desc').value = v.desc || '';
    document.getElementById('v-type').value = v.type;
    document.getElementById('v-url').value = v.url || '';
    document.getElementById('v-thumb').value = v.thumb || '';
    const vOrder = document.getElementById('v-order');
    if (vOrder) vOrder.value = (v.order !== undefined && v.order !== null) ? v.order : '';
    
    // Trigger change event to show/hide correct inputs
    document.getElementById('v-type').dispatchEvent(new Event('change'));

    document.getElementById('modal-video-title').innerText = 'Editar Video Multimedia';
    modal.style.display = 'flex';
};

window.deleteVideo = async function(id) {
    if (confirm('¿Estás seguro de eliminar este video?')) {
        try {
            await deleteDoc(doc(db, "videos", id));
            alert('Video eliminado');
            location.reload();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initializeGaleria();
    // Inject official Instagram script globally
    if (!document.getElementById('ig-embed-script')) {
        const s = document.createElement('script');
        s.id = 'ig-embed-script';
        s.src = "//www.instagram.com/embed.js";
        s.async = true;
        document.head.appendChild(s);
    }
});
