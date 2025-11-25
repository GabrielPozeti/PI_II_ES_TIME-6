/*
  Arquivo: src/utils/email.ts
  Finalidade: Envio de emails via EmailJS no backend.
*/
import emailjs from "@emailjs/nodejs";

export async function sendEmail(
  userEmail: string,
  userNome: string,
  recoveryLink: string
) {
  const templateParams = {
    nome_user: userNome,
    user_email: userEmail,
    recovery_link: recoveryLink,
  };

  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE || "service_j27htef",
      process.env.EMAILJS_TEMPLATE || "template_6f8wp0i",
      templateParams,
      {
        publicKey: process.env.EMAILJS_PUBLIC || "l-6Jdvr7JW6YUc2wS",
        privateKey: process.env.EMAILJS_PRIVATE || "pGhq6V_3I57mK93b6QxEV",
      }
    );

    console.log("Email enviado com sucesso:", response.status, response.text);
  } catch (error) {
    console.error("Erro ao enviar email:", error);
  }
}

export async function sendExclusaoTurmaEmail(
  userEmail: string,
  link: string,
  disciplina: string,
  codigo: string,
  periodo: string
) {
  const templateParams = {
    email: userEmail,
    LINK_CONFIRMACAO: link,
    DISCIPLINA: disciplina,
    CODIGO: codigo,
    PERIODO: periodo,
  };
  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE || "service_j27htef",
      process.env.EMAILJS_TEMPLATE_EXCLUSAO_TURMA || "template_s8wtffw",
      templateParams,
      {
        publicKey: process.env.EMAILJS_PUBLIC || "l-6Jdvr7JW6YUc2wS",
        privateKey: process.env.EMAILJS_PRIVATE || "pGhq6V_3I57mK93b6QxEV",
      }
    );
    console.log(
      "Email de exclusão de turma enviado com sucesso:",
      response.status,
      response.text
    );
  } catch (error) {
    console.error("Erro ao enviar email de exclusão de turma:", error);
  }
}
