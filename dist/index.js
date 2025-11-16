"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const auth_2 = require("./middleware/auth");
const express_session_1 = __importDefault(require("express-session"));
const instituicoes_1 = __importDefault(require("./routes/instituicoes"));
const disciplinas_1 = __importDefault(require("./routes/disciplinas"));
const turmas_1 = __importDefault(require("./routes/turmas"));
const componentes_1 = __importDefault(require("./routes/componentes"));
const notas_1 = __importDefault(require("./routes/notas"));
const auditoria_1 = __importDefault(require("./routes/auditoria"));
const alunos_1 = __importDefault(require("./routes/alunos"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
app.use((0, express_session_1.default)({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
// Redireciona a raiz para a página de login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});
app.use('/', express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.use('/auth', auth_1.default);
app.use('/instituicoes', auth_2.verifyToken, instituicoes_1.default);
app.use('/disciplinas', auth_2.verifyToken, disciplinas_1.default);
app.use('/turmas', auth_2.verifyToken, turmas_1.default);
app.use('/componentes', auth_2.verifyToken, componentes_1.default);
app.use('/notas', auth_2.verifyToken, notas_1.default);
app.use('/auditoria', auth_2.verifyToken, auditoria_1.default);
app.use('/alunos', auth_2.verifyToken, alunos_1.default);
app.get('/protected', auth_2.verifyToken, (req, res) => {
    res.json({ message: 'Acesso autorizado ao recurso protegido' });
});
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
