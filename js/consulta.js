document.addEventListener("DOMContentLoaded", () => {

  const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzavXeNlDzPh_hGnoWM7AKv5ecp4WHJdHd-ILwWQ2j-O59GNHLoBwYMrkZyRQrNSmSK/exec"; // 🔥 Substitua pela URL publicada da API REST
  const chavePix = "88f77025-40bc-4364-9b64-02ad88443cc4";

  const btnConsultar = document.getElementById("btnConsultar");
  const resultadoDiv = document.getElementById("resultado");

  // Helper REST
  async function postPath(path, body = {}) {
    const url = `${WEBAPP_URL}?path=${encodeURIComponent(path)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  btnConsultar.addEventListener("click", async () => {
    const protocolo = document.getElementById("protocoloInput").value.trim();
    resultadoDiv.innerHTML = `<p class="center" style="color:#555">Buscando...</p>`;

    if (!protocolo) {
      resultadoDiv.innerHTML = `<p class="center" style="color:red">Preencha o número de Protocolo.</p>`;
      return;
    }

    try {

      // ======= CHAMADAS REST EM PARALELO =======
      const [resPart, resGeral, resJogosAdm] = await Promise.all([
        postPath("consulta/participante", { protocolo }),
        postPath("consulta/geral"),
        postPath("consulta/jogosAdm")
      ]);

      if (!resPart.success) {
        resultadoDiv.innerHTML = `<p class="center" style="color:red">${
          resPart.error || "Protocolo não encontrado."
        }</p>`;
        return;
      }

      const participante = resPart.participante;
      const dadosGerais = resGeral || {};

      const todosJogos = (dadosGerais.todosJogos || []);
      const jogosAdm = (resJogosAdm.jogosAdm || []);

      /* ======= ESTATÍSTICAS ======= */
      let html = `
        <h3 class="center" style="margin-top:20px;">Estatísticas do Bolão</h3>
        <div class="card">
          <p><strong>Participantes:</strong> ${dadosGerais.totalParticipantes || "-"}</p>
          <p><strong>Total de Jogos:</strong> ${dadosGerais.totalJogos || "-"}</p>
        </div>
      `;

      /* ======= JOGO DA SORTE ======= */
      if (dadosGerais.jogoDaSorte?.trim()) {
        const sorteHtml = dadosGerais.jogoDaSorte
          .split(" ")
          .map((n) => `<span>${n}</span>`)
          .join("");

        html += `
          <div class="jogo-sorte-container">
            <h3>Jogo da Sorte (9 Números)</h3>
            <div class="jogo-sorte-numeros">${sorteHtml}</div>
          </div>
        `;
      } else {
        const vazio = Array(9).fill(`<span class="empty">-</span>`).join("");
        html += `
          <div class="jogo-sorte-container">
            <h3>Jogo da Sorte (9 Números)</h3>
            <p style="color:#e94a4a; font-weight:600; font-size:0.95rem;">
              O jogo de 9 números ainda não foi cadastrado. Será cadastrado dia 29/12 quando o bolão fechar.
            </p>
            <div class="jogo-sorte-numeros">${vazio}</div>
          </div>
        `;
      }

      /* ======= DADOS DO PARTICIPANTE ======= */
      const statusPago = participante.status === "PAGO";
      const statusCor = statusPago ? "green" : "red";
      const statusTxt = statusPago ? "Pago" : "Aguardando Pagamento";

      html += `
        <h3 class="center" style="margin-top:20px;">Seus Dados e Jogos</h3>
        <div class="card">
          <p><strong>Nome:</strong> ${participante.nome}</p>
          <p><strong>Telefone:</strong> ${participante.telefone}</p>
          <p><strong>Protocolo:</strong> ${participante.protocolo}</p>
          <p><strong>Status:</strong> <span style="color:${statusCor}">${statusTxt}</span></p>
          ${
            !statusPago
              ? `
              <div class="pix-box">
                <label><strong>Chave PIX para pagamento:</strong></label>
                <div id="pix-chave">${chavePix}</div>
                <button id="btnCopiarPix" class="btn-copiar">Copiar</button>
                <p class="pix-info">Use esta chave para realizar o pagamento da sua aposta.</p>
              </div>
            ` : ""
          }
          <hr style="margin:10px 0;">
          ${participante.jogos
            .map((j, i) => `<p><b>Jogo ${i + 1}:</b> ${j}</p>`)
            .join("")}
          <div class="bottom-buttons">
            <button onclick="window.location.href='comprovante.html?protocolo=${protocolo}'">
              Baixar Comprovante
            </button>
          </div>
        </div>
      `;

      /* ======= TODOS OS JOGOS ======= */
      const jogosCompletos = [...todosJogos, ...jogosAdm].filter(Boolean);

      if (jogosCompletos.length > 0) {
        html += `
          <div class="jogos-bolao-container">
            <div class="aviso-bolao">
              ⚠️ Os jogos abaixo são de todos os participantes cadastrados. Caso algum participante não realize o pagamento,
              seus jogos serão excluídos no dia <strong>28/12/2025</strong>.<br><br>
              A partir do dia <strong>29/12/2025</strong>, todos os jogos exibidos abaixo serão os que serão cadastrados nas
              lotéricas para a <strong>Mega Sena da Virada</strong>.
            </div>

            <h3>Todos os Jogos do Bolão</h3>
            <div class="jogos-grid">
              ${jogosCompletos
                .map(
                  (j) => `
                  <div class="jogo-card">
                    ${j
                      .split(" ")
                      .map((n) => `<span>${n}</span>`)
                      .join("")}
                  </div>`
                )
                .join("")}
            </div>
          </div>
        `;
      }

      resultadoDiv.innerHTML = html;

      /* ======= BOTÃO COPIAR PIX ======= */
      const btnPix = document.getElementById("btnCopiarPix");
      if (btnPix) {
        btnPix.onclick = () => {
          const chave = document.getElementById("pix-chave").textContent.trim();
          navigator.clipboard.writeText(chave).then(() => {
            btnPix.textContent = "Copiado!";
            setTimeout(() => (btnPix.textContent = "Copiar"), 2000);
          });
        };
      }

    } catch (err) {
      console.error(err);
      resultadoDiv.innerHTML = `<p class="center" style="color:red">Erro: ${err.message}</p>`;
    }

  });
});
