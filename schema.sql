-- =========================================================
-- Schema do banco de dados — Sistema de Login com Banco de Dados
-- Baseado nas queries usadas em no controller
--
-- Como rodar:
--   psql -U seu_usuario -d seu_banco -f schema.sql
-- Ou cole o conteúdo direto no editor SQL do DBeaver.
-- =========================================================

-- ---------------------------------------------------------
-- Extensão usada para gerar UUID, caso queira usar no futuro
-- (não obrigatória para este schema, mas comum em projetos Node/PG)
-- ---------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------
-- Tabela: users
-- Usada por findUserByEmail, finduserbyname, findUserById,
-- createUser, obterPerfil e updateUserProfile
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(150) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    bio            TEXT,
    phone          VARCHAR(30),
    avatar_url     TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_name ON users (name);

-- Mantém updated_at sempre atualizado automaticamente em qualquer UPDATE,
-- mesmo que o controller esqueça de setar (updateUserProfile já seta manualmente,
-- mas o trigger cobre qualquer outro UPDATE futuro na tabela).
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- Tabela: session
-- Necessária se você usa express-session + connect-pg-simple
-- para persistir sessões no PostgreSQL em vez de memória.
-- Se createTableIfMissing estiver ativo no connect-pg-simple,
-- ele cria isso sozinho — deixado aqui só como referência/backup.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS session (
    sid     VARCHAR NOT NULL COLLATE "default",
    sess    JSON NOT NULL,
    expire  TIMESTAMP(6) NOT NULL
)
WITH (OIDS = FALSE);

ALTER TABLE session DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE session
    ADD CONSTRAINT session_pkey
    PRIMARY KEY (sid)
    NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);


-- ============================================
-- Schema para o sistema de pagamento (Mercado Pago)
-- PostgreSQL
-- ============================================
-- ==========================================
-- PRODUTOS
-- ==========================================

CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    imagem_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Caso a tabela já exista sem imagem_url
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS imagem_url TEXT;


-- ==========================================
-- PEDIDOS
-- ==========================================

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER,
    valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total >= 0),
    status_pagamento VARCHAR(20) NOT NULL DEFAULT 'pendente',
    preference_id VARCHAR(100),
    payment_id VARCHAR(100),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_preference_id
ON pedidos (preference_id);

-- Caso a tabela já exista, só adicione as colunas que faltam:
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nome_completo VARCHAR(150);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pais VARCHAR(60) DEFAULT 'Brasil';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado CHAR(2);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS rua VARCHAR(150);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS numero VARCHAR(15);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS ponto_referencia VARCHAR(150);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nome_destinatario VARCHAR(150);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS telefone_entrega VARCHAR(20);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP;


-- ==========================================
-- ITENS DO PEDIDO
-- ==========================================

CREATE TABLE IF NOT EXISTS pedido_itens (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL
        REFERENCES pedidos(id)
        ON DELETE CASCADE,

    produto_id INTEGER NOT NULL
        REFERENCES produtos(id),

    titulo VARCHAR(150) NOT NULL,

    quantidade INTEGER NOT NULL
        CHECK (quantidade > 0),

    preco NUMERIC(10, 2) NOT NULL
        CHECK (preco >= 0)
);


CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido_id
ON pedido_itens (pedido_id);


-- ==========================================
-- PAGAMENTOS
-- ==========================================

CREATE TABLE IF NOT EXISTS pagamentos (
    id SERIAL PRIMARY KEY,

    pedido_id INTEGER NOT NULL
        REFERENCES pedidos(id)
        ON DELETE CASCADE,

    payment_id VARCHAR(100) NOT NULL UNIQUE,

    status VARCHAR(30) NOT NULL,

    valor NUMERIC(10, 2),

    metodo VARCHAR(50),

    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_pagamentos_pedido_id
ON pagamentos (pedido_id);