/*
  Arquivo: src/utils/email.ts
  Finalidade: Utilitário para envio de emails (recuperação de senha, notificações).
  Observações: Usa `@emailjs/nodejs`. As chaves e IDs de serviço estão configuradas diretamente aqui —
  recomenda-se mover para variáveis de ambiente em produção.
*/
import emailjs from "@emailjs/nodejs";

emailjs.init({
    publicKey: process.env.EMAILJS_PUBLIC || "l-6Jdvr7JW6YUc2wS",
    privateKey: process.env.EMAILJS_PRIVATE || "pGhq6V_3I57mK93b6QxEV"
})

export async function sendEmail(userEmail: string, userNome: string, recoveryLink: string) {
    var template = {
        nome_user: userNome,
        user_email: userEmail,
        recovery_link: recoveryLink
    }
    try {
        const response = await emailjs.send(process.env.EMAILJS_SERVICE || "service_j27htef", process.env.EMAILJS_TEMPLATE || "template_6f8wp0i", template);
        console.log("Email enviado com sucesso:", response.status, response.text);
    } catch (error) {
        console.log("Erro ao enviar email:", error);
    }
}