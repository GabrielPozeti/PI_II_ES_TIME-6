import emailjs from "@emailjs/nodejs";

emailjs.init({
    publicKey: "l-6Jdvr7JW6YUc2wS",
    privateKey: "pGhq6V_3I57mK93b6QxEV"
})

export async function sendEmail(userEmail: string, userNome: string, recoveryLink: string) {
    var template = {
        nome_user: userNome,
        user_email: userEmail,
        recovery_link: recoveryLink
    }
    try {
        const response = await emailjs.send("service_j27htef","template_6f8wp0i", template);
        console.log("Email enviado com sucesso:", response.status, response.text);
    } catch (error) {
        console.log("Erro ao enviar email:", error);
    }
}