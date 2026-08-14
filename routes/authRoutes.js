const express = require('express');
const bcrypt = require('bcrypt');
const { finduserbyname, findUserByEmail, createUser } = require('../models/userModel');



const {
  registerValidationRules,
  loginValidationRules,
  handleValidationErrors
} = require('../middleware/validators');

const authtrue  = require('../middleware/authtrue')

const router = express.Router();
const SALT_ROUNDS = 10;


// POST /auth/register
router.post('/register', registerValidationRules,
  handleValidationErrors, authtrue, async (req, res) => {
  try {
    const { name, email, password } = req.body;

  

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Este email já está cadastrado.' });
    }


    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ name, email, passwordHash });

    // Já loga o usuário automaticamente após o registro
    req.session.userId = user.id;

    return res.status(201).json({
      message: 'Usuário registrado com sucesso.',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    return res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
});

// POST /auth/login
router.post('/login', loginValidationRules,
  handleValidationErrors, authtrue, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    // Regenera a sessão para evitar session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Erro ao regenerar sessão:', err);
        return res.status(500).json({ error: 'Erro interno ao fazer login.' });
      }

      req.session.userId = user.id;

      return res.status(200).json({
        message: 'Login realizado com sucesso.',
        user: { id: user.id, name: user.name, email: user.email }
      });
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao encerrar sessão:', err);
      return res.status(500).json({ error: 'Erro ao encerrar sessão.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logout realizado com sucesso.' });
  });
});




module.exports = router;