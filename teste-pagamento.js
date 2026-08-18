require('dotenv').config();

const {
    MercadoPagoConfig,
    Payment
} = require('mercadopago');

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

const paymentClient = new Payment(client);

async function testar() {
    try {
        const payment = await paymentClient.get({
            id: '173454545871'
        });

        console.log('PAGAMENTO ENCONTRADO:');
        console.log(JSON.stringify(payment, null, 2));

    } catch (error) {
        console.error('ERRO AO CONSULTAR PAGAMENTO:');
        console.error(error);
    }
}

testar();