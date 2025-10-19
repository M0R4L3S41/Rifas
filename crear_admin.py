#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import mysql.connector
import hashlib
import getpass
import sys
from datetime import datetime

# Configuración de la base de datos
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'rifafarmaciascoral',
    'charset': 'utf8mb4'
}

def conectar_db():
    """Conecta a la base de datos MySQL"""
    try:
        conexion = mysql.connector.connect(**DB_CONFIG)
        print("✅ Conectado a MySQL - rifafarmaciascoral")
        return conexion
    except mysql.connector.Error as error:
        print(f"❌ Error conectando a MySQL: {error}")
        return None

def verificar_usuario_existe(cursor, usuario):
    """Verifica si el usuario ya existe en la base de datos"""
    query = "SELECT id FROM administradores WHERE usuario = %s"
    cursor.execute(query, (usuario,))
    return cursor.fetchone() is not None

def hash_password(password):
    """Genera hash SHA256 de la contraseña"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def crear_administrador(cursor, datos_admin):
    """Inserta un nuevo administrador en la base de datos"""
    query = """
    INSERT INTO administradores (usuario, password, nombre_completo, email, activo, fecha_creacion)
    VALUES (%s, %s, %s, %s, %s, %s)
    """
    
    valores = (
        datos_admin['usuario'],
        datos_admin['password_hash'],
        datos_admin['nombre_completo'],
        datos_admin['email'],
        1,  # activo
        datetime.now()
    )
    
    cursor.execute(query, valores)
    return cursor.lastrowid

def mostrar_administradores(cursor):
    """Muestra todos los administradores existentes"""
    query = """
    SELECT id, usuario, nombre_completo, email, activo, fecha_creacion, ultimo_acceso
    FROM administradores
    ORDER BY fecha_creacion DESC
    """
    
    cursor.execute(query)
    administradores = cursor.fetchall()
    
    if not administradores:
        print("\n📋 No hay administradores registrados")
        return
    
    print("\n👥 Administradores existentes:")
    print("=" * 80)
    print(f"{'ID':<3} {'Usuario':<15} {'Nombre':<25} {'Email':<25} {'Activo':<7} {'Creado'}")
    print("-" * 80)
    
    for admin in administradores:
        activo_str = "Sí" if admin[4] else "No"
        fecha_creacion = admin[5].strftime("%d/%m/%Y") if admin[5] else "N/A"
        
        print(f"{admin[0]:<3} {admin[1]:<15} {admin[2]:<25} {admin[3] or 'N/A':<25} {activo_str:<7} {fecha_creacion}")
    
    print("=" * 80)

def cambiar_password_admin(cursor, usuario_id, nueva_password):
    """Cambia la contraseña de un administrador"""
    password_hash = hash_password(nueva_password)
    query = "UPDATE administradores SET password = %s WHERE id = %s"
    cursor.execute(query, (password_hash, usuario_id))
    return cursor.rowcount > 0

def activar_desactivar_admin(cursor, usuario_id, activo):
    """Activa o desactiva un administrador"""
    query = "UPDATE administradores SET activo = %s WHERE id = %s"
    cursor.execute(query, (activo, usuario_id))
    return cursor.rowcount > 0

def menu_principal():
    """Muestra el menú principal"""
    print("\n🎯 GESTIÓN DE ADMINISTRADORES - SISTEMA DE RIFAS")
    print("=" * 50)
    print("1. Ver administradores existentes")
    print("2. Crear nuevo administrador")
    print("3. Cambiar contraseña de administrador")
    print("4. Activar/Desactivar administrador")
    print("5. Crear administrador rápido (admin/admin123)")
    print("6. Salir")
    print("=" * 50)
    
    while True:
        try:
            opcion = input("Selecciona una opción (1-6): ").strip()
            if opcion in ['1', '2', '3', '4', '5', '6']:
                return opcion
            else:
                print("❌ Opción inválida. Ingresa un número del 1 al 6.")
        except KeyboardInterrupt:
            print("\n\n👋 Operación cancelada por el usuario")
            sys.exit(0)

def solicitar_datos_admin():
    """Solicita los datos del nuevo administrador"""
    print("\n📝 Ingresa los datos del nuevo administrador:")
    
    while True:
        usuario = input("👤 Usuario: ").strip()
        if len(usuario) >= 3:
            break
        print("❌ El usuario debe tener al menos 3 caracteres")
    
    nombre_completo = input("📝 Nombre completo: ").strip()
    email = input("📧 Email (opcional): ").strip() or None
    
    while True:
        password = getpass.getpass("🔐 Contraseña: ")
        if len(password) >= 6:
            break
        print("❌ La contraseña debe tener al menos 6 caracteres")
    
    return {
        'usuario': usuario,
        'nombre_completo': nombre_completo,
        'email': email,
        'password_hash': hash_password(password)
    }

def crear_admin_rapido():
    """Crea un administrador con credenciales predeterminadas"""
    return {
        'usuario': 'admin',
        'nombre_completo': 'Administrador Principal',
        'email': 'admin@farmaciacoral.com',
        'password_hash': hash_password('admin123')
    }

def main():
    """Función principal"""
    print("🚀 Iniciando gestión de administradores...")
    
    # Conectar a la base de datos
    conexion = conectar_db()
    if not conexion:
        print("❌ No se pudo conectar a la base de datos")
        sys.exit(1)
    
    cursor = conexion.cursor()
    
    try:
        while True:
            opcion = menu_principal()
            
            if opcion == '1':
                mostrar_administradores(cursor)
            
            elif opcion == '2':
                datos_admin = solicitar_datos_admin()
                
                if verificar_usuario_existe(cursor, datos_admin['usuario']):
                    print(f"❌ El usuario '{datos_admin['usuario']}' ya existe")
                    continue
                
                admin_id = crear_administrador(cursor, datos_admin)
                conexion.commit()
                print(f"✅ Administrador '{datos_admin['usuario']}' creado exitosamente (ID: {admin_id})")
            
            elif opcion == '3':
                mostrar_administradores(cursor)
                try:
                    usuario_id = int(input("\n🔢 ID del administrador: "))
                    nueva_password = getpass.getpass("🔐 Nueva contraseña: ")
                    
                    if len(nueva_password) < 6:
                        print("❌ La contraseña debe tener al menos 6 caracteres")
                        continue
                    
                    if cambiar_password_admin(cursor, usuario_id, nueva_password):
                        conexion.commit()
                        print("✅ Contraseña actualizada exitosamente")
                    else:
                        print("❌ No se encontró el administrador con ese ID")
                except ValueError:
                    print("❌ ID inválido")
            
            elif opcion == '4':
                mostrar_administradores(cursor)
                try:
                    usuario_id = int(input("\n🔢 ID del administrador: "))
                    estado = input("🔄 ¿Activar? (s/n): ").lower().strip() == 's'
                    
                    if activar_desactivar_admin(cursor, usuario_id, estado):
                        conexion.commit()
                        estado_str = "activado" if estado else "desactivado"
                        print(f"✅ Administrador {estado_str} exitosamente")
                    else:
                        print("❌ No se encontró el administrador con ese ID")
                except ValueError:
                    print("❌ ID inválido")
            
            elif opcion == '5':
                if verificar_usuario_existe(cursor, 'admin'):
                    sobrescribir = input("⚠️  El usuario 'admin' ya existe. ¿Actualizar contraseña? (s/n): ").lower().strip()
                    
                    if sobrescribir == 's':
                        # Buscar ID del admin existente
                        cursor.execute("SELECT id FROM administradores WHERE usuario = 'admin'")
                        admin_id = cursor.fetchone()[0]
                        
                        if cambiar_password_admin(cursor, admin_id, 'admin123'):
                            conexion.commit()
                            print("✅ Contraseña actualizada para usuario 'admin'")
                            print("🔐 Credenciales: admin / admin123")
                        else:
                            print("❌ Error actualizando contraseña")
                else:
                    datos_admin = crear_admin_rapido()
                    admin_id = crear_administrador(cursor, datos_admin)
                    conexion.commit()
                    print(f"✅ Administrador rápido creado exitosamente (ID: {admin_id})")
                    print("🔐 Credenciales:")
                    print("   Usuario: admin")
                    print("   Contraseña: admin123")
                    print("⚠️  IMPORTANTE: Cambia esta contraseña después del primer login")
            
            elif opcion == '6':
                break
            
            input("\nPresiona Enter para continuar...")
    
    except KeyboardInterrupt:
        print("\n\n👋 Operación cancelada por el usuario")
    
    except mysql.connector.Error as error:
        print(f"❌ Error de base de datos: {error}")
    
    finally:
        cursor.close()
        conexion.close()
        print("\n👋 ¡Gestión terminada!")

if __name__ == "__main__":
    main()