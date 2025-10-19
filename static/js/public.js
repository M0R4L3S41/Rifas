let rifaActual = null;
let metodosPago = [];
let boletosDisponibles = [];
let numerosSeleccionados = [];
let datosCompra = {};

document.addEventListener('DOMContentLoaded', function() {
    cargarRifasActivas();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('form-compra').addEventListener('submit', procesarCompra);
    document.getElementById('buscar-numero').addEventListener('input', buscarNumero);
    document.getElementById('btn-enviar-whatsapp').addEventListener('click', enviarWhatsApp);
}

function showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.className = `toast ${type === 'error' ? 'text-bg-danger' : type === 'success' ? 'text-bg-success' : 'text-bg-info'}`;

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

async function cargarRifasActivas() {
    try {
        const response = await fetch('/api/rifas-activas');
        const data = await response.json();

        if (data.success && data.rifas.length > 0) {
            rifaActual = data.rifas[0];
            await cargarDetallesRifa(rifaActual.id);
        } else {
            mostrarNoRifas();
        }
    } catch (error) {
        console.error('Error cargando rifas:', error);
        showNotification('Error al cargar rifas disponibles', 'error');
        mostrarNoRifas();
    }
}

async function cargarDetallesRifa(rifaId) {
    try {
        const response = await fetch(`/api/rifa/${rifaId}`);
        const data = await response.json();

        if (data.success) {
            rifaActual = data.rifa;
            metodosPago = data.metodosPago;
            boletosDisponibles = data.boletosDisponibles;

            renderizarRifa();
            renderizarMetodosPago();
            renderizarNumeros();
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('contenido-rifas').style.display = 'block';
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error cargando detalles de rifa:', error);
        showNotification('Error al cargar detalles de la rifa', 'error');
        mostrarNoRifas();
    }
}

function renderizarRifa() {
    document.getElementById('nombre-rifa').textContent = rifaActual.nombre;
    document.getElementById('descripcion-rifa').textContent = rifaActual.descripcion || 'Sin descripción';
    document.getElementById('precio-boleto').textContent = rifaActual.precio_boleto;
    document.getElementById('total-disponibles').textContent = boletosDisponibles.length;

    const imagenRifa = document.getElementById('imagen-rifa');
    if (rifaActual.imagen) {
        imagenRifa.src = `/static/uploads/rifas/${rifaActual.imagen}`;
        imagenRifa.alt = rifaActual.nombre;
    } else {
        imagenRifa.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGVlMmU2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBkZSBSaWZhPC90ZXh0Pjwvc3ZnPg==';
        imagenRifa.alt = 'Imagen de rifa no disponible';
    }
}

function renderizarMetodosPago() {
    const selectMetodo = document.getElementById('metodo-pago');
    const infoContainer = document.getElementById('metodos-pago-info');

    selectMetodo.innerHTML = '<option value="">Seleccionar banco</option>';
    infoContainer.innerHTML = '';

    metodosPago.forEach(metodo => {
        const option = document.createElement('option');
        option.value = metodo.id;
        option.textContent = `${metodo.banco} - ${metodo.beneficiario}`;
        selectMetodo.appendChild(option);

        const infoCard = document.createElement('div');
        infoCard.className = 'metodo-pago-card';
        infoCard.innerHTML = `
            <h6 class="mb-1">${metodo.banco}</h6>
            <p class="mb-1"><strong>${metodo.beneficiario}</strong></p>
            <p class="mb-0 small text-muted">
                ${metodo.tipo_cuenta}: ${metodo.clabe || metodo.numero_cuenta || 'No especificado'}
            </p>
        `;
        infoContainer.appendChild(infoCard);
    });
}

function renderizarNumeros() {
    const container = document.getElementById('numeros-container');
    container.innerHTML = '';

    boletosDisponibles.forEach(numero => {
        const numeroElement = document.createElement('div');
        numeroElement.className = 'numero-item';
        numeroElement.textContent = numero;
        numeroElement.onclick = () => toggleNumero(numero, numeroElement);
        container.appendChild(numeroElement);
    });
}

function toggleNumero(numero, element) {
    const index = numerosSeleccionados.indexOf(numero);
    
    if (index > -1) {
        numerosSeleccionados.splice(index, 1);
        element.classList.remove('seleccionado');
    } else {
        numerosSeleccionados.push(numero);
        element.classList.add('seleccionado');
    }
    
    actualizarResumen();
}

function actualizarResumen() {
    const cantidad = numerosSeleccionados.length;
    const total = cantidad * parseFloat(rifaActual.precio_boleto);
    
    document.getElementById('contador-seleccionados').textContent = cantidad;
    document.getElementById('resumen-boletos').textContent = cantidad;
    document.getElementById('resumen-total').textContent = total.toFixed(2);
    
    const listaContainer = document.getElementById('numeros-seleccionados-lista');
    listaContainer.innerHTML = '';
    
    numerosSeleccionados.forEach(numero => {
        const badge = document.createElement('span');
        badge.className = 'numero-seleccionado-badge';
        badge.textContent = numero;
        listaContainer.appendChild(badge);
    });
    
    const btnProceder = document.getElementById('btn-proceder');
    btnProceder.disabled = cantidad === 0;
}

function buscarNumero() {
    const busqueda = document.getElementById('buscar-numero').value;
    const numeroItems = document.querySelectorAll('.numero-item');
    
    numeroItems.forEach(item => {
        item.classList.remove('search-highlight');
        if (busqueda && item.textContent.includes(busqueda)) {
            item.classList.add('search-highlight');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

async function procesarCompra(event) {
    event.preventDefault();
    
    const nombreCliente = document.getElementById('nombre-cliente').value.trim();
    const telefono = document.getElementById('telefono-cliente').value.trim();
    const email = document.getElementById('email-cliente').value.trim();
    const metodoPagoId = document.getElementById('metodo-pago').value;
    
    if (!nombreCliente) {
        showNotification('El nombre es obligatorio', 'error');
        return;
    }
    
    if (numerosSeleccionados.length === 0) {
        showNotification('Debes seleccionar al menos un número', 'error');
        return;
    }
    
    if (!metodoPagoId) {
        showNotification('Debes seleccionar un método de pago', 'error');
        return;
    }
    
    const btnProceder = document.getElementById('btn-proceder');
    btnProceder.disabled = true;
    btnProceder.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Procesando...';
    
    try {
        const datosCompra = {
            rifa_id: rifaActual.id,
            nombre_cliente: nombreCliente,
            telefono: telefono,
            email: email,
            metodo_pago_id: parseInt(metodoPagoId),
            numeros_seleccionados: numerosSeleccionados
        };
        
        const response = await fetch('/api/crear-compra', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosCompra)
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarConfirmacion(result, datosCompra);
        } else {
            showNotification(result.error, 'error');
        }
        
    } catch (error) {
        console.error('Error procesando compra:', error);
        showNotification('Error procesando la compra. Intenta nuevamente.', 'error');
    } finally {
        btnProceder.disabled = false;
        btnProceder.innerHTML = '<i class="fas fa-credit-card"></i> Proceder al Pago';
    }
}

function mostrarConfirmacion(resultado, datosCompra) {
    const metodoPago = metodosPago.find(m => m.id == datosCompra.metodo_pago_id);
    
    document.getElementById('concepto-generado').textContent = resultado.concepto;
    document.getElementById('total-final').textContent = resultado.total_pagar.toFixed(2);
    document.getElementById('boletos-final').textContent = numerosSeleccionados.join(', ');
    
    window.datosCompra = {
        concepto: resultado.concepto,
        total: resultado.total_pagar,
        boletos: numerosSeleccionados.join(', '),
        cliente: datosCompra.nombre_cliente,
        telefono: datosCompra.telefono,
        banco_destino: metodoPago.banco,
        beneficiario: metodoPago.beneficiario,
        cuenta: metodoPago.clabe || metodoPago.numero_cuenta,
        numero_bot: rifaActual.numero_bot
    };
    
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
    modal.show();
}

function enviarWhatsApp() {
    if (!window.datosCompra) {
        showNotification('Error: No hay datos de compra disponibles', 'error');
        return;
    }
    
    const datos = window.datosCompra;
    const fecha = new Date().toLocaleString('es-MX');
    
    const mensaje = `🎉 NUEVA COMPRA DE RIFA 🎉

👤 Cliente: ${datos.cliente}
📱 Teléfono: ${datos.telefono || 'No proporcionado'}
🏦 Banco destino: ${datos.banco_destino}

🎟️ Números seleccionados: ${datos.boletos}
💰 Total a pagar: $${datos.total}
🔖 Concepto: ${datos.concepto}

⏰ Fecha: ${fecha}

Estado: ⏳ PENDIENTE DE PAGO`;

    const numeroBot = datos.numero_bot.replace(/\+/g, '');
    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroBot}&text=${mensajeCodificado}`;
    
    window.open(urlWhatsApp, '_blank');
}

function mostrarNoRifas() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('no-rifas').style.display = 'block';
}
