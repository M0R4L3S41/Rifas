const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rifafarmaciascoral',
    charset: 'utf8mb4',
    timezone: '+00:00',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Usar pool en lugar de conexión única
const pool = mysql.createPool(DB_CONFIG);

async function initDatabase() {
    try {
        // Verificar conexión con el pool
        const connection = await pool.getConnection();
        console.log('✅ Conectado a MySQL - rifafarmaciascoral');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        return false;
    }
}

async function query(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Error en query:', error);
        throw error;
    }
}

async function verificarCredencialesAdmin(usuario, password) {
    try {
        const admin = await query(
            'SELECT * FROM administradores WHERE usuario = ? AND activo = 1',
            [usuario]
        );

        if (admin.length === 0) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        const adminData = admin[0];
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        if (hashedPassword !== adminData.password) {
            return { success: false, error: 'Contraseña incorrecta' };
        }

        await query('UPDATE administradores SET ultimo_acceso = NOW() WHERE id = ?', [adminData.id]);

        return {
            success: true,
            user: {
                id: adminData.id,
                usuario: adminData.usuario,
                nombre_completo: adminData.nombre_completo,
                email: adminData.email
            }
        };
    } catch (error) {
        console.error('Error verificando credenciales:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}

async function obtenerRifasActivas() {
    try {
        return await query(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM boletos WHERE rifa_id = r.id AND estado = 'disponible') as boletos_disponibles,
                   (SELECT COUNT(*) FROM boletos WHERE rifa_id = r.id AND estado = 'pagado') as boletos_vendidos
            FROM rifas r 
            WHERE r.activa = 1 
            ORDER BY r.fecha_creacion DESC
        `);
    } catch (error) {
        console.error('Error obteniendo rifas activas:', error);
        return [];
    }
}

async function obtenerRifaPorId(id) {
    try {
        const rifas = await query('SELECT * FROM rifas WHERE id = ?', [id]);
        return rifas.length > 0 ? rifas[0] : null;
    } catch (error) {
        console.error('Error obteniendo rifa:', error);
        return null;
    }
}

async function obtenerMetodosPagoPorRifa(rifaId) {
    try {
        return await query(`
            SELECT * FROM metodos_pago 
            WHERE rifa_id = ? AND activo = 1 
            ORDER BY banco
        `, [rifaId]);
    } catch (error) {
        console.error('Error obteniendo métodos de pago:', error);
        return [];
    }
}

async function obtenerBoletosDisponibles(rifaId) {
    try {
        return await query(`
            SELECT numero FROM boletos 
            WHERE rifa_id = ? AND estado = 'disponible' 
            ORDER BY numero
        `, [rifaId]);
    } catch (error) {
        console.error('Error obteniendo boletos disponibles:', error);
        return [];
    }
}

async function crearCompra(datosCompra) {
    const connection = await pool.getConnection();
    try {
        const { rifa_id, concepto, nombre_cliente, telefono, email, metodo_pago_id, numeros_seleccionados, cantidad_boletos, total_pagar } = datosCompra;
        
        await connection.beginTransaction();
        
        const [result] = await connection.execute(`
            INSERT INTO compras (rifa_id, concepto, nombre_cliente, telefono, email, metodo_pago_id, numeros_seleccionados, cantidad_boletos, total_pagar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [rifa_id, concepto, nombre_cliente, telefono, email, metodo_pago_id, JSON.stringify(numeros_seleccionados), cantidad_boletos, total_pagar]);

        for (const numero of numeros_seleccionados) {
            await connection.execute(`
                UPDATE boletos 
                SET estado = 'pendiente' 
                WHERE rifa_id = ? AND numero = ? AND estado = 'disponible'
            `, [rifa_id, numero]);
        }

        await connection.commit();
        return { success: true, id: result.insertId };
    } catch (error) {
        await connection.rollback();
        console.error('Error creando compra:', error);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

async function generarConcepto() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let concepto;
    let existe = true;
    
    while (existe) {
        concepto = 'RF';
        for (let i = 0; i < 6; i++) {
            concepto += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        
        const result = await query('SELECT id FROM compras WHERE concepto = ?', [concepto]);
        existe = result.length > 0;
    }
    
    return concepto;
}

async function crearRifa(datosRifa) {
    try {
        const { numero_bot, nombre, descripcion, imagen, rango_inicio, rango_fin, precio_boleto } = datosRifa;
        
        const result = await query(`
            INSERT INTO rifas (numero_bot, nombre, descripcion, imagen, rango_inicio, rango_fin, precio_boleto)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [numero_bot, nombre, descripcion, imagen, rango_inicio, rango_fin, precio_boleto]);

        return { success: true, id: result.insertId };
    } catch (error) {
        console.error('Error creando rifa:', error);
        return { success: false, error: error.message };
    }
}

async function crearMetodoPago(datosMetodo) {
    try {
        const { rifa_id, banco, beneficiario, numero_cuenta, clabe, tipo_cuenta } = datosMetodo;
        
        const result = await query(`
            INSERT INTO metodos_pago (rifa_id, banco, beneficiario, numero_cuenta, clabe, tipo_cuenta)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [rifa_id, banco, beneficiario, numero_cuenta, clabe, tipo_cuenta]);

        return { success: true, id: result.insertId };
    } catch (error) {
        console.error('Error creando método de pago:', error);
        return { success: false, error: error.message };
    }
}

async function eliminarRifa(rifaId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Verificar si hay compras asociadas
        const [compras] = await connection.execute('SELECT COUNT(*) as total FROM compras WHERE rifa_id = ?', [rifaId]);
        if (compras[0].total > 0) {
            return { success: false, error: 'No se puede eliminar una rifa que tiene compras registradas' };
        }
        
        // Eliminar la rifa
        const [result] = await connection.execute('DELETE FROM rifas WHERE id = ?', [rifaId]);
        
        await connection.commit();
        
        if (result.affectedRows > 0) {
            return { success: true, message: 'Rifa eliminada exitosamente' };
        } else {
            return { success: false, error: 'Rifa no encontrada' };
        }
        
    } catch (error) {
        await connection.rollback();
        console.error('Error eliminando rifa:', error);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

async function actualizarRifa(id, datosRifa) {
    try {
        const { numero_bot, nombre, descripcion, precio_boleto, activa } = datosRifa;
        
        const result = await query(`
            UPDATE rifas 
            SET numero_bot = ?, nombre = ?, descripcion = ?, precio_boleto = ?, activa = ?
            WHERE id = ?
        `, [numero_bot, nombre, descripcion, precio_boleto, activa, id]);

        if (result.affectedRows > 0) {
            return { success: true, message: 'Rifa actualizada exitosamente' };
        } else {
            return { success: false, error: 'Rifa no encontrada' };
        }
    } catch (error) {
        console.error('Error actualizando rifa:', error);
        return { success: false, error: error.message };
    }
}

async function obtenerTodosLosMetodosPago() {
    try {
        return await query(`
            SELECT mp.*, r.nombre as rifa_nombre 
            FROM metodos_pago mp
            LEFT JOIN rifas r ON mp.rifa_id = r.id
            ORDER BY r.nombre, mp.banco
        `);
    } catch (error) {
        console.error('Error obteniendo todos los métodos de pago:', error);
        return [];
    }
}

async function obtenerEstadisticasGeneral() {
    try {
        const stats = await query(`
            SELECT 
                COUNT(DISTINCT r.id) as total_rifas,
                COUNT(DISTINCT c.id) as total_compras,
                COALESCE(SUM(CASE WHEN c.estado = 'pagado' THEN c.total_pagar ELSE 0 END), 0) as ingresos_confirmados,
                COALESCE(SUM(CASE WHEN c.estado = 'pendiente' THEN c.total_pagar ELSE 0 END), 0) as ingresos_pendientes
            FROM rifas r
            LEFT JOIN compras c ON r.id = c.rifa_id
            WHERE r.activa = 1
        `);
        
        return stats[0];
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return {
            total_rifas: 0,
            total_compras: 0,
            ingresos_confirmados: 0,
            ingresos_pendientes: 0
        };
    }
}

async function eliminarMetodoPago(metodoId) {
    try {
        // Verificar si hay compras que usan este método de pago
        const compras = await query('SELECT COUNT(*) as total FROM compras WHERE metodo_pago_id = ?', [metodoId]);
        if (compras[0].total > 0) {
            return { success: false, error: 'No se puede eliminar un método de pago que tiene compras asociadas' };
        }
        
        const result = await query('DELETE FROM metodos_pago WHERE id = ?', [metodoId]);
        
        if (result.affectedRows > 0) {
            return { success: true, message: 'Método de pago eliminado exitosamente' };
        } else {
            return { success: false, error: 'Método de pago no encontrado' };
        }
        
    } catch (error) {
        console.error('Error eliminando método de pago:', error);
        return { success: false, error: error.message };
    }
}

// Cerrar pool cuando se cierra la aplicación
process.on('SIGINT', async () => {
    await pool.end();
    console.log('Pool de conexiones cerrado');
    process.exit(0);
});

module.exports = {
    initDatabase,
    query,
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
};