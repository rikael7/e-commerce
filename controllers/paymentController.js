require('dotenv').config();
const Stripe = require("stripe");

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

const pool = require("../config/dbpg");


async function createCheckoutSession(req, res) {

    try {
        const {
            order_id
        } = req.body;
        if (!order_id) {
            return res.status(400).json({
                error: "order_id é obrigatório."
            });
        }

        const orderResult = await pool.query(`
            SELECT
                id,
                customer_name,
                customer_email,
                total,
                status
            FROM orders
            WHERE id = $1
        `, [order_id]);


        if (orderResult.rows.length === 0) {

            return res.status(404).json({
                error: "Pedido não encontrado."
            });

        }


        const order = orderResult.rows[0];


        if (order.status !== "pending") {

            return res.status(400).json({
                error: "Este pedido não pode mais ser pago."
            });

        }


        const itemsResult = await pool.query(`
            SELECT
                product_name,
                quantity,
                price
            FROM order_items
            WHERE order_id = $1
        `, [order_id]);


        const lineItems = itemsResult.rows.map(item => {

            return {
                price_data: {
                    currency: "brl",

                    product_data: {
                        name: item.product_name
                    },

                    unit_amount: item.price
                },

                quantity: item.quantity
            };

        });


        const session = await stripe.checkout.sessions.create({

            mode: "payment",

            payment_method_types: [
                "card"
            ],

            customer_email: order.customer_email,

            line_items: lineItems,

            metadata: {
                order_id: String(order.id)
            },

            success_url:
                `${process.env.FRONTEND_URL}/sucesso.html?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
                `${process.env.FRONTEND_URL}/cancelado.html`

        });


        await pool.query(`
            UPDATE orders
            SET stripe_session_id = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [
            session.id,
            order.id
        ]);


        res.json({
            checkout_url: session.url
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Erro ao criar checkout."
        });

    }
}


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

async function handleStripeWebhook(req, res) {

    const event = req.stripeEvent;

    try {

        switch (event.type) {

            case 'checkout.session.completed': {
                const session = event.data.object;
                const orderId = session.metadata.order_id;

                await pool.query(`
                    UPDATE orders
                    SET status = 'paid',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    AND status = 'pending'
                `, [orderId]);

                break;
            }

            default:
                console.log(`Evento não tratado: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {

        console.error('Erro ao processar webhook:', error);
        res.status(200).json({ received: true, error: 'internal error logged' });

    }
}



module.exports = {
    createCheckoutSession,
    getProducts, 
    getProductById, 
    createOrder, 
    getOrderById,
    handleStripeWebhook,
};