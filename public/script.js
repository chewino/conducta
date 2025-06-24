// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDWi9sXGBxKGqrf88Uj_5tF6XKfDTo81u8",
    authDomain: "reporte-167e8.firebaseapp.com",
    projectId: "reporte-167e8",
    storageBucket: "reporte-167e8.firebasestorage.app",
    messagingSenderId: "5826504186",
    appId: "1:5826504186:web:08beddad13e92094bf3043",
    measurementId: "G-9JGMD4WGV8"
};

// --- INICIALIZACIÓN DE FIREBASE ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// --- REFERENCIAS GLOBALES AL DOM ---
const userInfoSpan = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');

// =================================================================================
// --- LÓGICA PRINCIPAL DE AUTENTICACIÓN Y NAVEGACIÓN (CORREGIDA Y SIMPLIFICADA) ---
// =================================================================================

auth.onAuthStateChanged(async (user) => {
    // 1. Ocultar todo por defecto
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.add('hidden'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.add('hidden'));
    logoutBtn.classList.add('hidden');
    userInfoSpan.textContent = '';

    if (user) {
        // 2. Si hay un usuario, obtener sus datos
        const userDoc = await db.collection('users').doc(user.uid).get();
        logoutBtn.classList.remove('hidden');

        if (userDoc.exists) {
            const userData = userDoc.data();
            userInfoSpan.textContent = `Hola, ${userData.nombre || user.email}`;

            if (userData.status === 'pending') {
                // Muestra mensaje de pendiente
                showPane('auth');
                document.getElementById('auth-section').innerHTML = `<div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md text-center">
                    <p class="info-message">Tu cuenta está pendiente de aprobación por un administrador.</p>
                </div>`;
            } else {
                // 3. Si está aprobado, muestra el panel según su rol
                const role = userData.rol;
                userInfoSpan.textContent = `Bienvenido, ${userData.nombre || user.email} (${role})`;

                if (role === 'Profesor') {
                    showPane('teacher');
                    initializeTeacherListeners();
                } else if (role === 'Orientador') {
                    showPane('orientador');
                    // initializeOrientadorListeners(); // Futura función
                } else if (role === 'Administrador') {
                    showPane('admin');
                    initializeAdminListeners();
                    showAdminTab('users'); // Mostrar la primera sub-pestaña por defecto
                }
            }
        } else {
            // Error en el perfil, mostrar panel de autenticación
            showPane('auth');
            initializeAuthForms();
            document.getElementById('auth-error').textContent = 'Error en el perfil. Contacta al soporte.';
        }
    } else {
        // 4. No hay usuario, mostrar panel de autenticación
        showPane('auth');
        initializeAuthForms();
    }
});

/**
 * Función centralizada para mostrar una pestaña y su panel correspondiente.
 * @param {string} paneName - El nombre del panel a mostrar (ej: 'auth', 'admin').
 */
function showPane(paneName) {
    // Muestra la pestaña de navegación
    const tabToShow = document.getElementById(`tab-${paneName}`);
    if (tabToShow) {
        tabToShow.classList.remove('hidden');
        tabToShow.classList.add('active');
    }
    
    // Muestra el contenido del panel
    const paneToShow = document.getElementById(`${paneName}-section`);
    if (paneToShow) {
        paneToShow.classList.remove('hidden');
    }
}

function showAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-button').forEach(button => button.classList.remove('active'));
    
    document.getElementById(`admin-pane-${tabName}`).classList.remove('hidden');
    document.getElementById(`admin-tab-${tabName}`).classList.add('active');

    // Cargar datos dinámicamente al cambiar de pestaña
    if (tabName === 'validate') loadPendingUsers();
    if (tabName === 'students') loadStudents();
    if (tabName === 'groups') loadGroups();
}

logoutBtn.addEventListener('click', () => auth.signOut());


// =================================================================================
// --- INICIALIZADORES DE EVENTOS POR ROL ---
// =================================================================================

function initializeAuthForms() {
    // Lógica para formularios de login/registro... (sin cambios)
}

function initializeTeacherListeners() {
    // Lógica para la vista de profesor... (sin cambios)
}

function initializeAdminListeners() {
    document.querySelectorAll('.admin-tab-button').forEach(button => {
        button.addEventListener('click', (e) => showAdminTab(e.target.id.split('-')[2]));
    });
    initializeGroupCRUDListeners();
}

// =================================================================================
// --- CRUD DE GRUPOS (Sección completa sin cambios) ---
// =================================================================================

function initializeGroupCRUDListeners() {
    const createGroupForm = document.getElementById('create-group-form');
    const groupsList = document.getElementById('groups-list');
    const editModal = document.getElementById('edit-group-modal');
    const editForm = document.getElementById('edit-group-form');
    const cancelEditBtn = document.getElementById('cancel-edit-group-btn');
    const saveEditBtn = document.getElementById('save-edit-group-btn');

    // 1. CREAR un nuevo grupo
    createGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-group-name').value.trim();
        const description = document.getElementById('new-group-description').value.trim();
        const messageEl = document.getElementById('create-group-message');

        if (!name) return;

        try {
            messageEl.textContent = 'Creando grupo...';
            messageEl.className = 'info-message';
            
            await db.collection('groups').add({
                name: name,
                description: description,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            messageEl.textContent = '¡Grupo creado exitosamente!';
            messageEl.className = 'success-message';
            createGroupForm.reset();
            loadGroups(); // Recargar la lista
            setTimeout(() => messageEl.textContent = '', 3000);

        } catch (error) {
            console.error("Error al crear grupo:", error);
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'error-message';
        }
    });

    // 2. Escuchar clics para EDITAR o ELIMINAR en la lista de grupos
    groupsList.addEventListener('click', async (e) => {
        const target = e.target;
        const groupId = target.dataset.id;
        
        if (!groupId) return;

        if (target.matches('.delete-group-btn')) {
            if (confirm(`¿Estás seguro de que quieres eliminar este grupo?`)) {
                try {
                    await db.collection('groups').doc(groupId).delete();
                    loadGroups();
                } catch (error) {
                    console.error("Error al eliminar grupo:", error);
                    alert(`Error al eliminar: ${error.message}`);
                }
            }
        }
        
        if (target.matches('.edit-group-btn')) {
            try {
                const doc = await db.collection('groups').doc(groupId).get();
                if (doc.exists) {
                    const data = doc.data();
                    document.getElementById('edit-group-id').value = doc.id;
                    document.getElementById('edit-group-name').value = data.name;
                    document.getElementById('edit-group-description').value = data.description || '';
                    editModal.classList.remove('hidden');
                }
            } catch (error) {
                console.error("Error al obtener datos para editar:", error);
            }
        }
    });
    
    // 3. GUARDAR CAMBIOS (usando el botón de guardar)
    saveEditBtn.addEventListener('click', async () => {
        const groupId = document.getElementById('edit-group-id').value;
        const newName = document.getElementById('edit-group-name').value.trim();
        const newDescription = document.getElementById('edit-group-description').value.trim();

        if (!groupId || !newName) return;

        try {
            await db.collection('groups').doc(groupId).update({
                name: newName,
                description: newDescription
            });
            editModal.classList.add('hidden');
            loadGroups();
        } catch (error) {
            console.error("Error al actualizar grupo:", error);
            alert(`Error al guardar: ${error.message}`);
        }
    });

    // 4. CANCELAR edición y cerrar el modal
    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });
}


// =================================================================================
// --- FUNCIONES PARA CARGAR DATOS (LEER) ---
// =================================================================================

async function loadGroups() {
    const groupsListDiv = document.getElementById('groups-list');
    if (!groupsListDiv) return;
    groupsListDiv.innerHTML = '<p class="text-gray-500">Cargando grupos...</p>';

    try {
        const snapshot = await db.collection('groups').orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            groupsListDiv.innerHTML = '<p class="text-gray-600">No hay grupos registrados.</p>';
            return;
        }

        groupsListDiv.innerHTML = '';
        const list = document.createElement('ul');
        list.className = 'space-y-3';
        snapshot.forEach(doc => {
            const group = doc.data();
            const li = document.createElement('li');
            li.className = 'bg-white p-4 rounded-lg shadow border flex justify-between items-center';
            li.innerHTML = `
                <div>
                    <h4 class="font-bold text-lg text-gray-800">${group.name}</h4>
                    <p class="text-sm text-gray-600">${group.description || 'Sin descripción'}</p>
                </div>
                <div>
                    <button class="edit-group-btn text-indigo-600 hover:text-indigo-900 text-sm font-medium" data-id="${doc.id}">Editar</button>
                    <button class="delete-group-btn text-red-600 hover:text-red-900 text-sm font-medium ml-4" data-id="${doc.id}">Eliminar</button>
                </div>
            `;
            list.appendChild(li);
        });
        groupsListDiv.appendChild(list);

    } catch (error) {
        console.error('Error al cargar los grupos:', error);
        groupsListDiv.innerHTML = `<p class="text-red-500">Error al cargar: ${error.message}</p>`;
    }
}

async function loadStudents() {
    // Futura lógica para cargar alumnos
    const studentsListDiv = document.getElementById('students-list');
    studentsListDiv.innerHTML = '<p class="text-gray-600">La funcionalidad para mostrar alumnos aún no está implementada.</p>';
}

async function loadPendingUsers() {
    // Lógica para cargar usuarios pendientes... (sin cambios)
}

async function loadTeacherReports() {
    // Lógica para cargar reportes del profesor... (sin cambios)
}