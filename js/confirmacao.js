// js/confirmacao.js — versão adaptada para API REST
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzavXeNlDzPh_hGnoWM7AKv5ecp4WHJdHd-ILwWQ2j-O59GNHLoBwYMrkZyRQrNSmSK/exec"; // Substituir pela URL do WebApp

// Helper para chamadas REST
async function postPath(path, body = {}) {
  const url = `${WEBAPP_URL}?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

const aposta = JSON.parse(localStorage.getItem("pendingAposta"));
const dadosDiv = document.getElementById("dadosConfirmacao");
const jogosDiv = document.getElementById("jogosConfirmacao");
const mensagem = document.getElementById("mensagem");
const termosCheckbox = document.getElementById("aceitoTermos");
const btnConfirmar = document.getElementById("btnConfirmar");

if (!aposta) {
  dadosDiv.innerHTML = "<p style='color:red'>Nenhuma aposta pendente encontrada. Retorne à página principal.</p>";
  btnConfirmar.disabled = true;
} else {
  dadosDiv.innerHTML = `
    <p><b>Nome Completo:</b> ${aposta.nome}</p>
    <p><b>Telefone (WhatsApp):</b> ${aposta.telefone}</p>
  `;
  jogosDiv.innerHTML = `
    <h3>Jogos Selecionados</h3>
    ${aposta.jogos.map((jogo, i) => `<p><b>Jogo ${i + 1}:</b> ${jogo}</p>`).join("")}
  `;
}

// ativar botão
termosCheckbox.addEventListener("change", () => {
  btnConfirmar.disabled = !termosCheckbox.checked;
});

// voltar
document.getElementById("btnVoltar").addEventListener("click", () => {
  window.location.href = "index.html";
});

// CONFIRMAR aposta
btnConfirmar.addEventListener("click", async () => {
  if (!termosCheckbox.checked) {
    mensagem.textContent = "Você deve aceitar os termos antes de confirmar.";
    mensagem.style.color = "red";
    return;
  }

  if (!aposta || !aposta.protocolo) {
    mensagem.textContent = "Erro: protocolo não encontrado.";
    mensagem.style.color = "red";
    return;
  }

  mensagem.textContent = "Confirmando aposta...";
  mensagem.style.color = "blue";
  btnConfirmar.disabled = true;

  try {
    // chamada à rota confirmacao/confirmar
    const r = await postPath("confirmacao/confirmar", {
      protocolo: aposta.protocolo
    });

    if (!r || !r.success) {
      throw new Error(r.error || "Falha inesperada ao confirmar aposta.");
    }

    // salvar aposta final
    const apostaFinal = {
      ...aposta,
      status: "AGUARDANDO PAGAMENTO",
      dataHora: new Date().toLocaleString("pt-BR")
    };

    localStorage.setItem("lastAposta", JSON.stringify(apostaFinal));
    localStorage.removeItem("pendingAposta");

    // redirecionar com o protocolo
    window.location.href = `comprovante.html?protocolo=${encodeURIComponent(aposta.protocolo)}`;

  } catch (err) {
    mensagem.textContent = "Erro ao confirmar aposta: " + err.message;
    mensagem.style.color = "red";
    btnConfirmar.disabled = false;
  }
});
