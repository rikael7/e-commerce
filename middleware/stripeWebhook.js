const Stripe = require("stripe");
require("dotenv").config();

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

function validateStripeWebhook(req, res, next) {

    const signature = req.headers["stripe-signature"];

    if (!signature) {
        return res.status(400).json({
            error: "Assinatura da Stripe ausente."
        });
    }

    try {

        const event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        // Guarda o evento para o controller usar
        req.stripeEvent = event;

        next();

    } catch (error) {

        console.error(
            "Assinatura do webhook inválida:",
            error.message
        );

        return res.status(400).json({
            error: "Webhook inválido."
        });
    }
}

module.exports = validateStripeWebhook;