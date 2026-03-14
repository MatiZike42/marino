import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// RRHH Logic
let jobsData = [];

// Determine if admin
const isAdminUser = localStorage.getItem('isAdmin') === 'true';

const defaultJobs = [
    {
        id: "job_1",
        title: "Vendedor/a de Salón",
        type: "Full-time",
        location: "Gálvez, Santa Fe",
        desc: "Buscamos una persona proactiva, con marcado perfil comercial y conocimientos (o ganas de aprender) sobre materiales de construcción en seco. Tareas principales: atención al público, elaboración de presupuestos, asesoramiento técnico.",
        date: "2026-03-05"
    },
    {
        id: "job_2",
        title: "Chofer / Repartidor",
        type: "Full-time",
        location: "Gálvez y Zona",
        desc: "Nos encontramos en la búsqueda de un chofer para reparto de materiales. Se requiere: Carnet de conducir profesional vigente, experiencia en puestos similares, buen trato con los clientes y responsabilidad en el manejo de cargas.",
        date: "2026-03-10"
    }
];

// Initialize mock jobs
async function initializeJobs() {
    try {
        const querySnapshot = await getDocs(collection(db, "jobs"));
        jobsData = [];
        querySnapshot.forEach((doc) => {
            jobsData.push({ id: doc.id, ...doc.data() });
        });
        
        if (jobsData.length === 0 && isAdminUser) {
             for (const j of defaultJobs) {
                 await saveJob(j);
                 jobsData.push(j);
             }
        } else if (jobsData.length === 0) {
             jobsData = [...defaultJobs];
        }
        
        renderJobs();
    } catch (e) {
        console.error("Error loading jobs: ", e);
        alert("Error cargando búsquedas laborales.");
    }
}

async function saveJob(job) {
    await setDoc(doc(db, "jobs", String(job.id)), job);
}

// Render Jobs
function renderJobs() {
    const grid = document.getElementById('jobs-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (jobsData.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 1.1rem; padding: 2rem;">No hay búsquedas activas en este momento. Dejanos tu CV en la postulación general.</p>';
        return;
    }

    // Sort by newest first
    const sortedJobs = [...jobsData].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedJobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card glass';

        // Format Date
        const dateObj = new Date(job.date);
        const formattedDate = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

        card.innerHTML = `
            <span class="type">${job.type}</span>
            <h3>${job.title}</h3>
            <div class="job-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="fas fa-calendar-alt"></i> Publicado: ${formattedDate}</span>
            </div>
            <p>${job.desc.replace(/\n/g, '<br>')}</p>
            
            <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <button class="btn btn-secondary btn-apply" data-id="${job.id}" data-title="${job.title}" style="margin-left: 0; width: 100%; padding: 0.5rem 1rem; border-color: var(--accent-color); color: var(--accent-color);">
                    Postularse
                </button>
                
                ${isAdminUser ? `
                <div class="admin-controls" style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary" onclick="editJob('${job.id}')" style="flex: 1; border-radius: 50px; padding: 0.5rem;">
                       <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteJob('${job.id}')" style="flex: 1; border-radius: 50px; padding: 0.5rem;">
                       <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });

    // Add event listeners to apply buttons
    document.querySelectorAll('.btn-apply').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const title = e.target.getAttribute('data-title');
            openApplyModal(id, title);
        });
    });
}

// Admin Functions
window.editJob = window.editJob || async function (id) {
    const j = jobsData.find(x => x.id === id);
    if (!j) return;

    document.getElementById('j-id').value = j.id;
    document.getElementById('j-title').value = j.title;
    document.getElementById('j-type').value = j.type;
    document.getElementById('j-location').value = j.location;
    document.getElementById('j-desc').value = j.desc;

    document.getElementById('modal-job-title').innerText = 'Editar Búsqueda';
    document.getElementById('addJobModal').style.display = 'flex';
}

window.deleteJob = window.deleteJob || async function (id) {
    if (confirm("¿Estás seguro de que deseas eliminar esta oferta de empleo?")) {
        try {
            await deleteDoc(doc(db, "jobs", String(id)));
            jobsData = jobsData.filter(j => j.id !== id);
            renderJobs();
        } catch(e) { console.error(e); }
    }
}

// Modals Handling
let applyModal, addJobModal;

function openApplyModal(id, title) {
    applyModal.style.display = 'flex';
    document.getElementById('apply-job-id').value = id;
    document.getElementById('apply-job-title').innerText = title;
}

document.addEventListener('DOMContentLoaded', () => {
    // Only init if we are on RRHH page
    if (!document.getElementById('jobs-grid')) return;

    initializeJobs();
    renderJobs();

    // DOM Elements
    const btnAddJob = document.getElementById('btn-add-job');
    applyModal = document.getElementById('applyModal');
    addJobModal = document.getElementById('addJobModal');

    // Auth Check -> Show Admin Adding Button
    if (isAdminUser && btnAddJob) {
        btnAddJob.style.display = 'inline-block';
    }

    // Modal Close Triggers
    document.getElementById('close-apply-modal').addEventListener('click', () => applyModal.style.display = 'none');

    if (btnAddJob) {
        document.getElementById('close-job-modal').addEventListener('click', () => addJobModal.style.display = 'none');
        btnAddJob.addEventListener('click', () => {
            document.getElementById('j-id').value = '';
            document.getElementById('modal-job-title').innerText = 'Publicar Nueva Búsqueda';
            const addJobForm = document.getElementById('add-job-form');
            if (addJobForm) addJobForm.reset();
            addJobModal.style.display = 'flex';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === applyModal) applyModal.style.display = 'none';
        if (e.target === addJobModal) addJobModal.style.display = 'none';
    });

    // GAS Endpoint
    const GAS_URL = "https://script.google.com/macros/s/AKfycbzO6cIkWhCij1jRUVdoztY5hVdOLja-xXinqFmk9SQ4OkWwGCvwlnYmWKAZqZ3yIBFs/exec";

    // Form Submissions - General CV
    const generalForm = document.getElementById('general-cv-form');
    if (generalForm) {
        
        // Auto-fill logged in user basic data if possible
        const storedName = localStorage.getItem('userName');
        const storedEmail = localStorage.getItem('userEmail');
        if (storedName) {
            const inputs = generalForm.querySelectorAll('input[type="text"]');
            if (inputs.length >= 2) {
                // simple split for First/Last name visual
                const parts = storedName.split(' ');
                inputs[0].value = parts[0] || '';
                inputs[1].value = parts.slice(1).join(' ') || '';
            }
        }
        if (storedEmail) {
            const emailInput = generalForm.querySelector('input[type="email"]');
            if (emailInput) emailInput.value = storedEmail;
        }

        generalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = generalForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Enviando...';

            const inputs = generalForm.querySelectorAll('input, select, textarea');
            const fileInput = generalForm.querySelector('input[type="file"]');
            
            let requestData = {
                tipo: "RRHH",
                nombre: inputs[0].value + " " + inputs[1].value,
                email: inputs[2].value,
                telefono: inputs[3].value,
                area: inputs[4].value,
                mensaje: inputs[6].value, // inputs[5] is file
                busqueda: "POSTULACIÓN GENERAL (Espontánea)"
            };

            await processAndSendRRHH(fileInput, requestData, generalForm, submitBtn, originalText, '¡Gracias por enviarnos tu CV! Lo guardamos en nuestra base de datos.');
        });
    }

    // Form Submissions - Specific Job Application
    const applyForm = document.getElementById('apply-job-form');
    if (applyForm) {
        
        // Auto-fill
        const storedName = localStorage.getItem('userName');
        const storedEmail = localStorage.getItem('userEmail');
        if (storedName) {
             const nameInput = applyForm.querySelectorAll('input[type="text"]')[0];
             if(nameInput && nameInput.id !== "apply-job-id") nameInput.value = storedName;
        }
        if (storedEmail) {
             const emailInput = applyForm.querySelector('input[type="email"]');
             if(emailInput) emailInput.value = storedEmail;
        }

        applyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const jobTitle = document.getElementById('apply-job-title').innerText;
            const submitBtn = applyForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Enviando...';

            const inputs = applyForm.querySelectorAll('input:not([type="hidden"])');
            const fileInput = applyForm.querySelector('input[type="file"]');
            
            let requestData = {
                tipo: "RRHH",
                nombre: inputs[0].value,
                email: inputs[1].value,
                telefono: inputs[2].value,
                busqueda: `APLICA A: ${jobTitle}`
            };

            await processAndSendRRHH(fileInput, requestData, applyForm, submitBtn, originalText, `¡Tu postulación para "${jobTitle}" fue enviada con éxito!`);
        });
    }

    // Helper for both RRHH forms 
    async function processAndSendRRHH(fileInput, requestData, formElement, submitBtn, originalText, successMsg) {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = async function() {
                const base64 = reader.result.split(',')[1];
                requestData.file = base64;
                requestData.filename = file.name;
                requestData.mimeType = file.type;
                
                sendData(requestData);
            };
            reader.onerror = function() {
                showToast('Error al leer el archivo CV. Intente de nuevo.', 'error');
                resetBtn(submitBtn, originalText);
            };
        } else {
             showToast('El CV adjunto es obligatorio para Recursos Humanos.', 'error');
             resetBtn(submitBtn, originalText);
        }

        async function sendData(data) {
            try {
                const response = await fetch(GAS_URL, {
                    method: "POST",
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if(result.status === "success") {
                    showToast(successMsg, 'success');
                    formElement.reset();
                    if(applyModal) applyModal.style.display = 'none';
                } else {
                    throw new Error("Server response error");
                }
            } catch (error) {
                console.error('Error:', error);
                showToast("Ocurrió un error al enviar tu CV. Por favor, intentá más tarde.", 'error');
            } finally {
                resetBtn(submitBtn, originalText);
            }
        }
    }

    function resetBtn(btn, text) {
        btn.disabled = false;
        btn.innerHTML = text;
    }

    // Admin Add/Edit Job Form
    const addJobForm = document.getElementById('add-job-form');
    if (addJobForm) {
        addJobForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Guardando...';

            try {
                const editId = document.getElementById('j-id').value;
                const title = document.getElementById('j-title').value;
                const type = document.getElementById('j-type').value;
                const location = document.getElementById('j-location').value;
                const desc = document.getElementById('j-desc').value;

                if (editId) {
                    // Edit existing
                    const idx = jobsData.findIndex(j => j.id == editId);
                    if (idx !== -1) {
                        jobsData[idx].title = title;
                        jobsData[idx].type = type;
                        jobsData[idx].location = location;
                        jobsData[idx].desc = desc;
                        await saveJob(jobsData[idx]);
                    }
                } else {
                    // Add new
                    const today = new Date().toISOString().split('T')[0];
                    const newId = 'job_' + Date.now();
                    const newObj = {
                        id: newId,
                        title,
                        type,
                        location,
                        desc,
                        date: today
                    };
                    await saveJob(newObj);
                    jobsData.unshift(newObj);
                }

                addJobModal.style.display = 'none';
                addJobForm.reset();
                renderJobs();
            } catch(e) {
                console.error(e);
                alert("Error al guardar la posición.");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Publicar Vacante';
            }
        });
    }
});
