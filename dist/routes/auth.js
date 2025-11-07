"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
router.post('/register', async (req, res) => {
    const { nome, email, telefone, senha } = req.body;
    if (!nome || !email || !senha)
        return res.status(400).json({ message: 'Campos incompletos' });
    const existing = await (0, db_1.findByEmail)(email);
    if (existing)
        return res.status(409).json({ message: 'E-mail já cadastrado' });
    const senha_hash = bcryptjs_1.default.hashSync(senha, 10);
    const user = await (0, db_1.createDocente)({ nome, email, telefone: telefone || null, senha_hash });
    return res.status(201).json({ message: 'Registrado', user: { id: user.id, nome: user.nome, email: user.email, telefone: user.telefone } });
});
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha)
        return res.status(400).json({ message: 'Campos incompletos' });
    const row = await (0, db_1.findByEmail)(email);
    if (!row)
        return res.status(401).json({ message: 'Credenciais inválidas' });
    const match = bcryptjs_1.default.compareSync(senha, row.senha_hash);
    if (!match)
        return res.status(401).json({ message: 'Credenciais inválidas' });
    const token = jsonwebtoken_1.default.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token, user: { id: row.id, nome: row.nome, email: row.email, telefone: row.telefone } });
});
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ message: 'Email é obrigatório' });
    const row = await (0, db_1.findByEmail)(email);
    if (!row) {
        return res.json({ message: 'Se o e-mail existir, você receberá instruções' });
    }
    const token = jsonwebtoken_1.default.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;
    const out = `To: ${email}\nSubject: Recuperação de senha\nLink: ${resetLink}\n\n`;
    const dataDir = path_1.default.resolve(__dirname, '..', 'data');
    if (!fs_1.default.existsSync(dataDir))
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    fs_1.default.appendFileSync(path_1.default.join(dataDir, 'mock_emails.txt'), out);
    console.log('Mock email sent:\n', out);
    return res.json({ message: 'Se o e-mail existir, você receberá instruções' });
});
exports.default = router;
