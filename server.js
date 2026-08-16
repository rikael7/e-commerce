require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const rateLimit = require("express-rate-limit");
const helmet = require('helmet');
const cors = require("cors");

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// =================
// Import de Middlewares
// =============
const { sanitizeBody, sanitizeQuery } = require('./middleware/sanitize');
const { isAuthenticated, admin } = require('./middleware/authMiddleware');
const authtrue  = require('./middleware/authtrue'); // middleware para bloquear usuario autenticado de entrar na rota get de register e em login


//
// =================
// Import de rotas
// =============
const authRoutes = require("./routes/authRoutes");
const mercadopago = require('./routes/Mercadopagoroutes');
const produtoRoutes = require('./routes/produtosRoutes')

// =================
// Import de controllers
// =============



// =================
// websocket
// =============
const http = require ('http');
const server = http.createServer(app);

/*
|--------------------------------------------------------------------------
| Segurança
|--------------------------------------------------------------------------
*/

app.use(helmet({
        contentSecurityPolicy: false

}));

app.use(cors({
    origin: process.env.FRONTEND_URL
}));

//  rate-limie
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        error: "Muitas requisições. Tente novamente mais tarde."
    }

});

// =================
// Pool do Postgree
// =============
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// =================
// bloquear Payload gigante
// =============
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '100kb' 
}));

// =================
// enviar front
// =============
app.use(express.static(path.join(__dirname, 'public')));

// =================
// Sanitização
// =============
app.use(sanitizeBody);
app.use(sanitizeQuery);

// =================
// Seções do Postgree
// =============
app.use(
    session({
        store: new pgSession({
            pool: pool,
            tableName: 'sessions',
            createTableIfMissing: true
        }),

        key: 'connect.sid',

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,

            secure: process.env.NODE_ENV === 'production',

            maxAge: 1000 * 60 * 60 * 24 // 1 dia
        }
    })
);

// =================
// enviar front
// =============

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/admin', isAuthenticated, admin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'adminprodutos.html'));
});


// =================
// frontend publico
// =============

app.get('/login', authtrue, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', authtrue, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/404', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', '404.html'));
});



// =======================
// ROTAS API
// =========================
app.use(express.json());

// app.use('/api', mercado);
app.use('/api/mercadopago', mercadopago);
app.use('/api', produtoRoutes);                 // CRUD de produtos
//24242


// Erro genérico
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor.'
    });
});

// se não encontrar nenhuma rota
// Middleware 404 (sempre por último pois o node le de cima para baixo as rotas, caso não encontre nada vai cair nessa)
app.use((req, res) => {
    res.redirect("/404");
});


server.listen(PORT, () => {
 console.log(`Servidor rodando em http://localhost:${PORT}`);
});
// ================



// 
// app.listen(PORT, () => {
//     console.log(`Servidor rodando na porta ${PORT}`);
// });