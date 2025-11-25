//Feito por Gabriel Henrique Pozeti de Faria

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const email_1 = require("../utils/email");
const router = express_1.default.Router();
router.post("/register", async (req, res) => {
    const { nome, email, telefone, senha } = req.body;
    if (!nome || !email || !senha)
        return res.status(400).json({ message: "Campos incompletos" });
    const existing = await (0, db_1.findByEmail)(email);
    if (existing)
        return res.status(409).json({ message: "E-mail já cadastrado" });
    const senha_hash = bcryptjs_1.default.hashSync(senha, 10);
    const user = await (0, db_1.createDocente)({
        nome,
        email,
        telefone: telefone || null,
        senha_hash,
    });
    return res.status(201).json({
        message: "Registrado",
        user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            telefone: user.telefone,
        },
    });
});
router.post("/login", async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha)
        return res.status(400).json({ message: "Campos incompletos" });
    const row = await (0, db_1.findByEmail)(email);
    if (!row)
        return res.status(401).json({ message: "Credenciais inválidas" });
    const match = bcryptjs_1.default.compareSync(senha, row.senha_hash);
    if (!match)
        return res.status(401).json({ message: "Credenciais inválidas" });
    return res.json({
        message: "Logado",
        user: {
            id: row.id,
            nome: row.nome,
            email: row.email,
            telefone: row.telefone,
            curso: row.curso,
            id_instituicao: row.id_instituicao,
        },
    });
});
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ message: "Email é obrigatório" });
    const row = await (0, db_1.findByEmail)(email);
    if (!row) {
        return res.json({
            message: "Se o e-mail existir, você receberá instruções",
        });
    }
    const token = crypto_1.default.randomBytes(24).toString("hex");
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
    const dataDir = path_1.default.resolve(__dirname, "..", "..", "data");
    const tokensFile = path_1.default.join(dataDir, "reset_tokens.json");
    let tokens = {};
    if (fs_1.default.existsSync(tokensFile)) {
        try {
            tokens = JSON.parse(fs_1.default.readFileSync(tokensFile, "utf-8") || "{}");
        }
        catch (e) {
            tokens = {};
        }
    }
    tokens[token] = { userId: row.id, expires };
    fs_1.default.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
    const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;
    const out = `To: ${email}\nSubject: Recuperação de senha\nLink: ${resetLink}\n\n`;
    if (!fs_1.default.existsSync(dataDir))
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    fs_1.default.appendFileSync(path_1.default.join(dataDir, "mock_emails.txt"), out);
    console.log("Mock email sent:\n", out);
    await (0, email_1.sendEmail)(email, row.nome, resetLink);
    return res.json({ message: "Se o e-mail existir, você receberá instruções" });
});
router.post("/reset-password", async (req, res) => {
    const { token, senha } = req.body;
    if (!token || !senha)
        return res
            .status(400)
            .json({ message: "Token e nova senha são obrigatórios" });
    try {
        const dataDir = path_1.default.resolve(__dirname, "..", "..", "data");
        const tokensFile = path_1.default.join(dataDir, "reset_tokens.json");
        if (!fs_1.default.existsSync(tokensFile))
            return res.status(400).json({ message: "Token inválido ou expirado" });
        let tokens = {};
        try {
            tokens = JSON.parse(fs_1.default.readFileSync(tokensFile, "utf-8") || "{}");
        }
        catch (e) {
            tokens = {};
        }
        const record = tokens[token];
        if (!record || record.expires < Date.now())
            return res.status(400).json({ message: "Token inválido ou expirado" });
        const userId = record.userId;
        const user = await (0, db_1.findById)(userId);
        if (!user)
            return res.status(400).json({ message: "Usuário inválido" });
        const senha_hash = bcryptjs_1.default.hashSync(senha, 10);
        await (0, db_1.updateDocente)(userId, { senha_hash });
        // remove token
        delete tokens[token];
        fs_1.default.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
        return res.json({ message: "Senha atualizada" });
    }
    catch (err) {
        return res.status(400).json({ message: "Erro ao processar solicitação" });
    }
});
router.post("/logout", (req, res) => {
    var _a;
    const s = req.session;
    console.log("s:", s);
    if (s) {
        (_a = s.destroy) === null || _a === void 0 ? void 0 : _a.call(s, (e) => {
            console.log(e);
        });
    }
    return res.json({ message: "Desconectado" });
});
router.post("/me", async (req, res) => {
    console.log("body:", req.body);
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
    const user = await (0, db_1.findById)(userId);
    if (!user)
        return res.status(404).json({ message: "Usuário não encontrado" });
    return res.json({
        user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            telefone: user.telefone,
            curso: user.curso,
            id_instituicao: user.id_instituicao,
        },
    });
});
router.put("/info-adicional", async (req, res) => {
    console.log("body:", req.body);
    const { instituicao, curso, id } = req.body;
    if (instituicao === undefined || curso === undefined || id === undefined)
        return res.status(400).json({ message: "Campos incompletos" });
    try {
        let instituicaoId = null;
        const instituicaoDB = await (0, db_1.findInstituicaoByNome)(instituicao);
        if (!instituicaoDB) {
            //sigla = as 3 primeiras letras do nome em maiusculo
            const sigla = instituicao.slice(0, 3).toUpperCase();
            const createInstituicaoDB = await (0, db_1.createInstituicao)({
                nome: instituicao,
                sigla,
            });
            instituicaoId = createInstituicaoDB.id;
        }
        const updatedUser = await (0, db_1.updateDocente)(id, {
            id_instituicao: instituicaoId,
            curso,
        });
        if (!updatedUser)
            return res.status(404).json({ message: "Usuário não encontrado" });
        return res.json({
            message: "Informações adicionais atualizadas",
            user: {
                id: updatedUser.id,
                nome: updatedUser.nome,
                email: updatedUser.email,
                telefone: updatedUser.telefone,
                curso: updatedUser.curso,
                id_instituicao: updatedUser.id_instituicao,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erro ao atualizar informações" });
    }
});
exports.default = router;
