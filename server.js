const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
require('dotenv').config();

const {
    initDatabase,
    verificarCredencialesAdmin,
    obtenerRifasActivas,
    obtenerRifaPorId,
    obtenerMetodosPagoPorRifa,
    obtenerBoletosDisponibles,
    crearCompra,
    generarConcepto,
    crearRifa,
    crearMetodoPago,
    obtenerEstadisticasGeneral,
    eliminarRifa,
    actualizarRifa,
    obtenerTodosLosMetodosPago,
    eliminarMetodoPago
    
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiar_este_secreto_en_produccion';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'static/uploads/rifas/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'static')));

async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1] || req.cookies?.auth_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token de acceso requerido'
            });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: 'Token inválido o expirado'
                });
            }
            req.user = decoded;
            next();
        });

    } catch (error) {
        console.error('Error en autenticación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}

async function authenticateHTML(req, res, next) {
    try {
        const token = req.cookies?.auth_token;

        if (!token) {
            return res.redirect('/admin/login');
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                res.clearCookie('auth_token');
                return res.redirect('/admin/login');
            }
            req.user = decoded;
            next();
        });

    } catch (error) {
        console.error('Error en autenticación HTML:', error);
        res.clearCookie('auth_token');
        res.redirect('/admin/login');
    }
}

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'admin', 'login.html'));
});

app.get('/admin', authenticateHTML, (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'admin', 'dashboard.html'));
});

app.get('/admin/rifas', authenticateHTML, (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'admin', 'rifas.html'));
});

app.get('/admin/pagos', authenticateHTML, (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'admin', 'pagos.html'));
});

app.post('/admin/api/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password) {
            return res.status(400).json({
                success: false,
                error: 'Usuario y contraseña requeridos'
            });
        }

        const authResult = await verificarCredencialesAdmin(usuario, password);

        if (!authResult.success) {
            return res.status(401).json({
                success: false,
                error: authResult.error
            });
        }

        const user = authResult.user;
        const token = jwt.sign(
            {
                id: user.id,
                usuario: user.usuario,
                nombre_completo: user.nombre_completo
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.json({
            success: true,
            message: 'Login exitoso',
            user: {
                id: user.id,
                usuario: user.usuario,
                nombre_completo: user.nombre_completo
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.post('/admin/api/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true, message: 'Logout exitoso' });
});

app.get('/api/rifas-activas', async (req, res) => {
    try {
        const rifas = await obtenerRifasActivas();
        res.json({ success: true, rifas });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/rifa/:id', async (req, res) => {
    try {
        const rifa = await obtenerRifaPorId(req.params.id);
        if (!rifa) {
            return res.status(404).json({ success: false, error: 'Rifa no encontrada' });
        }

        const metodosPago = await obtenerMetodosPagoPorRifa(req.params.id);
        const boletos = await obtenerBoletosDisponibles(req.params.id);

        res.json({
            success: true,
            rifa,
            metodosPago,
            boletosDisponibles: boletos.map(b => b.numero)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/crear-compra', async (req, res) => {
    try {
        const { rifa_id, nombre_cliente, telefono, email, metodo_pago_id, numeros_seleccionados } = req.body;

        if (!rifa_id || !nombre_cliente || !metodo_pago_id || !numeros_seleccionados || numeros_seleccionados.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Datos incompletos'
            });
        }

        const rifa = await obtenerRifaPorId(rifa_id);
        if (!rifa) {
            return res.status(404).json({
                success: false,
                error: 'Rifa no encontrada'
            });
        }

        const concepto = await generarConcepto();
        const cantidad_boletos = numeros_seleccionados.length;
        const total_pagar = cantidad_boletos * parseFloat(rifa.precio_boleto);

        const datosCompra = {
            rifa_id,
            concepto,
            nombre_cliente,
            telefono,
            email,
            metodo_pago_id,
            numeros_seleccionados,
            cantidad_boletos,
            total_pagar
        };

        const resultado = await crearCompra(datosCompra);

        if (resultado.success) {
            res.json({
                success: true,
                concepto,
                total_pagar,
                cantidad_boletos,
                compra_id: resultado.id
            });
        } else {
            res.status(400).json({
                success: false,
                error: resultado.error
            });
        }

    } catch (error) {
        console.error('Error creando compra:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.post('/admin/api/crear-rifa', authenticateToken, upload.single('imagen'), async (req, res) => {
    try {
        const { numero_bot, nombre, descripcion, rango_inicio, rango_fin, precio_boleto } = req.body;
        const imagen = req.file ? req.file.filename : null;

        const datosRifa = {
            numero_bot,
            nombre,
            descripcion,
            imagen,
            rango_inicio: parseInt(rango_inicio),
            rango_fin: parseInt(rango_fin),
            precio_boleto: parseFloat(precio_boleto)
        };

        const resultado = await crearRifa(datosRifa);

        if (resultado.success) {
            res.json({
                success: true,
                message: 'Rifa creada exitosamente',
                id: resultado.id
            });
        } else {
            res.status(400).json({
                success: false,
                error: resultado.error
            });
        }

    } catch (error) {
        console.error('Error creando rifa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.post('/admin/api/crear-metodo-pago', authenticateToken, async (req, res) => {
    try {
        const { rifa_id, banco, beneficiario, numero_cuenta, clabe, tipo_cuenta } = req.body;

        const datosMetodo = {
            rifa_id: parseInt(rifa_id),
            banco,
            beneficiario,
            numero_cuenta,
            clabe,
            tipo_cuenta
        };

        const resultado = await crearMetodoPago(datosMetodo);

        if (resultado.success) {
            res.json({
                success: true,
                message: 'Método de pago creado exitosamente',
                id: resultado.id
            });
        } else {
            res.status(400).json({
                success: false,
                error: resultado.error
            });
        }

    } catch (error) {
        console.error('Error creando método de pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.delete('/admin/api/eliminar-metodo-pago/:id', authenticateToken, async (req, res) => {
    try {
        const metodoId = req.params.id;

        if (!metodoId || isNaN(metodoId)) {
            return res.status(400).json({
                success: false,
                error: 'ID de método de pago inválido'
            });
        }

        const resultado = await eliminarMetodoPago(parseInt(metodoId));

        if (resultado.success) {
            res.json({
                success: true,
                message: resultado.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: resultado.error
            });
        }

    } catch (error) {
        console.error('Error eliminando método de pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.delete('/admin/api/eliminar-rifa/:id', authenticateToken, async (req, res) => {
    try {
        const rifaId = req.params.id;

        if (!rifaId || isNaN(rifaId)) {
            return res.status(400).json({
                success: false,
                error: 'ID de rifa inválido'
            });
        }

        const resultado = await eliminarRifa(parseInt(rifaId));

        if (resultado.success) {
            res.json({
                success: true,
                message: resultado.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: resultado.error
            });
        }

    } catch (error) {
        console.error('Error eliminando rifa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.put('/admin/api/actualizar-rifa/:id', authenticateToken, async (req, res) => {
    try {
        const rifaId = req.params.id;
        const { numero_bot, nombre, descripcion, precio_boleto, activa } = req.body;

        if (!rifaId || isNaN(rifaId)) {
            return res.status(400).json({
                success: false,
                error: 'ID de rifa inválido'
            });
        }

        const datosRifa = {
            numero_bot,
            nombre,
            descripcion,
            precio_boleto: parseFloat(precio_boleto),
            activa: activa === true || activa === 'true' || activa === 1
        };

        const resultado = await actualizarRifa(parseInt(rifaId), datosRifa);

        if (resultado.success) {
            res.json({
                success: true,
                message: resultado.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: resultado.error
            });
        }

    } catch (error) {
        console.error('Error actualizando rifa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.get('/admin/api/metodos-pago', authenticateToken, async (req, res) => {
    try {
        const metodosPago = await obtenerTodosLosMetodosPago();
        res.json({ success: true, metodosPago });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/admin/api/eliminar-rifa/:id', authenticateToken, async (req, res) => {
    try {
        const rifaId = req.params.id;

        if (!rifaId || isNaN(rifaId)) {
            return res.status(400).json({
                success: false,
                error: 'ID de rifa inválido'
            });
        }

        const resultado = await eliminarRifa(parseInt(rifaId));

        if (resultado.success) {
            res.json({
                success: true,
                message: resultado.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: resultado.error
            });
        }

    } catch (error) {
        console.error('Error eliminando rifa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.put('/admin/api/actualizar-rifa/:id', authenticateToken, async (req, res) => {
    try {
        const rifaId = req.params.id;
        const { numero_bot, nombre, descripcion, precio_boleto, activa } = req.body;

        if (!rifaId || isNaN(rifaId)) {
            return res.status(400).json({
                success: false,
                error: 'ID de rifa inválido'
            });
        }

        const datosRifa = {
            numero_bot,
            nombre,
            descripcion,
            precio_boleto: parseFloat(precio_boleto),
            activa: activa === true || activa === 'true' || activa === 1
        };

        const resultado = await actualizarRifa(parseInt(rifaId), datosRifa);

        if (resultado.success) {
            res.json({
                success: true,
                message: resultado.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: resultado.error
            });
        }

    } catch (error) {
        console.error('Error actualizando rifa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});


app.get('/admin/api/estadisticas', authenticateToken, async (req, res) => {
    try {
        const estadisticas = await obtenerEstadisticasGeneral();
        res.json({ success: true, estadisticas });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

async function iniciarServidor() {
    try {
        const dbConnected = await initDatabase();
        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log(`🌐 Sistema de Rifas iniciado en http://localhost:${PORT}`);
            console.log(`📋 Panel admin: http://localhost:${PORT}/admin`);
        });

    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

iniciarServidor();