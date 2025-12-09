// =========================
// index.js
// =========================

// URL do Apps Script (MODELO A)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzavXeNlDzPh_hGnoWM7AKv5ecp4WHJdHd-ILwWQ2j-O59GNHLoBwYMrkZyRQrNSmSK/exec";

// Elementos
const btnGerar = document.getElementById("btnGerar");
const jogosContainer = document.getElementById("jogosContainer");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputQtdJogos = document.getElementById("qtdJogos");
const btnConfirmar = document.getElementById("confirmarAposta");
const secaoConfirmar = document.getElementById("secaoConfirmar");
let jogosGerados = [];

// Gera jogos aleatórios
function gerarJogos(qtd) {
  const jogos = [];

  for (let i = 0; i < qtd; i++) {
    let nums = [];
    while (nums.length < 6) {
      let n = String(Math.floor(Math.random() * 60) + 1).padStart(2, "0");
      if (!nums.includes(n)) nums.push(n);
    }
    nums.sort((a, b) => parseInt(a) - parseInt(b));
    jogos.push(nums.join(" "));
  }
  return jogos;
}

// Renderiza os jogos na tela
function renderizarJogos() {
  jogosContainer.innerHTML = jogosGerados
    .map(
      (j, i) => `
      <div class="jogo-item">
        <strong>Jogo ${i + 1}:</strong> ${j}
      </div>`
    )
    .join("");

  secaoConfirmar.style.display = jogosGerados.length > 0 ? "block" : "none";
}

// Clique em "Gerar Jogos"
btnGerar?.addEventListener("click", () => {
  const qtd = parseInt(inputQtdJogos.value) || 0;
  if (qtd < 1 || qtd > 20) {
    alert("A quantidade deve ser entre 1 e 20.");
    return;
  }
  jogosGerados = gerarJogos(qtd);
  renderizarJogos();
});

// Envio da aposta
btnConfirmar?.addEventListener("click", async () => {
  const nome = inputNome.value.trim();
  const tel = inputTelefone.value.trim();

  if (!nome || !tel) {
    alert("Preencha Nome e Telefone.");
    return;
  }

  if (jogosGerados.length === 0) {
    alert("Gere os jogos antes de confirmar.");
    return;
  }

  btnConfirmar.disabled = true;
  btnConfirmar.textContent = "Enviando...";

  try {
    const formData = new FormData();
    formData.append("action", "registrarAposta");
    formData.append("nome", nome);
    formData.append("telefone", tel);
    formData.append("jogos", jogosGerados.join("|") );

    const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
    const data = await res.json();

    if (data.success) {
      window.location.href = `confirmacao.html?protocolo=${data.protocolo}`;
    } else {
      alert("Erro: " + (data.message || "Falha ao enviar."));
    }
  } catch (e) {
    alert("Erro de conexão: " + e.message);
  }

  btnConfirmar.disabled = false;
  btnConfirmar.textContent = "Confirmar Aposta";
});

