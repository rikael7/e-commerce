const express = require('express');
const router = express.Router();
const mercadopagoController = require('../controllers/mercadopagoController');



router.post('/pedidos', mercadopagoController.criarPedido);

// Lista os produtos disponíveis
router.get('/produtos', mercadopagoController.listarProdutos);

// Cria a preferência de pagamento e retorna o link de checkout
router.post('/preferencia', mercadopagoController.criarPreferencia);

// Endpoint que o Mercado Pago chama para notificar mudanças de status
router.post('/webhook', mercadopagoController.receberWebhook);

// Consulta um pagamento específico direto na API do Mercado Pago
router.get('/pagamento/:id', mercadopagoController.consultarPagamento);

// Consulta o status de pagamento salvo no banco, por pedido
router.get('/pedido/:pedidoId/status', mercadopagoController.statusPorPedido);

module.exports = router;