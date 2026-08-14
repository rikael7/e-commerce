const express = require("express");

const {
    createCheckoutSession
} = require("../controllers/paymentController");

const router = express.Router();

router.post(
    "/create-checkout",
    createCheckoutSession
);

module.exports = router;