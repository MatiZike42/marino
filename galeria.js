import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const CLOUDINARY_URL_IMAGE = "https://api.cloudinary.com/v1_1/doissrwhj/image/upload";
const CLOUDINARY_URL_VIDEO = "https://api.cloudinary.com/v1_1/doissrwhj/video/upload";
const CLOUDINARY_PRESET = "marino_preset";

let videosData = [];
const isAdminUser = localStorage.getItem('isAdmin') === 'true';

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

        if (videosData.length === 0 && isAdminUser) {
            for (const v of defaultVideos) {
                await setDoc(doc(db, "videos", v.id), v);
                videosData.push(v);
            }
        } else if (videosData.length === 0) {
            videosData = [...defaultVideos];
        }

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
                    <img src="${v.thumb || '1.png'}" alt="${v.title}">
                    <div class="play-overlay">
                        <div class="play-btn"><i class="fas fa-play"></i></div>
                    </div>
                </div>
                <div class="video-info">
                    <h3>${v.title}</h3>
                    <p>${v.desc || ''}</p>
                    ${isAdminUser ? `
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
                    <img src="${v.thumb || '1.png'}" alt="${v.title}">
                    <div class="play-icon-m"><i class="fas fa-play"></i></div>
                </div>
                <div class="video-info-m">
                    <h3>${v.title}</h3>
                    <p>${v.desc || ''}</p>
                    ${isAdminUser ? `
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
    
    let embedHtml = '';
    const url = video.url;

    if (video.type === 'youtube') {
        const vidId = extractYoutubeId(url);
        embedHtml = `<iframe src="https://www.youtube.com/embed/${vidId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else if (video.type === 'instagram') {
        const cleanUrl = url.split('?')[0];
        embedHtml = `<iframe src="${cleanUrl}embed" allowtransparency="true" frameborder="0" scrolling="no"></iframe>`;
    } else if (video.type === 'facebook') {
        embedHtml = `<iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
    } else if (video.type === 'tiktok') {
        const vidId = url.split('/').pop();
        embedHtml = `<iframe src="https://www.tiktok.com/embed/v2/${vidId}" allowfullscreen></iframe>`;
    } else {
        embedHtml = `<video src="${url}" controls autoplay style="width:100%; height:100%;"></video>`;
    }

    target.innerHTML = embedHtml;
    modal.style.display = 'flex';
};

function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Close player
const closePlayerBtn = document.getElementById('close-player') || document.getElementById('m-close-player');
if (closePlayerBtn) {
    closePlayerBtn.onclick = () => {
        const modal = document.getElementById('video-player-modal') || document.getElementById('m-player-modal');
        const target = document.getElementById('player-target') || document.getElementById('m-player-target');
        modal.style.display = 'none';
        target.innerHTML = '';
    };
}

// Admin Logic
function setupAdminUI() {
    if (!isAdminUser) return;
    
    const btnAdd = document.getElementById('btn-add-video') || document.getElementById('m-btn-add-video');
    if (btnAdd) btnAdd.style.display = 'block';

    const modal = document.getElementById('videoModal');
    const closeBtn = document.getElementById('close-video-modal');
    const form = document.getElementById('add-video-form');

    if (btnAdd && modal) {
        btnAdd.onclick = () => {
            form.reset();
            document.getElementById('v-id').value = '';
            document.getElementById('modal-video-title').innerText = 'Cargar Nuevo Video Multimedia';
            modal.style.display = 'flex';
        };
    }

    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';

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
                    thumb: thumb || '1.png'
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

document.addEventListener('DOMContentLoaded', initializeGaleria);
