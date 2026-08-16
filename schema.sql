-- ============================================
-- Schema para o sistema de pagamento (Mercado Pago)
-- PostgreSQL
-- ============================================

-- Catálogo de produtos
CREATE TABLE IF NOT EXISTS produtos (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(150) NOT NULL,
    descricao   TEXT,
    preco       NUMERIC(10, 2) NOT NULL,
    estoque     INTEGER NOT NULL DEFAULT 0,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de pedidos
-- O controller espera as colunas: preference_id, status_pagamento, payment_id, atualizado_em
CREATE TABLE IF NOT EXISTS pedidos (
    id              SERIAL PRIMARY KEY,
    cliente_id      INTEGER,               -- FK para sua tabela de clientes/usuários, se existir
    valor_total     NUMERIC(10, 2) NOT NULL,
    status_pagamento VARCHAR(20) NOT NULL DEFAULT 'pendente',
    preference_id   VARCHAR(100),          -- id da preferência gerada no Mercado Pago
    payment_id      VARCHAR(100),          -- id do pagamento confirmado
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índice para consultas rápidas pelo preference_id (usado no fluxo de checkout)
CREATE INDEX IF NOT EXISTS idx_pedidos_preference_id ON pedidos (preference_id);

-- Itens de cada pedido — obrigatória, pois o mercadopagoController monta
-- a preferência de pagamento a partir dela (nunca a partir do que o front envia)
CREATE TABLE IF NOT EXISTS pedido_itens (
    id          SERIAL PRIMARY KEY,
    pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id  INTEGER NOT NULL REFERENCES produtos(id),
    titulo      VARCHAR(150) NOT NULL,   -- snapshot do nome no momento da compra
    quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
    preco       NUMERIC(10, 2) NOT NULL  -- snapshot do preço no momento da compra
);

-- Histórico de pagamentos (populada pelo webhook)
-- payment_id é UNIQUE porque o controller usa ON CONFLICT (payment_id)
CREATE TABLE IF NOT EXISTS pagamentos (
    id          SERIAL PRIMARY KEY,
    pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    payment_id  VARCHAR(100) NOT NULL UNIQUE,
    status      VARCHAR(20) NOT NULL,   -- approved, pending, rejected, in_process, refunded, etc.
    valor       NUMERIC(10, 2),
    metodo      VARCHAR(50),            -- ex: pix, credit_card, bolbradesco...
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_pedido_id ON pagamentos (pedido_id);