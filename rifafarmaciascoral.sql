-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 19-10-2025 a las 03:11:15
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `rifafarmaciascoral`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `administradores`
--

CREATE TABLE `administradores` (
  `id` int(11) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nombre_completo` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `ultimo_acceso` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `administradores`
--

INSERT INTO `administradores` (`id`, `usuario`, `password`, `nombre_completo`, `email`, `activo`, `fecha_creacion`, `ultimo_acceso`) VALUES
(1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrador Principal', 'admin@farmaciacoral.com', 1, '2025-10-18 14:39:51', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `boletos`
--

CREATE TABLE `boletos` (
  `id` int(11) NOT NULL,
  `rifa_id` int(11) NOT NULL,
  `numero` int(11) NOT NULL,
  `estado` enum('disponible','pendiente','pagado','cancelado') DEFAULT 'disponible',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `boletos`
--
DELIMITER $$
CREATE TRIGGER `historial_cambio_boletos` AFTER UPDATE ON `boletos` FOR EACH ROW BEGIN
    IF OLD.estado != NEW.estado THEN
        INSERT INTO historial_boletos (boleto_id, estado_anterior, estado_nuevo, fecha_cambio)
        VALUES (NEW.id, OLD.estado, NEW.estado, NOW());
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `id` int(11) NOT NULL,
  `rifa_id` int(11) NOT NULL,
  `concepto` varchar(20) NOT NULL,
  `nombre_cliente` varchar(100) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `metodo_pago_id` int(11) NOT NULL,
  `numeros_seleccionados` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`numeros_seleccionados`)),
  `cantidad_boletos` int(11) NOT NULL,
  `total_pagar` decimal(10,2) NOT NULL,
  `estado` enum('pendiente','pagado','cancelado','expirado') DEFAULT 'pendiente',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_expiracion` timestamp NOT NULL DEFAULT (current_timestamp() + interval 3 day),
  `fecha_pago` timestamp NULL DEFAULT NULL,
  `notas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comprobantes`
--

CREATE TABLE `comprobantes` (
  `id` int(11) NOT NULL,
  `compra_id` int(11) NOT NULL,
  `nombre_archivo` varchar(255) NOT NULL,
  `ruta_imagen` varchar(500) NOT NULL,
  `tipo_archivo` varchar(10) DEFAULT NULL,
  `tamano_archivo` int(11) DEFAULT NULL,
  `validado` tinyint(1) DEFAULT 0,
  `fecha_subida` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_validacion` timestamp NULL DEFAULT NULL,
  `validado_por` varchar(100) DEFAULT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_sistema`
--

CREATE TABLE `configuracion_sistema` (
  `id` int(11) NOT NULL,
  `clave` varchar(100) NOT NULL,
  `valor` text NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `tipo` enum('string','number','boolean','json') DEFAULT 'string',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `configuracion_sistema`
--

INSERT INTO `configuracion_sistema` (`id`, `clave`, `valor`, `descripcion`, `tipo`, `fecha_creacion`, `fecha_actualizacion`) VALUES
(1, 'whatsapp_numero_bot', '+529541234567', 'Número de WhatsApp del bot', 'string', '2025-10-18 14:39:51', '2025-10-18 14:39:51'),
(2, 'tiempo_expiracion_horas', '72', 'Horas para expirar una compra pendiente', 'number', '2025-10-18 14:39:51', '2025-10-18 14:39:51'),
(3, 'prefijo_concepto', 'RF', 'Prefijo para generar conceptos de pago', 'string', '2025-10-18 14:39:51', '2025-10-18 14:39:51'),
(4, 'longitud_concepto', '8', 'Longitud total del concepto (incluyendo prefijo)', 'number', '2025-10-18 14:39:51', '2025-10-18 14:39:51'),
(5, 'moneda', 'MXN', 'Moneda del sistema', 'string', '2025-10-18 14:39:51', '2025-10-18 14:39:51'),
(6, 'timezone', 'America/Mexico_City', 'Zona horaria del sistema', 'string', '2025-10-18 14:39:51', '2025-10-18 14:39:51');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_boletos`
--

CREATE TABLE `historial_boletos` (
  `id` int(11) NOT NULL,
  `boleto_id` int(11) NOT NULL,
  `compra_id` int(11) DEFAULT NULL,
  `estado_anterior` enum('disponible','pendiente','pagado','cancelado') DEFAULT NULL,
  `estado_nuevo` enum('disponible','pendiente','pagado','cancelado') DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `fecha_cambio` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes_whatsapp`
--

CREATE TABLE `mensajes_whatsapp` (
  `id` int(11) NOT NULL,
  `compra_id` int(11) DEFAULT NULL,
  `telefono` varchar(15) NOT NULL,
  `tipo_mensaje` enum('compra','solicitud_comprobante','confirmacion','expiracion','promocional') NOT NULL,
  `mensaje` text NOT NULL,
  `estado` enum('pendiente','enviado','entregado','leido','error') DEFAULT 'pendiente',
  `fecha_programado` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_enviado` timestamp NULL DEFAULT NULL,
  `respuesta` text DEFAULT NULL,
  `fecha_respuesta` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `metodos_pago`
--

CREATE TABLE `metodos_pago` (
  `id` int(11) NOT NULL,
  `rifa_id` int(11) NOT NULL,
  `banco` varchar(100) NOT NULL,
  `beneficiario` varchar(150) NOT NULL,
  `numero_cuenta` varchar(50) DEFAULT NULL,
  `clabe` varchar(18) DEFAULT NULL,
  `tipo_cuenta` enum('CLABE','CUENTA','TARJETA') DEFAULT 'CLABE',
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rifas`
--

CREATE TABLE `rifas` (
  `id` int(11) NOT NULL,
  `numero_bot` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `rango_inicio` int(11) NOT NULL,
  `rango_fin` int(11) NOT NULL,
  `precio_boleto` decimal(10,2) NOT NULL DEFAULT 0.00,
  `activa` tinyint(1) DEFAULT 1,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `total_boletos` int(11) GENERATED ALWAYS AS (`rango_fin` - `rango_inicio` + 1) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `rifas`
--
DELIMITER $$
CREATE TRIGGER `generar_boletos_rifa` AFTER INSERT ON `rifas` FOR EACH ROW BEGIN
    DECLARE i INT DEFAULT NEW.rango_inicio;
    WHILE i <= NEW.rango_fin DO
        INSERT INTO boletos (rifa_id, numero) VALUES (NEW.id, i);
        SET i = i + 1;
    END WHILE;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_boletos_disponibles`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_boletos_disponibles` (
`rifa_id` int(11)
,`rifa_nombre` varchar(100)
,`boletos_disponibles` bigint(21)
,`total_boletos` int(11)
,`porcentaje_disponible` decimal(26,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_ventas_rifa`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_ventas_rifa` (
`rifa_id` int(11)
,`rifa_nombre` varchar(100)
,`total_compras` bigint(21)
,`boletos_vendidos` decimal(32,0)
,`ingresos_confirmados` decimal(32,2)
,`ingresos_pendientes` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_boletos_disponibles`
--
DROP TABLE IF EXISTS `vista_boletos_disponibles`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_boletos_disponibles`  AS SELECT `r`.`id` AS `rifa_id`, `r`.`nombre` AS `rifa_nombre`, count(`b`.`id`) AS `boletos_disponibles`, `r`.`total_boletos` AS `total_boletos`, round(count(`b`.`id`) / `r`.`total_boletos` * 100,2) AS `porcentaje_disponible` FROM (`rifas` `r` left join `boletos` `b` on(`r`.`id` = `b`.`rifa_id` and `b`.`estado` = 'disponible')) WHERE `r`.`activa` = 1 GROUP BY `r`.`id`, `r`.`nombre`, `r`.`total_boletos` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_ventas_rifa`
--
DROP TABLE IF EXISTS `vista_ventas_rifa`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_ventas_rifa`  AS SELECT `r`.`id` AS `rifa_id`, `r`.`nombre` AS `rifa_nombre`, count(`c`.`id`) AS `total_compras`, sum(`c`.`cantidad_boletos`) AS `boletos_vendidos`, sum(case when `c`.`estado` = 'pagado' then `c`.`total_pagar` else 0 end) AS `ingresos_confirmados`, sum(case when `c`.`estado` = 'pendiente' then `c`.`total_pagar` else 0 end) AS `ingresos_pendientes` FROM (`rifas` `r` left join `compras` `c` on(`r`.`id` = `c`.`rifa_id`)) WHERE `r`.`activa` = 1 GROUP BY `r`.`id`, `r`.`nombre` ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `administradores`
--
ALTER TABLE `administradores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario` (`usuario`);

--
-- Indices de la tabla `boletos`
--
ALTER TABLE `boletos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_rifa_numero` (`rifa_id`,`numero`),
  ADD UNIQUE KEY `boletos_rifa_id_numero` (`rifa_id`,`numero`),
  ADD KEY `idx_rifa_estado` (`rifa_id`,`estado`),
  ADD KEY `idx_numero` (`numero`),
  ADD KEY `idx_boletos_rifa_estado` (`rifa_id`,`estado`),
  ADD KEY `boletos_estado` (`estado`);

--
-- Indices de la tabla `compras`
--
ALTER TABLE `compras`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `concepto` (`concepto`),
  ADD UNIQUE KEY `compras_concepto` (`concepto`),
  ADD KEY `metodo_pago_id` (`metodo_pago_id`),
  ADD KEY `idx_concepto` (`concepto`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_fecha_expiracion` (`fecha_expiracion`),
  ADD KEY `idx_rifa_cliente` (`rifa_id`,`nombre_cliente`),
  ADD KEY `idx_compras_fecha_expiracion` (`fecha_expiracion`,`estado`),
  ADD KEY `compras_estado` (`estado`),
  ADD KEY `compras_fecha_expiracion` (`fecha_expiracion`),
  ADD KEY `compras_rifa_id_nombre_cliente` (`rifa_id`,`nombre_cliente`),
  ADD KEY `compras_fecha_expiracion_estado` (`fecha_expiracion`,`estado`);

--
-- Indices de la tabla `comprobantes`
--
ALTER TABLE `comprobantes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_compra` (`compra_id`),
  ADD KEY `idx_validado` (`validado`),
  ADD KEY `idx_comprobantes_validado` (`validado`,`fecha_subida`);

--
-- Indices de la tabla `configuracion_sistema`
--
ALTER TABLE `configuracion_sistema`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `historial_boletos`
--
ALTER TABLE `historial_boletos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `compra_id` (`compra_id`),
  ADD KEY `idx_boleto` (`boleto_id`),
  ADD KEY `idx_fecha` (`fecha_cambio`);

--
-- Indices de la tabla `mensajes_whatsapp`
--
ALTER TABLE `mensajes_whatsapp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `compra_id` (`compra_id`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_tipo` (`tipo_mensaje`),
  ADD KEY `idx_fecha_programado` (`fecha_programado`);

--
-- Indices de la tabla `metodos_pago`
--
ALTER TABLE `metodos_pago`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rifa_activo` (`rifa_id`,`activo`),
  ADD KEY `metodos_pago_rifa_id_activo` (`rifa_id`,`activo`);

--
-- Indices de la tabla `rifas`
--
ALTER TABLE `rifas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activa` (`activa`),
  ADD KEY `idx_fechas` (`fecha_inicio`,`fecha_fin`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `administradores`
--
ALTER TABLE `administradores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `boletos`
--
ALTER TABLE `boletos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compras`
--
ALTER TABLE `compras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `comprobantes`
--
ALTER TABLE `comprobantes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `configuracion_sistema`
--
ALTER TABLE `configuracion_sistema`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `historial_boletos`
--
ALTER TABLE `historial_boletos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `mensajes_whatsapp`
--
ALTER TABLE `mensajes_whatsapp`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `metodos_pago`
--
ALTER TABLE `metodos_pago`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rifas`
--
ALTER TABLE `rifas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `boletos`
--
ALTER TABLE `boletos`
  ADD CONSTRAINT `boletos_ibfk_1` FOREIGN KEY (`rifa_id`) REFERENCES `rifas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `compras`
--
ALTER TABLE `compras`
  ADD CONSTRAINT `compras_ibfk_1` FOREIGN KEY (`rifa_id`) REFERENCES `rifas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `compras_ibfk_2` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodos_pago` (`id`);

--
-- Filtros para la tabla `comprobantes`
--
ALTER TABLE `comprobantes`
  ADD CONSTRAINT `comprobantes_ibfk_1` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `historial_boletos`
--
ALTER TABLE `historial_boletos`
  ADD CONSTRAINT `historial_boletos_ibfk_1` FOREIGN KEY (`boleto_id`) REFERENCES `boletos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `historial_boletos_ibfk_2` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `mensajes_whatsapp`
--
ALTER TABLE `mensajes_whatsapp`
  ADD CONSTRAINT `mensajes_whatsapp_ibfk_1` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `metodos_pago`
--
ALTER TABLE `metodos_pago`
  ADD CONSTRAINT `metodos_pago_ibfk_1` FOREIGN KEY (`rifa_id`) REFERENCES `rifas` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
