const pool = require("../config/dbpg");

async function getProducts(req, res) {

    try {

        const result = await pool.query(`
            SELECT
                id,
                name,
                description,
                price,
                stock,
                image_url,
                active,
                created_at
            FROM products
            WHERE active = TRUE
            ORDER BY id DESC
        `);

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar produtos."
        });

    }
}


async function getProductById(req, res) {

    try {

        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                id,
                name,
                description,
                price,
                stock,
                image_url,
                active
            FROM products
            WHERE id = $1
            AND active = TRUE
        `, [id]);

        if (result.rows.length === 0) {

            return res.status(404).json({
                error: "Produto não encontrado."
            });

        }

        res.json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar produto."
        });

    }
}


module.exports = {
    getProducts,
    getProductById
};