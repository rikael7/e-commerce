const pool = require("../config/dbpg");


async function createOrder(req, res) {

    const client = await pool.connect();

    try {

        const {
            customer_name,
            customer_email,
            items
        } = req.body;


        if (!customer_name || !customer_email) {

            return res.status(400).json({
                error: "Nome e email são obrigatórios."
            });

        }


        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({
                error: "O pedido precisa ter pelo menos um produto."
            });

        }


        await client.query("BEGIN");


        let total = 0;

        const orderItems = [];


        for (const item of items) {

            const productResult = await client.query(`
                SELECT
                    id,
                    name,
                    price,
                    stock
                FROM products
                WHERE id = $1
                AND active = TRUE
                FOR UPDATE
            `, [item.product_id]);


            if (productResult.rows.length === 0) {

                throw new Error(
                    `Produto ${item.product_id} não encontrado.`
                );

            }


            const product = productResult.rows[0];

            const quantity = Number(item.quantity);


            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                throw new Error(
                    `Quantidade inválida para o produto ${product.name}.`
                );

            }


            if (quantity > product.stock) {

                throw new Error(
                    `Estoque insuficiente para ${product.name}.`
                );

            }


            const subtotal = product.price * quantity;

            total += subtotal;


            orderItems.push({
                product_id: product.id,
                product_name: product.name,
                quantity,
                price: product.price,
                subtotal
            });

        }


        const orderResult = await client.query(`
            INSERT INTO orders
            (
                customer_name,
                customer_email,
                total,
                status
            )
            VALUES ($1, $2, $3, 'pending')
            RETURNING id, total, status, created_at
        `, [
            customer_name,
            customer_email,
            total
        ]);


        const order = orderResult.rows[0];


        for (const item of orderItems) {

            await client.query(`
                INSERT INTO order_items
                (
                    order_id,
                    product_id,
                    product_name,
                    quantity,
                    price,
                    subtotal
                )
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                order.id,
                item.product_id,
                item.product_name,
                item.quantity,
                item.price,
                item.subtotal
            ]);

        }


        await client.query("COMMIT");


        res.status(201).json({
            message: "Pedido criado.",
            order
        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error(error);

        res.status(400).json({
            error: error.message
        });

    } finally {

        client.release();

    }
}


async function getOrderById(req, res) {

    try {

        const { id } = req.params;


        const orderResult = await pool.query(`
            SELECT
                id,
                customer_name,
                customer_email,
                total,
                status,
                stripe_session_id,
                created_at
            FROM orders
            WHERE id = $1
        `, [id]);


        if (orderResult.rows.length === 0) {

            return res.status(404).json({
                error: "Pedido não encontrado."
            });

        }


        const itemsResult = await pool.query(`
            SELECT
                id,
                product_id,
                product_name,
                quantity,
                price,
                subtotal
            FROM order_items
            WHERE order_id = $1
            ORDER BY id
        `, [id]);


        res.json({
            order: orderResult.rows[0],
            items: itemsResult.rows
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao buscar pedido."
        });

    }
}


module.exports = {
    createOrder,
    getOrderById
};