// middleware/validators.js
const { body, validationResult } = require('express-validator');
const dns = require('dns').promises;

//biblioteca para bloquear email temporário
const { isDisposableEmail } = require('disposable-email-domains-js');




async function domainExists(email) {
    const domain = email.split('@')[1];

   console.log('Domínio:', domain);


    try {
        const mx = await dns.resolveMx(domain);
        console.log('MX:', mx);
        if (mx.length > 0) {
            return true;
        }
        
    } catch (err) 
  { console.error('Erro MX:', err); }
  

    try {
        await dns.resolve4(domain);
        return true;
    } catch (err) { console.error('Erro A:', err); }

    return false;
}


// e interrompe a requisição com 400 se houver erro.
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array({ onlyFirstError: true })[0].msg,
      details: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}


const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('O nome é obrigatório.')
    .isLength({ min: 5, max: 50 }).withMessage('O nome deve ter entre 5 e 50 caracteres.')
    // Whitelist: só letras (com acentos), espaços, apóstrofo e hífen.
    // Bloqueia por padrão qualquer tentativa de injetar <script>, tags, etc.
    .matches(/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u).withMessage('O nome deve conter apenas letras.'),

  body('email')
    .trim()
    .notEmpty().withMessage('O email é obrigatório.')
    .isEmail().withMessage('Email inválido.')
    .isLength({ min: 5, max: 254 }).withMessage('Email deve conter entre 5 e 254 caracteres.')
      .custom((email) => {
            const allowedDomains = [
             // Google
    'gmail.com',
    'googlemail.com',

    // Microsoft
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',

    // Yahoo
    'yahoo.com',
    'yahoo.com.br',
    'yahoo.co.uk',
    'yahoo.fr',
    'yahoo.de',
    'yahoo.es',
    'yahoo.it',
    'yahoo.ca',
    'yahoo.com.au',
    'yahoo.co.in',

    // Apple
    'icloud.com',
    'me.com',
    'mac.com',

    // Proton
    'proton.me',
    'protonmail.com',
    'pm.me',

    // Zoho
    'zoho.com',
    'zohomail.com',

    // AOL
    'aol.com',

    // GMX
    'gmx.com',
    'gmx.net',
    'gmx.de',

    // Mail.com
    'mail.com',

    // Yandex
    'yandex.com',
    'yandex.ru',

    // Fastmail
    'fastmail.com',

    // Tuta
    'tuta.com',
    'tutanota.com',

    // Brasil
    'bol.com.br',
    'uol.com.br',
    'terra.com.br',
    'ig.com.br',
    'globo.com',
    'globomail.com'
        ];

        const domain = email.split('@')[1]?.toLowerCase();

        if (!allowedDomains.includes(domain)) {
            throw new Error('Este domínio de email não permitido.');
        }

        return true;
    })

    .normalizeEmail(), // remove variações (Maiusculas, pontos no gmail, etc.)
    
  body('password')
    .isString().withMessage('Senha inválida.')
    // Limite máximo é importante: bcrypt trunca em 72 bytes e strings
    // gigantes forçadas no hash podem virar um vetor de DoS.
    .isLength({ min: 8, max: 15 }).withMessage('A senha deve ter entre 8 e 15 caracteres.')
    .matches(/[a-z]/).withMessage('A senha deve conter ao menos uma letra minúscula.')
    .matches(/[A-Z]/).withMessage('A senha deve conter ao menos uma letra maiúscula.')
    .matches(/[0-9]/).withMessage('A senha deve conter ao menos um número.')
];

const loginValidationRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email é obrigatório.')
    .isEmail().withMessage('Email inválido.')
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Senha inválida.')
    .notEmpty().withMessage('Senha é obrigatória.')
    .isLength({ max: 15 }).withMessage('Senha inválida.')
];

module.exports = { registerValidationRules, loginValidationRules, handleValidationErrors };