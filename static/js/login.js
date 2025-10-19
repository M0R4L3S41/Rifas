document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    document.getElementById('usuario').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('password').focus();
        }
    });
    
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
    
    document.getElementById('usuario').addEventListener('input', clearAlerts);
    document.getElementById('password').addEventListener('input', clearAlerts);
}

async function handleLogin(event) {
    event.preventDefault();
    
    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;
    
    if (!usuario || !password) {
        showAlert('Por favor completa todos los campos', 'danger');
        return;
    }
    
    if (usuario.length < 3) {
        showAlert('El usuario debe tener al menos 3 caracteres', 'danger');
        return;
    }
    
    if (password.length < 6) {
        showAlert('La contraseña debe tener al menos 6 caracteres', 'danger');
        return;
    }
    
    setLoadingState(true);
    clearAlerts();
    
    try {
        const response = await fetch('/admin/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usuario: usuario,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`¡Bienvenido ${data.user.nombre_completo}! Redirigiendo al panel...`, 'success');
            
            document.getElementById('loginForm').reset();
            
            setTimeout(() => {
                window.location.href = '/admin';
            }, 1500);
            
        } else {
            showAlert(data.error || 'Error en el login', 'danger');
            document.getElementById('usuario').focus();
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        showAlert('Error de conexión. Verifica tu conexión a internet.', 'danger');
    } finally {
        setLoadingState(false);
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('password-toggle-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
    
    passwordInput.focus();
}

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    
    alertContainer.innerHTML = '';
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    
    const iconClass = getAlertIcon(type);
    
    alertDiv.innerHTML = `
        <i class="${iconClass} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    if (type !== 'danger') {
        setTimeout(() => {
            const alertInstance = bootstrap.Alert.getOrCreateInstance(alertDiv);
            if (alertInstance) {
                alertInstance.close();
            }
        }, 5000);
    }
    
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getAlertIcon(type) {
    const icons = {
        'success': 'fas fa-check-circle',
        'danger': 'fas fa-exclamation-triangle',
        'warning': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle'
    };
    
    return icons[type] || icons['info'];
}

function clearAlerts() {
    const alertContainer = document.getElementById('alert-container');
    const alerts = alertContainer.querySelectorAll('.alert');
    
    alerts.forEach(alert => {
        const alertInstance = bootstrap.Alert.getOrCreateInstance(alert);
        if (alertInstance) {
            alertInstance.close();
        }
    });
}

function setLoadingState(loading) {
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginBtnLoading = document.getElementById('loginBtnLoading');
    const usuarioInput = document.getElementById('usuario');
    const passwordInput = document.getElementById('password');
    
    if (loading) {
        loginBtn.disabled = true;
        loginBtnText.style.display = 'none';
        loginBtnLoading.style.display = 'inline-flex';
        usuarioInput.disabled = true;
        passwordInput.disabled = true;
    } else {
        loginBtn.disabled = false;
        loginBtnText.style.display = 'inline-flex';
        loginBtnLoading.style.display = 'none';
        usuarioInput.disabled = false;
        passwordInput.disabled = false;
    }
}