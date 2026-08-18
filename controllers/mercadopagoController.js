require('dotenv').config();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const pool = require('../config/dbpg');

// --- Configuração do client do Mercado Pago ---
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

const mercadopagoController = {


// =================
  // USER CONTROLLERS
// =============
  // Lista os produtos disponíveis para o usuário escolher
  async listarProdutos(req, res) {
    try {
      const resultado = await pool.query(
        `SELECT id, nome, descricao, preco, estoque, imagem_url FROM produtos WHERE ativo = TRUE ORDER BY nome`
      );
      return res.status(200).json(resultado.rows);
    } catch (erro) {
      console.error('Erro ao listar produtos:', erro);
      return res.status(500).json({ erro: 'Erro ao listar produtos.' });
    }
  },

  // Cria um pedido a partir dos itens escolhidos pelo usuário
  // Body do user esperado: { itens: [{ produtoId, quantidade }] }
  // O preço nunca vem do front — é sempre buscado na tabela produtos
  // async criarPedido(req, res) {
  //   const { itens } = req.body;

  //   if (!itens || !Array.isArray(itens) || itens.length === 0) {
  //     return res.status(400).json({ erro: 'Nenhum item foi selecionado.' });
  //   }

  //   const conexao = await pool.connect();

  //   try {
  //     await conexao.query('BEGIN');

  //     const produtoIds = itens.map((item) => item.produtoId);
  //     const resultadoProdutos = await conexao.query(
  //       `SELECT id, nome, preco, estoque FROM produtos WHERE id = ANY($1::int[]) AND ativo = TRUE`,
  //       [produtoIds]
  //     );

  //     const produtosEncontrados = resultadoProdutos.rows;

  //     if (produtosEncontrados.length !== produtoIds.length) {
  //       await conexao.query('ROLLBACK');
  //       return res.status(400).json({ erro: 'Um ou mais produtos não existem ou estão indisponíveis.' });
  //     }

  //     let valorTotal = 0;
  //     const itensParaInserir = itens.map((item) => {
  //       const produto = produtosEncontrados.find((p) => p.id === item.produtoId);

  //       if (item.quantidade > produto.estoque) {
  //         throw new Error(`Estoque insuficiente para "${produto.nome}".`);
  //       }

  //       const subtotal = Number(produto.preco) * Number(item.quantidade);
  //       valorTotal += subtotal;

  //       return {
  //         produtoId: produto.id,
  //         titulo: produto.nome,
  //         quantidade: item.quantidade,
  //         preco: produto.preco,
  //       };
  //     });

  //     const resultadoPedido = await conexao.query(
  //       `INSERT INTO pedidos (valor_total, status_pagamento) VALUES ($1, 'pendente') RETURNING id`,
  //       [valorTotal]
  //     );
  //     const pedidoId = resultadoPedido.rows[0].id;

  //     for (const item of itensParaInserir) {
  //       await conexao.query(
  //         `INSERT INTO pedido_itens (pedido_id, produto_id, titulo, quantidade, preco)
  //          VALUES ($1, $2, $3, $4, $5)`,
  //         [pedidoId, item.produtoId, item.titulo, item.quantidade, item.preco]
  //       );

  //       await conexao.query(
  //         `UPDATE produtos SET estoque = estoque - $1 WHERE id = $2`,
  //         [item.quantidade, item.produtoId]
  //       );
  //     }

  //     await conexao.query('COMMIT');

  //     return res.status(201).json({
  //       pedidoId,
  //       valorTotal,
  //       itens: itensParaInserir,
  //     });
  //   } catch (erro) {
  //     await conexao.query('ROLLBACK');
  //     console.error('Erro ao criar pedido:', erro);
  //     return res.status(400).json({ erro: erro.message || 'Erro ao criar pedido.' });
  //   } finally {
  //     conexao.release();
  //   }
  // },
// Cria um pedido a partir dos itens do carrinho + dados de contato/entrega
// Body esperado: {
//   itens: [{ produtoId, quantidade }],
//   nomeCompleto, email, cpfCnpj, telefone, dataNascimento,
//   cep, pais, estado, cidade, bairro, rua, numero, complemento, pontoReferencia,
//   nomeDestinatario, telefoneEntrega
// }
// O preço nunca vem do front — é sempre buscado na tabela produtos
async criarPedido(req, res) {
  const {
    itens,
    nomeCompleto, email, cpfCnpj, telefone, dataNascimento,
    cep, pais, estado, cidade, bairro, rua, numero,
    complemento, pontoReferencia, nomeDestinatario, telefoneEntrega
  } = req.body;

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'Nenhum item foi selecionado.' });
  }

  const camposObrigatorios = {
    nomeCompleto, email, cpfCnpj, telefone,
    cep, pais, estado, cidade, bairro, rua, numero,
    nomeDestinatario, telefoneEntrega
  };
  for (const [campo, valor] of Object.entries(camposObrigatorios)) {
    if (!valor || String(valor).trim() === '') {
      return res.status(400).json({ erro: `O campo "${campo}" é obrigatório.` });
    }
  }

  const conexao = await pool.connect();

  try {
    await conexao.query('BEGIN');

    const produtoIds = itens.map((item) => item.produtoId);
    const resultadoProdutos = await conexao.query(
      `SELECT id, nome, preco, estoque FROM produtos WHERE id = ANY($1::int[]) AND ativo = TRUE`,
      [produtoIds]
    );

    const produtosEncontrados = resultadoProdutos.rows;

    if (produtosEncontrados.length !== produtoIds.length) {
      await conexao.query('ROLLBACK');
      return res.status(400).json({ erro: 'Um ou mais produtos não existem ou estão indisponíveis.' });
    }

    let valorTotal = 0;
    const itensParaInserir = itens.map((item) => {
      const produto = produtosEncontrados.find((p) => p.id === item.produtoId);

      if (item.quantidade > produto.estoque) {
        throw new Error(`Estoque insuficiente para "${produto.nome}".`);
      }

      const subtotal = Number(produto.preco) * Number(item.quantidade);
      valorTotal += subtotal;

      return {
        produtoId: produto.id,
        titulo: produto.nome,
        quantidade: item.quantidade,
        preco: produto.preco,
      };
    });

    const resultadoPedido = await conexao.query(
      `INSERT INTO pedidos (
         valor_total, status_pagamento,
         nome_completo, email, cpf_cnpj, telefone, data_nascimento,
         cep, pais, estado, cidade, bairro, rua, numero,
         complemento, ponto_referencia, nome_destinatario, telefone_entrega,
         criado_em
       ) VALUES (
         $1, 'pendente',
         $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17,
         NOW()
       ) RETURNING id, criado_em`,
      [
        valorTotal,
        nomeCompleto, email, cpfCnpj, telefone, dataNascimento || null,
        cep, pais, estado.toUpperCase(), cidade, bairro, rua, numero,
        complemento || null, pontoReferencia || null, nomeDestinatario, telefoneEntrega
      ]
    );
    const pedidoId = resultadoPedido.rows[0].id;
    const criadoEm = resultadoPedido.rows[0].criado_em;

    for (const item of itensParaInserir) {
      await conexao.query(
        `INSERT INTO pedido_itens (pedido_id, produto_id, titulo, quantidade, preco)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, item.produtoId, item.titulo, item.quantidade, item.preco]
      );

      await conexao.query(
        `UPDATE produtos SET estoque = estoque - $1 WHERE id = $2`,
        [item.quantidade, item.produtoId]
      );
    }

    await conexao.query('COMMIT');

    return res.status(201).json({
      pedidoId,
      valorTotal,
      criadoEm,
      itens: itensParaInserir,
    });
  } catch (erro) {
    await conexao.query('ROLLBACK');
    console.error('Erro ao criar pedido:', erro);
    return res.status(400).json({ erro: erro.message || 'Erro ao criar pedido.' });
  } finally {
    conexao.release();
  }
},



  // Cria uma preferência de pagamento e devolve o link de checkout (init_point)
  // O front manda só o pedidoId — os itens e preços vêm do banco (pedido_itens),
  // nunca do corpo da requisição, pra evitar que o preço seja alterado no cliente.
  async criarPreferencia(req, res) {
    const { pedidoId } = req.body;

    if (!pedidoId) {
      return res.status(400).json({ erro: 'pedidoId não informado.' });
    }

    try {
      const resultadoItens = await pool.query(
        `SELECT titulo, quantidade, preco FROM pedido_itens WHERE pedido_id = $1`,
        [pedidoId]
      );

      if (resultadoItens.rows.length === 0) {
        return res.status(404).json({ erro: 'Pedido não encontrado ou sem itens.' });
      }

      const items = resultadoItens.rows.map((item) => ({
        title: item.titulo,
        quantity: Number(item.quantidade),
        unit_price: Number(item.preco),
        currency_id: 'BRL',
      }));

      const preference = await preferenceClient.create({
        body: {
          items,
          external_reference: String(pedidoId),
          back_urls: {
            success: `${process.env.APP_URL}/pagamento/sucesso`,
            failure: `${process.env.APP_URL}/pagamento/falha`,
            pending: `${process.env.APP_URL}/pagamento/pendente`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.APP_URL}/api/mercadopago/webhook`,
        },
      });

      await pool.query(
        `UPDATE pedidos SET preference_id = $1, status_pagamento = $2 WHERE id = $3`,
        [preference.id, 'pendente', pedidoId]
      );

      return res.status(201).json({
        preferenceId: preference.id,
        initPoint: preference.init_point,
      });
    } catch (erro) {
      console.error('Erro ao criar preferência do Mercado Pago:', erro);
      return res.status(500).json({ erro: 'Erro ao criar preferência de pagamento.' });
    }
  },

  // Recebe as notificações (webhook) do Mercado Pago
  async receberWebhook(req, res) {
    try {
      const { type, data } = req.body;

      if (type === 'payment') {
        const pagamento = await paymentClient.get({ id: data.id });

        const status = pagamento.status; // approved, pending, rejected, etc.
        const pedidoId = pagamento.external_reference;

        await pool.query(
          `UPDATE pedidos SET status_pagamento = $1, payment_id = $2, atualizado_em = NOW() WHERE id = $3`,
          [status, pagamento.id, pedidoId]
        );

        await pool.query(
          `INSERT INTO pagamentos (pedido_id, payment_id, status, valor, metodo, criado_em)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (payment_id) DO UPDATE SET status = EXCLUDED.status`,
          [pedidoId, pagamento.id, status, pagamento.transaction_amount, pagamento.payment_method_id]
        );
      }

      // Mercado Pago espera um 200 rápido para não reenviar a notificação
      return res.sendStatus(200);
    } catch (erro) {
      console.error('Erro ao processar webhook do Mercado Pago:', erro);
      return res.sendStatus(500);
    }
  },











  // Consulta manual do status de um pagamento pelo ID
  async consultarPagamento(req, res) {
    const { id } = req.params;

    try {
      const pagamento = await paymentClient.get({ id });
      return res.status(200).json({
        id: pagamento.id,
        status: pagamento.status,
        statusDetail: pagamento.status_detail,
        valor: pagamento.transaction_amount,
        metodo: pagamento.payment_method_id,
      });
    } catch (erro) {
      console.error('Erro ao consultar pagamento:', erro);
      return res.status(500).json({ erro: 'Erro ao consultar pagamento.' });
    }
  },

  // Consulta o status de pagamento salvo localmente para um pedido
  async statusPorPedido(req, res) {
    const { pedidoId } = req.params;

    try {
      const resultado = await pool.query(
        `SELECT status_pagamento, payment_id FROM pedidos WHERE id = $1`,
        [pedidoId]
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({ erro: 'Pedido não encontrado.' });
      }

      return res.status(200).json(resultado.rows[0]);
    } catch (erro) {
      console.error('Erro ao buscar status do pedido:', erro);
      return res.status(500).json({ erro: 'Erro ao buscar status do pedido.' });
    }
  },


 // ADMIN CONTROLLER
async listarPedidos(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT id, valor_total, status_pagamento, payment_id, preference_id
       FROM pedidos
       ORDER BY id DESC`
    );
    return res.status(200).json(resultado.rows);
  } catch (erro) {
    console.error('Erro ao listar pedidos:', erro);
    return res.status(500).json({ erro: 'Erro ao listar pedidos.' });
  }
},



};

// Listar status de todos os pedidos

// Lista todos os pedidos com o status de pagamento (usado no admin)



module.exports = mercadopagoController;