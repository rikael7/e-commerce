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



 

 


module.exports = pool;


// antes do websocket
// module.exports = pool;