const Stripe = require("stripe");

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

const pool = require("../config/database");


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


module.exports = {
    createCheckoutSession
};