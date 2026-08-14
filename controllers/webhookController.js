const Stripe = require("stripe");

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

const pool = require("../config/dbpg");


async function stripeWebhook(req, res) {

    const signature =
        req.headers["stripe-signature"];


    let event;


    try {

        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

    } catch (error) {

        console.error(
            "Webhook inválido:",
            error.message
        );

        return res.status(400).send(
            `Webhook Error: ${error.message}`
        );

    }


    try {

        switch (event.type) {


            case "checkout.session.completed": {

                const session =
                    event.data.object;


                const orderId =
                    session.metadata?.order_id;


                if (!orderId) {

                    console.error(
                        "Webhook sem order_id."
                    );

                    break;

                }


                await pool.query(`
                    UPDATE orders
                    SET
                        status = 'paid',
                        stripe_payment_intent_id = $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                    AND status = 'pending'
                `, [
                    session.payment_intent,
                    orderId
                ]);


                const orderResult = await pool.query(`
                    SELECT
                        product_id,
                        quantity
                    FROM order_items
                    WHERE order_id = $1
                `, [orderId]);


                for (
                    const item
                    of orderResult.rows
                ) {

                    await pool.query(`
                        UPDATE products
                        SET
                            stock = stock - $1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `, [
                        item.quantity,
                        item.product_id
                    ]);

                }


                console.log(
                    `Pedido ${orderId} pago.`
                );

                break;
            }


            case "checkout.session.expired": {

                const session =
                    event.data.object;


                const orderId =
                    session.metadata?.order_id;


                if (orderId) {

                    await pool.query(`
                        UPDATE orders
                        SET
                            status = 'cancelled',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                        AND status = 'pending'
                    `, [orderId]);

                }

                break;
            }


            default:

                console.log(
                    `Evento não tratado: ${event.type}`
                );

        }


        res.json({
            received: true
        });


    } catch (error) {

        console.error(
            "Erro processando webhook:",
            error
        );

        res.status(500).json({
            error: "Erro ao processar webhook."
        });

    }
}


module.exports = {
    stripeWebhook
};