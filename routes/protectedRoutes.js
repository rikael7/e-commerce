const express = require('express');
// IMPORTAR MIDDLEWARES (ESSA ROTA JÁ ESTÁ PROTEGIDA NO SERVER.JS A ROTA "API/", MAS DEIXEI AQUI POR MOTIVOS DE DEBUG =D )
const { isAuthenticated, admin } = require('../middleware/authMiddleware');

// IMPORTAR CONTROLLERS
const { findUserById } = require('../models/userModel'); // Controller
const authController = require('../models/userModel'); // controler do admin
const path = require('path'); // biblioteca para manipulação de caminhos de arquivos
const router = express.Router();


//        IMPORTAR  PARA SUPORTAR TRANSPORTE DE ARQUIVOS
const multer = require('multer');
const pool = require('../config/dbpg'); // ajuste para o caminho real do seu módulo de conexão
const crypto = require('crypto');
const fs = require('fs'); // biblioteca para transições de arquivos 



//  CONFIG PARA USER FAZER UPLOAD DE AVATAR
const AVATAR_DIR = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
const AVATAR_PUBLIC_PATH = '/uploads/avatars';
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.session.userId}-${uniqueSuffix}${ext}`);
  }
});
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
 
  if (!mimeOk || !extOk) {
    return cb(new Error('Formato de arquivo não suportado. Envie JPG, PNG ou WEBP.'));
  }
  cb(null, true);
}
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});
// ////////////


// ===================
//   ROUTES NORMAL USER
// =================

router.get('/me', isAuthenticated ,authController.obterPerfil);



// ===================
//  POST ROUTES ADMIN
// =================


// ///////////////////////////////////////////////






module.exports = router;
