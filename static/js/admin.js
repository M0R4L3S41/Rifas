let rifasData = [];
let metodosPagoData = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
    setupEventListeners();
});

function setupEventListeners() {
    const formNuevaRifa = document.getElementById('form-nueva-rifa');
    if (formNuevaRifa) {
        formNuevaRifa.addEventListener('submit', crearNuevaRifa);
    }
    
    const formNuevoPago = document.getElementById('form-nuevo-pago');
    if (formNuevoPago) {
        formNuevoPago.addEventListener('submit', crearNuevoMetodoPago);
    }
}

function showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.className = `toast ${type === 'error' ? 'text-bg-danger' : type === 'success' ? 'text-bg-success' : 'text-bg-info'}`;

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

async function initializeAdmin() {
    const currentPage = window.location.pathname;
    
    if (currentPage === '/admin') {
        await loadDashboardData();
    } else if (currentPage === '/admin/rifas') {
        await loadRifasData();
    } else if (currentPage === '/admin/pagos') {
        await loadPagosData();
        await loadRifasSelect();
    }
}

async function loadDashboardData() {
    try {
        await Promise.all([
            loadEstadisticas(),
            loadRifasTabla()
        ]);
        updateTimestamp();
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showNotification('Error cargando datos del dashboard', 'error');
    }
}

async function loadEstadisticas() {
    try {
        const response = await fetch('/admin/api/estadisticas');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.estadisticas;
            document.getElementById('total-rifas').textContent = stats.total_rifas || 0;
            document.getElementById('total-compras').textContent = stats.total_compras || 0;
            document.getElementById('ingresos-confirmados').textContent = stats.ingresos_confirmados || 0;
            document.getElementById('ingresos-pendientes').textContent = stats.ingresos_pendientes || 0;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function loadRifasTabla() {
    try {
        const response = await fetch('/api/rifas-activas');
        const data = await response.json();
        
        const tbody = document.getElementById('tabla-rifas');
        if (!tbody) return;
        
        if (data.success && data.rifas.length > 0) {
            tbody.innerHTML = data.rifas.map(rifa => `
                <tr>
                    <td>${rifa.id}</td>
                    <td>${rifa.nombre}</td>
                    <td>$${rifa.precio_boleto}</td>
                    <td><span class="badge badge-success">${rifa.boletos_disponibles || 0}</span></td>
                    <td><span class="badge badge-warning">${rifa.boletos_vendidos || 0}</span></td>
                    <td>
                        <button class="btn btn-edit btn-sm" onclick="editarRifa(${rifa.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <a href="/admin/pagos" class="btn btn-primary btn-sm">
                            <i class="fas fa-credit-card"></i>
                        </a>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay rifas activas</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando rifas:', error);
    }
}

async function loadRifasData() {
    try {
        const response = await fetch('/api/rifas-activas');
        const data = await response.json();
        
        const tbody = document.getElementById('tabla-rifas-admin');
        if (!tbody) return;
        
        if (data.success && data.rifas.length > 0) {
            rifasData = data.rifas;
            tbody.innerHTML = data.rifas.map(rifa => `
                <tr>
                    <td>${rifa.id}</td>
                    <td>
                        ${rifa.imagen ? `<img src="/static/uploads/rifas/${rifa.imagen}" class="img-thumbnail" style="width: 50px; height: 50px; object-fit: cover;">` : '<i class="fas fa-image text-muted"></i>'}
                    </td>
                    <td>${rifa.nombre}</td>
                    <td>${rifa.rango_inicio} - ${rifa.rango_fin}</td>
                    <td>$${rifa.precio_boleto}</td>
                    <td>
                        <span class="status-indicator ${rifa.activa ? 'status-active' : 'status-inactive'}"></span>
                        ${rifa.activa ? 'Activa' : 'Inactiva'}
                    </td>
                    <td>
                        <button class="btn btn-edit btn-sm" onclick="editarRifa(${rifa.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-delete btn-sm" onclick="eliminarRifa(${rifa.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay rifas registradas</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando rifas:', error);
        showNotification('Error cargando rifas', 'error');
    }
}

async function crearNuevaRifa(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('numero_bot', document.getElementById('numero-bot').value);
    formData.append('nombre', document.getElementById('nombre-rifa').value);
    formData.append('descripcion', document.getElementById('descripcion-rifa').value);
    formData.append('rango_inicio', document.getElementById('rango-inicio').value);
    formData.append('rango_fin', document.getElementById('rango-fin').value);
    formData.append('precio_boleto', document.getElementById('precio-boleto').value);
    
    const imagenFile = document.getElementById('imagen-rifa').files[0];
    if (imagenFile) {
        formData.append('imagen', imagenFile);
    }
    
    try {
        const response = await fetch('/admin/api/crear-rifa', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Rifa creada exitosamente', 'success');
            document.getElementById('form-nueva-rifa').reset();
            await loadRifasData();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error creando rifa:', error);
        showNotification('Error creando rifa', 'error');
    }
}

async function loadPagosData() {
    try {
        const response = await fetch('/api/rifas-activas');
        const data = await response.json();
        
        if (data.success) {
            rifasData = data.rifas;
            await loadMetodosPago();
        }
    } catch (error) {
        console.error('Error cargando datos de pagos:', error);
        showNotification('Error cargando datos', 'error');
    }
}

async function loadRifasSelect() {
    const selectRifa = document.getElementById('select-rifa');
    const filtroRifa = document.getElementById('filtro-rifa');
    
    if (!selectRifa || !filtroRifa) return;
    
    try {
        const response = await fetch('/api/rifas-activas');
        const data = await response.json();
        
        if (data.success) {
            selectRifa.innerHTML = '<option value="">Seleccionar rifa...</option>';
            filtroRifa.innerHTML = '<option value="">Todas las rifas</option>';
            
            data.rifas.forEach(rifa => {
                const option1 = document.createElement('option');
                option1.value = rifa.id;
                option1.textContent = rifa.nombre;
                selectRifa.appendChild(option1);
                
                const option2 = document.createElement('option');
                option2.value = rifa.id;
                option2.textContent = rifa.nombre;
                filtroRifa.appendChild(option2);
            });
        }
    } catch (error) {
        console.error('Error cargando rifas para select:', error);
    }
}

async function loadMetodosPago() {
    const tbody = document.getElementById('tabla-pagos');
    if (!tbody) return;
    
    try {
        const response = await fetch('/admin/api/metodos-pago');
        const data = await response.json();
        
        if (data.success && data.metodosPago.length > 0) {
            metodosPagoData = data.metodosPago;
            tbody.innerHTML = data.metodosPago.map(metodo => `
                <tr>
                    <td>${metodo.id}</td>
                    <td>${metodo.rifa_nombre || 'Rifa eliminada'}</td>
                    <td>${metodo.banco}</td>
                    <td>${metodo.beneficiario}</td>
                    <td>${metodo.clabe || metodo.numero_cuenta || 'N/A'}</td>
                    <td><span class="badge badge-secondary">${metodo.tipo_cuenta}</span></td>
                    <td>
                        <span class="status-indicator ${metodo.activo ? 'status-active' : 'status-inactive'}"></span>
                        ${metodo.activo ? 'Activo' : 'Inactivo'}
                    </td>
                    <td>
                        <button class="btn btn-edit btn-sm" onclick="editarMetodoPago(${metodo.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-delete btn-sm" onclick="eliminarMetodoPago(${metodo.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            No hay métodos de pago registrados.
                            <br>Para agregar métodos de pago, usa el formulario de la derecha.
                        </div>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error cargando métodos de pago:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error cargando métodos de pago</td></tr>';
    }
}

async function crearNuevoMetodoPago(event) {
    event.preventDefault();
    
    const datosMetodo = {
        rifa_id: document.getElementById('select-rifa').value,
        banco: document.getElementById('banco').value,
        beneficiario: document.getElementById('beneficiario').value,
        numero_cuenta: document.getElementById('numero-cuenta').value,
        clabe: document.getElementById('clabe').value,
        tipo_cuenta: document.getElementById('tipo-cuenta').value
    };
    
    try {
        const response = await fetch('/admin/api/crear-metodo-pago', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosMetodo)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Método de pago creado exitosamente', 'success');
            document.getElementById('form-nuevo-pago').reset();
            await loadMetodosPago(); // Recargar la tabla
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error creando método de pago:', error);
        showNotification('Error creando método de pago', 'error');
    }
}

function toggleCuentaFields() {
    const tipoCuenta = document.getElementById('tipo-cuenta').value;
    const campoNumero = document.getElementById('campo-numero-cuenta');
    const campoClabe = document.getElementById('campo-clabe');
    
    campoNumero.style.display = 'none';
    campoClabe.style.display = 'none';
    
    if (tipoCuenta === 'CUENTA' || tipoCuenta === 'TARJETA') {
        campoNumero.style.display = 'block';
    } else if (tipoCuenta === 'CLABE') {
        campoClabe.style.display = 'block';
    }
}

function filtrarPorRifa() {
    const rifaSeleccionada = document.getElementById('filtro-rifa').value;
    const tbody = document.getElementById('tabla-pagos');
    
    if (!tbody) return;
    
    // Si no hay filtro, mostrar todos
    if (!rifaSeleccionada) {
        loadMetodosPago();
        return;
    }
    
    // Filtrar métodos de pago por rifa
    const metodosFiltrados = metodosPagoData.filter(metodo => 
        metodo.rifa_id == rifaSeleccionada
    );
    
    if (metodosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay métodos de pago para esta rifa</td></tr>';
    } else {
        tbody.innerHTML = metodosFiltrados.map(metodo => `
            <tr>
                <td>${metodo.id}</td>
                <td>${metodo.rifa_nombre || 'N/A'}</td>
                <td>${metodo.banco}</td>
                <td>${metodo.beneficiario}</td>
                <td>${metodo.clabe || metodo.numero_cuenta || 'N/A'}</td>
                <td><span class="badge badge-secondary">${metodo.tipo_cuenta}</span></td>
                <td>
                    <span class="status-indicator ${metodo.activo ? 'status-active' : 'status-inactive'}"></span>
                    ${metodo.activo ? 'Activo' : 'Inactivo'}
                </td>
                <td>
                    <button class="btn btn-edit btn-sm" onclick="editarMetodoPago(${metodo.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-delete btn-sm" onclick="eliminarMetodoPago(${metodo.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

function editarMetodoPago(id) {
    showNotification('Función de edición de método de pago en desarrollo', 'info');
}

async function eliminarMetodoPago(id) {
    if (!confirm('¿Estás seguro de eliminar este método de pago? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/api/eliminar-metodo-pago/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Método de pago eliminado exitosamente', 'success');
            await loadMetodosPago();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error eliminando método de pago:', error);
        showNotification('Error eliminando método de pago', 'error');
    }
}

function editarRifa(id) {
    const rifa = rifasData.find(r => r.id === id);
    if (!rifa) {
        showNotification('Rifa no encontrada', 'error');
        return;
    }
    
    document.getElementById('edit-rifa-id').value = rifa.id;
    document.getElementById('edit-numero-bot').value = rifa.numero_bot;
    document.getElementById('edit-nombre-rifa').value = rifa.nombre;
    document.getElementById('edit-descripcion-rifa').value = rifa.descripcion || '';
    document.getElementById('edit-precio-boleto').value = rifa.precio_boleto;
    document.getElementById('edit-activa').value = rifa.activa ? '1' : '0';
    
    const modal = new bootstrap.Modal(document.getElementById('modal-editar-rifa'));
    modal.show();
}

async function guardarEdicionRifa() {
    const rifaId = document.getElementById('edit-rifa-id').value;
    
    const datosRifa = {
        numero_bot: document.getElementById('edit-numero-bot').value,
        nombre: document.getElementById('edit-nombre-rifa').value,
        descripcion: document.getElementById('edit-descripcion-rifa').value,
        precio_boleto: document.getElementById('edit-precio-boleto').value,
        activa: document.getElementById('edit-activa').value === '1'
    };
    
    try {
        const response = await fetch(`/admin/api/actualizar-rifa/${rifaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosRifa)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Rifa actualizada exitosamente', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modal-editar-rifa'));
            modal.hide();
            await loadRifasData();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error actualizando rifa:', error);
        showNotification('Error actualizando rifa', 'error');
    }
}

async function eliminarRifa(id) {
    if (!confirm('¿Estás seguro de eliminar esta rifa? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/api/eliminar-rifa/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Rifa eliminada exitosamente', 'success');
            await loadRifasData();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error eliminando rifa:', error);
        showNotification('Error eliminando rifa', 'error');
    }
}

function refreshData() {
    initializeAdmin();
    showNotification('Datos actualizados', 'success');
}

function refreshRifas() {
    loadRifasData();
    showNotification('Rifas actualizadas', 'success');
}

function updateTimestamp() {
    const timestampElement = document.getElementById('ultima-actualizacion');
    if (timestampElement) {
        timestampElement.textContent = new Date().toLocaleString('es-MX');
    }
}

async function logout() {
    try {
        await fetch('/admin/api/logout', { method: 'POST' });
        window.location.href = '/admin/login';
    } catch (error) {
        console.error('Error en logout:', error);
        window.location.href = '/admin/login';
    }
}