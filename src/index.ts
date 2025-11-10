import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import authRoutes from './routes/auth';
import { verifyToken } from './middleware/auth';
import instituicoesRoutes from './routes/instituicoes';
import disciplinasRoutes from './routes/disciplinas';
import turmasRoutes from './routes/turmas';
import componentesRoutes from './routes/componentes';
import notasRoutes from './routes/notas';
import auditoriaRoutes from './routes/auditoria';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/', express.static(path.join(__dirname, '..', 'public')));

app.use('/auth', authRoutes);

app.use('/instituicoes', verifyToken, instituicoesRoutes);
app.use('/disciplinas', verifyToken, disciplinasRoutes);
app.use('/turmas', verifyToken, turmasRoutes);
app.use('/componentes', verifyToken, componentesRoutes);
app.use('/notas', verifyToken, notasRoutes);
app.use('/auditoria', verifyToken, auditoriaRoutes);

app.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Acesso autorizado ao recurso protegido' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
