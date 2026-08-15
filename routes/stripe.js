const express = require("express");
const {
    getProducts,
    getProductById,
    createOrder,
    getOrderById,
    createCheckoutSession
} = require("../controllers/paymentController");

const router = express.Router();

// produtos
router.get("/products", getProducts);
router.get("/products/:id", getProductById);

// pedidos
router.post("/orders", createOrder);
router.get("/orders/:id", getOrderById);

// checkout
router.post("/payment/create-checkout", createCheckoutSession);

module.exports = router;