// Middleware que protege rotas exigindo uma sessão autenticada.
// Verifica sessão e permissões no PostgreSQL.

const db = require('../config/dbpg'); // pool PostgreSQL


// Verificar se tem permissão de admin
async function admin(req, res, next) {
    try {

        const userId = req.session.userId;

        const result = await db.pool.query(
            'SELECT adm FROM users WHERE id = $1 LIMIT 1',
            [userId]
        );

        const rows = result.rows;


        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Usuário não encontrado.'
            });
        }


        if (!rows[0].adm) {
            // return res.status(403).json({
                    return res.redirect('/acesso-negado');

                // message: 'Acesso negado, você não é administrador.'
            // });
        }


        next();

    } catch (err) {

        console.error("Erro no middleware admin:", err);

        return res.status(500).json({
            message: 'Erro interno do servidor.'
        });
    }
}



// Middleware que protege rotas exigindo uma sessão autenticada.
function isAuthenticated(req, res, next) {

    if (req.session && req.session.userId) {
        return next();
    }

    // return res.status(401).json({
    //     error: 'Não autenticado. Faça login para continuar.'
    // });

    // manda para a rota de login
     return res.redirect('/login');

}


module.exports = {
    isAuthenticated,
    admin
};