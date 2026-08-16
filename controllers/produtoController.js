const pool = require('../config/dbpg');

const produtoController = {

  // Lista os produtos.
  // Por padrão devolve só os ativos (usado pelo front de checkout).
  // Com ?todos=1 devolve também os inativos (usado pelo admin).
  async listarProdutos(req, res) {
    const mostrarTodos = req.query.todos === '1';

    try {
      const resultado = await pool.query(
        mostrarTodos
          ? `SELECT id, nome, descricao, preco, estoque, ativo FROM produtos ORDER BY nome`
          : `SELECT id, nome, descricao, preco, estoque, ativo FROM produtos WHERE ativo = TRUE ORDER BY nome`
      );
      return res.status(200).json(resultado.rows);
    } catch (erro) {
      console.error('Erro ao listar produtos:', erro);
      return res.status(500).json({ erro: 'Erro ao listar produtos.' });
    }
  },

  // Busca um único produto pelo id (inclui inativos)
  async obterProduto(req, res) {
    const { id } = req.params;

    try {
      const resultado = await pool.query(
        `SELECT id, nome, descricao, preco, estoque, ativo FROM produtos WHERE id = $1`,
        [id]
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }

      return res.status(200).json(resultado.rows[0]);
    } catch (erro) {
      console.error('Erro ao buscar produto:', erro);
      return res.status(500).json({ erro: 'Erro ao buscar produto.' });
    }
  },

  // Cria um novo produto
  // Body esperado: { nome, descricao, preco, estoque }
  async criarProduto(req, res) {
    const { nome, descricao, preco, estoque } = req.body;

    if (!nome || preco === undefined || estoque === undefined) {
      return res.status(400).json({ erro: 'Informe ao menos nome, preco e estoque.' });
    }

    if (Number(preco) < 0 || Number(estoque) < 0) {
      return res.status(400).json({ erro: 'Preço e estoque não podem ser negativos.' });
    }

    try {
      const resultado = await pool.query(
        `INSERT INTO produtos (nome, descricao, preco, estoque, ativo)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, nome, descricao, preco, estoque, ativo`,
        [nome, descricao || null, preco, estoque]
      );

      return res.status(201).json(resultado.rows[0]);
    } catch (erro) {
      console.error('Erro ao criar produto:', erro);
      return res.status(500).json({ erro: 'Erro ao criar produto.' });
    }
  },

  // Atualiza um produto existente
  // Body esperado: { nome, descricao, preco, estoque, ativo } — todos opcionais
  async atualizarProduto(req, res) {
    const { id } = req.params;
    const { nome, descricao, preco, estoque, ativo } = req.body;

    if (preco !== undefined && Number(preco) < 0) {
      return res.status(400).json({ erro: 'Preço não pode ser negativo.' });
    }
    if (estoque !== undefined && Number(estoque) < 0) {
      return res.status(400).json({ erro: 'Estoque não pode ser negativo.' });
    }

    try {
      const existente = await pool.query(`SELECT id FROM produtos WHERE id = $1`, [id]);
      if (existente.rows.length === 0) {
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }

      const resultado = await pool.query(
        `UPDATE produtos SET
           nome = COALESCE($1, nome),
           descricao = COALESCE($2, descricao),
           preco = COALESCE($3, preco),
           estoque = COALESCE($4, estoque),
           ativo = COALESCE($5, ativo)
         WHERE id = $6
         RETURNING id, nome, descricao, preco, estoque, ativo`,
        [nome, descricao, preco, estoque, ativo, id]
      );

      return res.status(200).json(resultado.rows[0]);
    } catch (erro) {
      console.error('Erro ao atualizar produto:', erro);
      return res.status(500).json({ erro: 'Erro ao atualizar produto.' });
    }
  },

  // Exclusão lógica do produto (mantém histórico de pedidos íntegro)
  async deletarProduto(req, res) {
    const { id } = req.params;

    try {
      const resultado = await pool.query(
        `UPDATE produtos SET ativo = FALSE WHERE id = $1 RETURNING id`,
        [id]
      );

      if (resultado.rows.length === 0) {
        return res.status(404).json({ erro: 'Produto não encontrado.' });
      }

      return res.status(200).json({ mensagem: 'Produto removido com sucesso.' });
    } catch (erro) {
      console.error('Erro ao remover produto:', erro);
      return res.status(500).json({ erro: 'Erro ao remover produto.' });
    }
  },
};

module.exports = produtoController;