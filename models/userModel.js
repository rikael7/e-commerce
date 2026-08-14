const { pool }= require("../config/dbpg");


// ======================================================
// CONTROLLER ADMIN
// Upload de vídeo
// ======================================================

async function uploadVideo(req, res) {

    try {

        const { titulo, descricao } = req.body;


        if (!req.file) {
            return res.status(400).json({
                message: "Nenhum vídeo enviado."
            });
        }


        const video = {
            titulo,
            descricao,
            nome_arquivo: req.file.filename,
            tipo_arquivo: req.file.mimetype,
            tamanho: req.file.size,
            usuario_id: req.session.userId
        };


        await pool.query(
            `
            INSERT INTO videos
            (
                titulo,
                descricao,
                nome_arquivo,
                tipo_arquivo,
                tamanho,
                usuario_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                video.titulo,
                video.descricao,
                video.nome_arquivo,
                video.tipo_arquivo,
                video.tamanho,
                video.usuario_id
            ]
        );


        return res.status(201).json({
            message: "Vídeo enviado com sucesso."
        });


    } catch (error) {

        console.error("Erro upload vídeo:", error);

        return res.status(500).json({
            message: "Erro ao salvar vídeo."
        });

    }
}

// ======================================================
// CONTROLLER DE AUTENTICAÇÃO
// ======================================================

// Buscar usuário por email
async function findUserByEmail(email) {

    const result = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            password_hash
        FROM users
        WHERE email = $1
        LIMIT 1
        `,
        [email]
    );


    return result.rows[0] || null;
}


// Buscar usuário por nome
async function finduserbyname(name) {

    const result = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            password_hash
        FROM users
        WHERE name = $1
        LIMIT 1
        `,
        [name]
    );


    return result.rows[0] || null;
}



// ======================================================
// CONTROLLERS DO USUÁRIO
// ======================================================

async function obterPerfil(req, res) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ erro: 'Nenhuma sessão ativa.' });
    }
 
    try {
        const resultado = await pool.query(
            `SELECT name, created_at
             FROM users
             WHERE id = $1`,
            [req.session.userId]
        );
 
        if (resultado.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
 
        const { name, created_at } = resultado.rows[0];
 
        return res.json({
            nome: name,
            registradoEm: created_at, // ISO string — formatação de data fica no front
        });
    } catch (erro) {
        console.error('Erro ao buscar perfil do usuário:', erro);
        return res.status(500).json({ erro: 'Não foi possível carregar o perfil.' });
    }
}



// Buscar usuário pelo ID PARA BUSCAR INFORMAÇÕES DO PROPRIO PERFIL
async function findUserById(id) {

    const result = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            bio,
            phone,
            avatar_url,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [id]
    );


    return result.rows[0] || null;
}


// Criar usuário
async function createUser({ name, email, passwordHash }) {

    const result = await pool.query(
        `
        INSERT INTO users
        (
            name,
            email,
            password_hash
        )
        VALUES ($1, $2, $3)
        RETURNING id, name, email
        `,
        [
            name,
            email,
            passwordHash
        ]
    );


    return result.rows[0];
}

// Atualizar perfil
async function updateUserProfile(
    id,
    { name, bio, phone, avatarUrl }
) {

    await pool.query(
        `
        UPDATE users
        SET
            name = $1,
            bio = $2,
            phone = $3,
            avatar_url = $4,
            updated_at = NOW()
        WHERE id = $5
        `,
        [
            name,
            bio,
            phone,
            avatarUrl,
            id
        ]
    );


    return findUserById(id);
}






// controllers/missoesController.js
//
// Ajuste o caminho do require abaixo para onde está o seu pool de conexão
// do 'pg' (ex.: const pool = require('../db');)


 



module.exports = {
    uploadVideo,
    findUserByEmail,
    finduserbyname,
    findUserById,
    createUser,
    obterPerfil,
    updateUserProfile
};








// const pool = require('../config/db');


// // CONTROLLER ADMIN
// // Controller upload de video do admin
// async function uploadVideo(req, res) {

//     try {

//         const {
//             titulo,
//             descricao
//         } = req.body;

//         // Verifica se recebeu arquivo
//         if (!req.file) {
//             return res.status(400).json({
//                 message: 'Nenhum vídeo enviado.'
//             });
//         }

//         const video = {
//             titulo,
//             descricao,
//             nome_arquivo: req.file.filename,
//             tipo_arquivo: req.file.mimetype,
//             tamanho: req.file.size,
//             usuario_id: req.session.user.id
//         };


//         await pool.query(
//             `
//             INSERT INTO videos
//             (
//                 titulo,
//                 descricao,
//                 nome_arquivo,
//                 tipo_arquivo,
//                 tamanho,
//                 usuario_id
//             )
//             VALUES (?, ?, ?, ?, ?, ?)
//             `,
//             [
//                 video.titulo,
//                 video.descricao,
//                 video.nome_arquivo,
//                 video.tipo_arquivo,
//                 video.tamanho,
//                 video.usuario_id
//             ]
//         );


//         return res.status(201).json({
//             message: 'Vídeo enviado com sucesso.'
//         });


//     } catch (error) {

//         console.error(error);

//         return res.status(500).json({
//             message: 'Erro ao salvar vídeo.'
//         });

//     }

// };




// // CONTROLLER DE AUTENTICAÇÃO
// //controler 
// async function findUserByEmail(email) {
//   const [rows] = await pool.query(
//     'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
//     [email]
//   );
//   return rows[0] || null;
// }
// // finduserbyname
// async function finduserbyname(name) {
//   const [rows] = await pool.query(
//     'SELECT id, name, email, password_hash FROM users WHERE name = ? LIMIT 1',
//     [name]
//   );
//   return rows[0] || null;
// }



// // CONTROLLERS DO USER
// // controller para ler info do usuario pelo id 
// async function findUserById(id) {
//   const [rows] = await pool.query(
//     'SELECT id, name, email, bio, phone, avatar_url, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
//     [id]
//   );
//   return rows[0] || null;
// }
// // controller para criar usuario
// async function createUser({ name, email, passwordHash }) {
//   const [result] = await pool.query(
//     'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
//     [name, email, passwordHash]
//   );
//   return { id: result.insertId, name, email };
// }
// // controller para atualizar o perfil do usuário
// async function updateUserProfile(id, { name, bio, phone, avatarUrl }) {
//   await pool.query(
//     `UPDATE users
//      SET name = ?, bio = ?, phone = ?, avatar_url = ?
//      WHERE id = ?`,
//     [name, bio, phone, avatarUrl, id]
//   );
//   return findUserById(id);
// }




// module.exports = { finduserbyname, findUserByEmail, findUserById, createUser, uploadVideo };