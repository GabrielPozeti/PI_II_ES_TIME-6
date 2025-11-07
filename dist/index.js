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
const instituicoes_1 = __importDefault(require("./routes/instituicoes"));
const disciplinas_1 = __importDefault(require("./routes/disciplinas"));
const turmas_1 = __importDefault(require("./routes/turmas"));
const componentes_1 = __importDefault(require("./routes/componentes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/', express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.use('/auth', auth_1.default);
app.use('/instituicoes', instituicoes_1.default);
app.use('/disciplinas', disciplinas_1.default);
app.use('/turmas', turmas_1.default);
app.use('/componentes', componentes_1.default);
app.get('/protected', auth_2.verifyToken, (req, res) => {
    res.json({ message: 'Acesso autorizado ao recurso protegido' });
});
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
