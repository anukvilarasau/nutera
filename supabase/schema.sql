-- ============================================
-- NUTERA - Schema de base de datos Supabase
-- Ejecutar en el SQL Editor de Supabase
-- Idempotente: se puede correr más de una vez sin errores
-- ============================================

-- ── TABLAS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS productos (
  id          UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo      INTEGER        NOT NULL UNIQUE,
  tipo        TEXT           NOT NULL DEFAULT 'Producto' CHECK (tipo IN ('Producto', 'Insumo')),
  nombre      TEXT           NOT NULL,
  proveedor   TEXT           NOT NULL DEFAULT '',
  unidad      TEXT           NOT NULL DEFAULT 'ud',
  costo       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  margen      NUMERIC(5, 4)  NOT NULL DEFAULT 0.15 CHECK (margen >= 0),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entradas (
  id             UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id    UUID           NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  fecha          DATE           NOT NULL DEFAULT CURRENT_DATE,
  cantidad       NUMERIC(12, 3) NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── COMPRAS ───────────────────────────────────────────────────────────────────
-- Una fila por orden de compra (agrupa todos los ítems)
CREATE TABLE IF NOT EXISTS compras (
  id         UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha      DATE           NOT NULL DEFAULT CURRENT_DATE,
  proveedor  TEXT           NOT NULL DEFAULT '',
  total      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Una fila por ítem de la compra
CREATE TABLE IF NOT EXISTS compra_items (
  id              UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  compra_id       UUID           NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id     UUID           NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad        NUMERIC(12, 3) NOT NULL CHECK (cantidad > 0),
  costo_unitario  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Una fila por venta (agrupa todos los ítems)
CREATE TABLE IF NOT EXISTS ventas (
  id         UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha      DATE           NOT NULL DEFAULT CURRENT_DATE,
  total      NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- suma solo de ítems con precio (productos)
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Una fila por ítem de la venta
-- precio_unitario NULL → insumo (descuenta stock pero no suma al total)
-- precio_unitario NOT NULL → producto (descuenta stock y suma al total)
CREATE TABLE IF NOT EXISTS venta_items (
  id              UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  venta_id        UUID           NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id     UUID           NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad        NUMERIC(12, 3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12, 2) NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── VISTA DE INVENTARIO ───────────────────────────────────────────────────────
-- total_salidas = suma de todo lo consumido via venta_items (productos + insumos)

CREATE OR REPLACE VIEW inventario_view AS
SELECT
  p.id,
  p.codigo,
  p.nombre,
  p.proveedor,
  p.tipo,
  p.unidad,
  p.costo,
  p.margen,
  ROUND(p.costo * (1 + p.margen), 2)                                          AS precio_venta,
  COALESCE(SUM(ci.cantidad), 0)::NUMERIC                                      AS total_entradas,
  COALESCE(SUM(vi.cantidad), 0)::NUMERIC                                      AS total_salidas,
  (COALESCE(SUM(ci.cantidad), 0) - COALESCE(SUM(vi.cantidad), 0))::NUMERIC   AS stock_total,
  CASE
    WHEN (COALESCE(SUM(ci.cantidad), 0) - COALESCE(SUM(vi.cantidad), 0)) <= 0 THEN 'agotado'
    WHEN (COALESCE(SUM(ci.cantidad), 0) - COALESCE(SUM(vi.cantidad), 0)) <= 5 THEN 'bajo'
    ELSE 'disponible'
  END AS estado
FROM productos p
LEFT JOIN compra_items ci ON ci.producto_id = p.id
LEFT JOIN venta_items  vi ON vi.producto_id = p.id
GROUP BY p.id, p.codigo, p.nombre, p.proveedor, p.tipo, p.unidad, p.costo, p.margen
ORDER BY p.codigo;

-- ── VISTA DE RENTABILIDAD ─────────────────────────────────────────────────────
-- Una fila por venta con ingreso (productos), costo (todos los ítems) y ganancia

CREATE OR REPLACE VIEW venta_rentabilidad AS
SELECT
  v.id,
  v.fecha,
  v.created_at,
  -- Ingreso: suma de precio_unitario * cantidad solo para ítems con precio
  COALESCE(SUM(vi.precio_unitario * vi.cantidad) FILTER (WHERE vi.precio_unitario IS NOT NULL), 0) AS ingreso,
  -- Costo: suma de costo * cantidad para todos los ítems (productos + insumos)
  COALESCE(SUM(p.costo * vi.cantidad), 0) AS costo,
  -- Ganancia neta
  COALESCE(SUM(vi.precio_unitario * vi.cantidad) FILTER (WHERE vi.precio_unitario IS NOT NULL), 0)
    - COALESCE(SUM(p.costo * vi.cantidad), 0) AS ganancia,
  -- Margen porcentual (NULL si ingreso = 0)
  CASE
    WHEN COALESCE(SUM(vi.precio_unitario * vi.cantidad) FILTER (WHERE vi.precio_unitario IS NOT NULL), 0) = 0
    THEN NULL
    ELSE ROUND(
      (
        COALESCE(SUM(vi.precio_unitario * vi.cantidad) FILTER (WHERE vi.precio_unitario IS NOT NULL), 0)
        - COALESCE(SUM(p.costo * vi.cantidad), 0)
      )
      / COALESCE(SUM(vi.precio_unitario * vi.cantidad) FILTER (WHERE vi.precio_unitario IS NOT NULL), 1)
      * 100,
      2
    )
  END AS margen_pct
FROM ventas v
JOIN venta_items vi ON vi.venta_id = v.id
JOIN productos   p  ON p.id        = vi.producto_id
GROUP BY v.id, v.fecha, v.created_at
ORDER BY v.fecha DESC, v.created_at DESC;

-- ── FUNCIONES ─────────────────────────────────────────────────────────────────

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

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── TRIGGERS ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS productos_updated_at ON productos;
CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ÍNDICES ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_productos_codigo      ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_tipo        ON productos(tipo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre      ON productos USING gin(to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_entradas_producto     ON entradas(producto_id);
CREATE INDEX IF NOT EXISTS idx_entradas_fecha        ON entradas(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_fecha         ON compras(fecha);
CREATE INDEX IF NOT EXISTS idx_compra_items_compra   ON compra_items(compra_id);
CREATE INDEX IF NOT EXISTS idx_compra_items_producto ON compra_items(producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha          ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_venta_items_venta     ON venta_items(venta_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_producto  ON venta_items(producto_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- App interna sin autenticación — anon key tiene acceso completo.
-- inventario_view hereda permisos de las tablas base (no necesita policy).

ALTER TABLE productos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras      ENABLE ROW LEVEL SECURITY;
ALTER TABLE compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo" ON productos;
CREATE POLICY "Permitir todo" ON productos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo" ON entradas;
CREATE POLICY "Permitir todo" ON entradas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo autenticado" ON compras;
CREATE POLICY "Permitir todo autenticado" ON compras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo autenticado" ON compra_items;
CREATE POLICY "Permitir todo autenticado" ON compra_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo" ON ventas;
CREATE POLICY "Permitir todo" ON ventas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo" ON venta_items;
CREATE POLICY "Permitir todo" ON venta_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── OAuth 2.0 tables (MCP connector) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS oauth_codes (
  code            TEXT        PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri    TEXT        NOT NULL,
  code_challenge  TEXT        NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  access_token  TEXT        PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  refresh_token TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only accessible via service-role key (no authenticated user policies needed)
ALTER TABLE oauth_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id     TEXT        PRIMARY KEY,
  client_secret TEXT        NOT NULL,
  redirect_uris JSONB       NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
