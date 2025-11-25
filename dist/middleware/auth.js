//Feito por Gabriel Henrique Pozeti de Faria

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
function verifyToken(req, res, next) {
    const session = req.session;
    console.log("session: ", session);
    if (!session || !session.userId) {
        return res.status(401).json({ message: "Não autenticado" });
    }
    req.userId = session.userId;
    return next();
}
