-- =====================================================
-- Schema: sistema de checkout com Stripe
-- =====================================================

-- =================
-- Produtos (loja)
-- =================
CREATE TABLE IF NOT EXISTS store_products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       INTEGER NOT NULL CHECK (price >= 0), -- em centavos
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url   VARCHAR(500),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =================
-- Pedidos
-- =================
CREATE TABLE IF NOT EXISTS orders (
    id                 SERIAL PRIMARY KEY,
    customer_name      VARCHAR(255) NOT NULL,
    customer_email     VARCHAR(255) NOT NULL,
    total              INTEGER NOT NULL CHECK (total >= 0), -- em centavos
    status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'paid', 'expired', 'canceled', 'refunded')),
    stripe_session_id  VARCHAR(255),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);

-- =================
-- Itens do pedido
-- =================
CREATE TABLE IF NOT EXISTS order_items (
    id            SERIAL PRIMARY KEY,
    order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    INTEGER REFERENCES store_products(id) ON DELETE SET NULL,
    product_name  VARCHAR(255) NOT NULL, -- snapshot do nome no momento da compra
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    price         INTEGER NOT NULL CHECK (price >= 0),   -- preço unitário em centavos, no momento da compra
    subtotal      INTEGER NOT NULL CHECK (subtotal >= 0) -- price * quantity
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- =================
-- Sessões (express-session + connect-pg-simple)
-- Só precisa disso se preferir criar manualmente em vez de
-- deixar o createTableIfMissing: true do connect-pg-simple criar sozinho
-- =================
CREATE TABLE IF NOT EXISTS sessions (
    sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
    sess   JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);