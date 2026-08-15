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

// =================
// Import de Middlewares
// =============
const { sanitizeBody, sanitizeQuery } = require('./middleware/sanitize');
const { isAuthenticated, admin } = require('./middleware/authMiddleware');
const authtrue  = require('./middleware/authtrue'); // middleware para bloquear usuario autenticado de entrar na rota get de register e em login
const validateStripeWebhook  = require('./middleware/stripeWebhook'); // middleware para bloquear usuario autenticado de entrar na rota get de register e em login


//
// =================
// Import de rotas
// =============
const authRoutes = require("./routes/authRoutes");
// const ordersRoutes = require("./routes/orders");
const apiRouter = require("./routes/stripe"); // ou o nome que preferir

// const stripe = require("./routes/stripe")


// =================
// Import de controllers
// =============
const { handleStripeWebhook } = require("./controllers/paymentController");



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

app.use(helmet());

app.use(cors({
    origin: process.env.FRONTEND_URL
}));


// =========================
//  rate-limit
// ==================

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





// WEBHOOK
// Webhook do Stripe — precisa vir ANTES do express.json() global,
// e como rota específica (não dentro do apiRouter)
app.post(
    '/api/payment/webhook',
    express.raw({ type: 'application/json' }),
    validateStripeWebhook, handleStripeWebhook
);

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
    res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

app.get('/admin', isAuthenticated, admin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
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


app.use('/api', apiLimiter)

// =======================
// ROTAS API
// =========================

app.use('/api', apiRouter);


/*
|--------------------------------------------------------------------------
| Webhook Stripe
|--------------------------------------------------------------------------
|
| IMPORTANTE:
| precisa vir antes do express.json()
|
*/
// app.use('/api/payment', express.raw({ type: "application/json" }), validateStripeWebhook, stripe);
// // app.post( "/webhook", );




app.use(express.json());


app.get("/api/health", (req, res) => {

    res.json({
        status: "online",
        database: "PostgreSQL",
        payment: "Stripe"
    });

});


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