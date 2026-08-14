const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Teste de conexão ao iniciar
pool.connect()
    .then(client => {
        console.log("✅ PostgreSQL conectado com sucesso!");

        client.release();
    })
    .catch(err => {
        console.error("❌ Erro ao conectar no PostgreSQL:");
        console.error(err.message);
    });


// Log de erros inesperados do pool
pool.on("error", (err) => {
    console.error("❌ Erro inesperado no pool PostgreSQL:");
    console.error(err.message);
});


async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      room VARCHAR(100) NOT NULL DEFAULT 'geral',
      username VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Tabela "messages" pronta.');
 
  // -------- Central de Chamados --------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chamados (
      id              SERIAL PRIMARY KEY,
      numero          VARCHAR(20) UNIQUE,
      titulo          VARCHAR(255) NOT NULL,
      descricao       TEXT NOT NULL,
      categoria       VARCHAR(30) NOT NULL
                      CHECK (categoria IN ('ti','infraestrutura','manutencao','rh','financeiro','outros')),
      prioridade      VARCHAR(20) NOT NULL
                      CHECK (prioridade IN ('baixa','media','alta','urgente')),
      status          VARCHAR(20) NOT NULL DEFAULT 'aberto'
                      CHECK (status IN ('aberto','andamento','resolvido')),
      usuario_id      INTEGER,
      criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
 
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chamado_anexos (
      id              SERIAL PRIMARY KEY,
      chamado_id      INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
      caminho_arquivo VARCHAR(500) NOT NULL,
      nome_original   VARCHAR(255),
      criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
 
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chamado_comentarios (
      id              SERIAL PRIMARY KEY,
      chamado_id      INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
      autor_id        INTEGER,
      mensagem        TEXT NOT NULL,
      criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
 
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_chamados_categoria ON chamados(categoria);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_chamados_prioridade ON chamados(prioridade);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_anexos_chamado_id ON chamado_anexos(chamado_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_comentarios_chamado_id ON chamado_comentarios(chamado_id);`);
 
  await pool.query(`
    CREATE OR REPLACE FUNCTION set_atualizado_em()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.atualizado_em = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
 
  await pool.query(`DROP TRIGGER IF EXISTS trg_chamados_atualizado_em ON chamados;`);
  await pool.query(`
    CREATE TRIGGER trg_chamados_atualizado_em
      BEFORE UPDATE ON chamados
      FOR EACH ROW
      EXECUTE FUNCTION set_atualizado_em();
  `);
 
  console.log('Tabelas de "chamados" prontas.');
}
 

 


module.exports = { pool, initDb};


// antes do websocket
// module.exports = pool;