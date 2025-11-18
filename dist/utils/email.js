"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodejs_1 = __importDefault(require("@emailjs/nodejs"));
nodejs_1.default.init({
    publicKey: "l-6Jdvr7JW6YUc2wS",
    privateKey: "pGhq6V_3I57mK93b6QxEV"
});
async function sendEmail(userEmail, userNome, recoveryLink) {
    var template = {
        nome_user: userNome,
        user_email: userEmail,
        recovery_link: recoveryLink
    };
    try {
        const response = await nodejs_1.default.send("service_j27htef", "template_6f8wp0i", template);
        console.log("Email enviado com sucesso:", response.status, response.text);
    }
    catch (error) {
        console.log("Erro ao enviar email:", error);
    }
}
