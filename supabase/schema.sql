-- ============================================
-- NUTERA - Schema de base de datos Supabase
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Tabla de productos e insumos
CREATE TABLE IF NOT EXISTS productos (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo      INTEGER     NOT NULL UNIQUE,
  tipo        TEXT        NOT NULL DEFAULT 'Producto' CHECK (tipo IN ('Producto', 'Insumo')),
  nombre      TEXT        NOT NULL,
  marca       TEXT        NOT NULL DEFAULT '',
  unidad      TEXT        NOT NULL DEFAULT 'ud',
  costo       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  margen      NUMERIC(5, 4)  NOT NULL DEFAULT 0.15 CHECK (margen >= 0),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de entradas de stock (compras / recepción)
CREATE TABLE IF NOT EXISTS entradas (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id    UUID        NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  fecha          DATE        NOT NULL DEFAULT CURRENT_DATE,
  cantidad       NUMERIC(12, 3) NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de salidas de stock (ventas / consumo)
CREATE TABLE IF NOT EXISTS salidas (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id      UUID        NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  fecha            DATE        NOT NULL DEFAULT CURRENT_DATE,
  cantidad         NUMERIC(12, 3) NOT NULL CHECK (cantidad > 0),
  precio_unitario  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Vista de inventario calculado automáticamente
CREATE OR REPLACE VIEW inventario_view AS
SELECT
  p.id,
  p.codigo,
  p.nombre,
  p.marca,
  p.tipo,
  p.unidad,
  p.costo,
  p.margen,
  ROUND(p.costo * (1 + p.margen), 2)               AS precio_venta,
  COALESCE(SUM(e.cantidad), 0)::NUMERIC             AS total_entradas,
  COALESCE(SUM(s.cantidad), 0)::NUMERIC             AS total_salidas,
  (COALESCE(SUM(e.cantidad), 0)
   - COALESCE(SUM(s.cantidad), 0))::NUMERIC         AS stock_total,
  CASE
    WHEN (COALESCE(SUM(e.cantidad), 0) - COALESCE(SUM(s.cantidad), 0)) <= 0
      THEN 'agotado'
    WHEN (COALESCE(SUM(e.cantidad), 0) - COALESCE(SUM(s.cantidad), 0)) <= 5
      THEN 'bajo'
    ELSE 'disponible'
  END AS estado
FROM productos p
LEFT JOIN entradas e ON e.producto_id = p.id
LEFT JOIN salidas  s ON s.producto_id = p.id
GROUP BY p.id, p.codigo, p.nombre, p.marca, p.tipo, p.unidad, p.costo, p.margen
ORDER BY p.codigo;

-- Función para obtener el próximo código disponible según tipo
CREATE OR REPLACE FUNCTION get_next_codigo(p_tipo TEXT DEFAULT 'Producto')
RETURNS INTEGER AS $$
DECLARE
  next_code INTEGER;
BEGIN
  IF p_tipo = 'Insumo' THEN
    SELECT COALESCE(MAX(codigo), 499) + 1 INTO next_code
      FROM productos WHERE tipo = 'Insumo';
    IF next_code < 500 THEN next_code := 500; END IF;
  ELSE
    SELECT COALESCE(MAX(codigo), 99) + 1 INTO next_code
      FROM productos WHERE tipo = 'Producto' AND codigo < 500;
    IF next_code < 100 THEN next_code := 100; END IF;
  END IF;
  RETURN next_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: mantener updated_at actualizado
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_productos_codigo     ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre     ON productos USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_productos_tipo       ON productos(tipo);
CREATE INDEX IF NOT EXISTS idx_entradas_producto    ON entradas(producto_id);
CREATE INDEX IF NOT EXISTS idx_entradas_fecha       ON entradas(fecha);
CREATE INDEX IF NOT EXISTS idx_salidas_producto     ON salidas(producto_id);
CREATE INDEX IF NOT EXISTS idx_salidas_fecha        ON salidas(fecha);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- La app no tiene autenticación de usuarios: el cliente usa la anon key.
-- Supabase habilita RLS por defecto en todos los proyectos nuevos.
-- Sin policies explícitas, el rol "anon" no puede leer ni escribir nada.
-- Las policies de abajo otorgan acceso completo al rol "anon" en las tres
-- tablas. La vista inventario_view hereda los permisos de las tablas base.

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE salidas   ENABLE ROW LEVEL SECURITY;

-- productos
DROP POLICY IF EXISTS "anon_all_productos" ON productos;
CREATE POLICY "anon_all_productos" ON productos
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- entradas
DROP POLICY IF EXISTS "anon_all_entradas" ON entradas;
CREATE POLICY "anon_all_entradas" ON entradas
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- salidas
DROP POLICY IF EXISTS "anon_all_salidas" ON salidas;
CREATE POLICY "anon_all_salidas" ON salidas
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
