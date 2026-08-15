// controllers/checkoutController.js
require('dotenv').config();
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(req, res) {
  const { orderId, items } = req.body; // enviado pelo frontend

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items, // [{ price: 'price_123', quantity: 1 }]
      mode: 'payment', 
      success_url: 'https://e-commerce-fomb.onrender.com/sucesso', // DEFINE DEPOIS DO CHECKOUT PARA ONDE O CLIENTE VAI 
      cancel_url: 'https://e-commerce-fomb.onrender.com/cancelado',
      metadata: { order_id: orderId }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Erro criando sessão:", error);
    res.status(500).json({ error: "Erro ao criar sessão de checkout." });
  }
}

module.exports = { createCheckoutSession };
