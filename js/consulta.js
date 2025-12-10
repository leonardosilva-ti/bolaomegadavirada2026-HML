// js/consulta.js

document.addEventListener("DOMContentLoaded", () => {
		const SCRIPT_URL =
				"https://script.google.com/macros/s/AKfycbzavXeNlDzPh_hGnoWM7AKv5ecp4WHJdHd-ILwWQ2j-O59GNHLoBwYMrkZyRQrNSmSK/exec";
		const chavePix = "88f77025-40bc-4364-9b64-02ad88443cc4";

		const btnConsultar = document.getElementById("btnConsultar");
		const resultadoDiv = document.getElementById("resultado");

		// Cor Verde da Mega (para feedback de sucesso, alinhada à variável CSS)
		const COR_SUCESSO = "#008000"; 
		// Cor Vermelha de Status (alinhada à variável CSS)
		const COR_STATUS_RED = "#d32f2f"; 

		btnConsultar.addEventListener("click", async () => {
				const protocolo = document.getElementById("protocoloInput").value.trim();
				resultadoDiv.innerHTML = `<p class="center" style="color:#555">Buscando...</p>`;

				if (!protocolo) {
						resultadoDiv.innerHTML = `<p class="center" style="color:${COR_STATUS_RED}">Preencha o número de Protocolo.</p>`;
						return;
				}

				try {
						// Busca participante, jogos do bolão e jogos excedentes da planilha Jogos-adm
						const [resParticipante, resGeral, resJogosAdm] = await Promise.all([
								fetch(`${SCRIPT_URL}?action=getComprovante&protocolo=${protocolo}`).then((r) => r.json()),
								fetch(`${SCRIPT_URL}?action=consultarBolao`).then((r) => r.json()),
								fetch(`${SCRIPT_URL}?action=getJogosAdm`).then((r) => r.json()),
						]);

						if (!resParticipante.success) {
								resultadoDiv.innerHTML = `<p class="center" style="color:${COR_STATUS_RED}">${
										resParticipante.message || "Protocolo não encontrado."
								}</p>`;
								return;
						}

						const participante = resParticipante.participante;
						const dadosGerais = resGeral || {};
						const todosJogos = dadosGerais.todosJogos || [];
						const jogosAdm = resJogosAdm?.jogosAdm || [];

						let html = ``;

						/* ======= ESTATÍSTICAS ======= */
						html += `
								<h3 class="section-title">Estatísticas do Bolão</h3>
								<div class="resumo-container">
										<p><strong>Participantes:</strong> ${dadosGerais.totalParticipantes || "-"}</p>
										<p><strong>Total de Jogos:</strong> ${dadosGerais.totalJogos || "-"}</p>
								</div>
						`;

						/* ======= JOGO DA SORTE ======= */
						if (dadosGerais.jogoDaSorte?.trim()) {
								const sorteHtml = dadosGerais.jogoDaSorte
										.split(" ")
										.map((n) => `<span>${n.padStart(2, '0')}</span>`) 
										.join("");
								html += `
										<div class="jogo-sorte-container">
												<h3>Jogo da Sorte (9 Números)</h3>
												<div class="jogo-sorte-numeros">${sorteHtml}</div>
										</div>
								`;
						} else {
								const totalBolinhas = 9;
								const bolinhasVazias = Array(totalBolinhas)
										.fill(`<span class="empty">-</span>`)
										.join("");

								html += `
										<div class="jogo-sorte-container">
												<h3>Jogo da Sorte (9 Números)</h3>
												<p style="color:#e94a4a; font-weight:600; font-size:0.95rem; margin: 0 0 10px 0;">
														O jogo de 9 números ainda não foi cadastrado. Será cadastrado dia 29/12 quando o bolão fechar.
												</p>
												<div class="jogo-sorte-numeros">${bolinhasVazias}</div>
										</div>
								`;
						}

						/* ======= DADOS DO PARTICIPANTE ======= */
						const statusPago = participante.Status === "PAGO";
						const statusCor = statusPago ? COR_SUCESSO : COR_STATUS_RED;
						const statusTxt = statusPago ? "Pago" : "Aguardando Pagamento";

						html += `
								<h3 class="section-title">Seus Dados e Jogos</h3>
								<div class="resumo-container">
										<h3>Dados da Aposta</h3>
										<p><strong>Nome:</strong> ${participante.Nome}</p>
										<p><strong>Telefone:</strong> ${participante.Telefone}</p>
										<p><strong>Protocolo:</strong> ${participante.Protocolo}</p>
										<p><strong>Status:</strong> <span style="color:${statusCor}; font-weight:700;">${statusTxt}</span></p>
										${
												!statusPago
														? `
														<div class="pix-box">
																<label style="font-weight:600;">Chave PIX para pagamento:</label>
																<div id="pix-chave">${chavePix}</div>
																<button id="btnCopiarPix" class="btn-copiar">Copiar</button>
																<p class="pix-info">Use esta chave para realizar o pagamento da sua aposta.</p>
														</div>`
														: ""
										}
										<hr style="margin:10px 0; border: 0; border-top: 1px dashed #ccc;">
										<h3>Seus Jogos</h3>
										${participante.Jogos.split("|")
												.filter(Boolean)
												.map((j, i) => `<p><b>Jogo ${i + 1}:</b> ${j}</p>`)
												.join("")}
										<div class="bottom-buttons">
												<button onclick="window.location.href='comprovante.html?protocolo=${protocolo}'">
														Baixar Comprovante
												</button>
										</div>
								</div>
						`;

						/* ======= TODOS OS JOGOS DO BOLÃO ======= */
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

												<h3 class="section-title">Todos os Jogos do Bolão</h3>
												<div class="jogos-grid">
														${jogosCompletos
																.map(
																		(j) => `
																<div class="jogo-card">
																		${j
																				.split(" ")
																				.map((num) => `<span>${num.padStart(2, '0')}</span>`)
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
												btnPix.style.backgroundColor = COR_SUCESSO; 
												btnPix.style.color = "white"; 
												setTimeout(() => {
														btnPix.textContent = "Copiar";
														// Volta ao estilo padrão (cores definidas no CSS:consulta.css)
														btnPix.style.backgroundColor = "";
														btnPix.style.color = "";
												}, 2000);
										});
								};
						}
				} catch (err) {
						console.error(err);
						resultadoDiv.innerHTML = `<p class="center" style="color:${COR_STATUS_RED}">Erro: Falha na comunicação com o servidor.</p>`;
				}
		});
});