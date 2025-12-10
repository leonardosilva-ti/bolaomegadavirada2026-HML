// js/comprovante.js

document.addEventListener("DOMContentLoaded", () => {
		// ⚠️ A URL DO SEU SCRIPT DEVE SER ATUALIZADA AQUI!
		const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzavXeNlDzPh_hGnoWM7AKv5ecp4WHJdHd-ILwWQ2j-O59GNHLoBwYMrkZyRQrNSmSK/exec";
		const PIX_KEY = "88f77025-40bc-4364-9b64-02ad88443cc4";
		const COR_SUCESSO = "#16a34a"; // Cor verde do seu CSS (var(--green))

		const dadosDiv = document.getElementById("dadosComprovante");
		const jogosDiv = document.getElementById("jogosComprovante");
		const statusSpan = document.getElementById("statusAposta");
		const btnAtualizar = document.getElementById("btnAtualizarStatus");
		const btnBaixarPDF = document.getElementById("baixarPDF");

		// 1. Pega o protocolo da URL
		const urlParams = new URLSearchParams(window.location.search);
		const protocolo = urlParams.get('protocolo');
			
		// Variável global para armazenar os dados carregados
		let apostaData = null;	

		if (!protocolo) {
				dadosDiv.innerHTML = "<p style='color:red; text-align:center;'>Protocolo não encontrado na URL.</p>";
				// Desabilita os botões se não houver protocolo
				btnAtualizar.style.display = 'none';
				btnBaixarPDF.style.display = 'none';
				return;
		}

		/**
			* Formata um número de telefone (apenas dígitos) para (DD) 9XXXX-XXXX
			* @param {string} telefone Apenas os dígitos do telefone.
			* @returns {string} Telefone formatado ou a string original se inválido.
			*/
		function formatarTelefone(telefone) {
				// Verifica se o telefone é nulo, indefinido ou 'N/A'
				if (!telefone || telefone === 'N/A') return 'Não Informado';
					
				// CORREÇÃO CRÍTICA: Converte para string antes de usar replace, caso seja um número (TypeError resolvido)
				const limpo = telefone.toString().replace(/\D/g, '');	

				if (limpo.length === 11) {	
						return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 7)}-${limpo.substring(7)}`;
				}
				return limpo;	
		}

		// Função principal para buscar e renderizar os dados
		async function carregarComprovante(protocolo) {
				dadosDiv.innerHTML = "<p style='text-align:center; color:#555;'>Carregando dados do comprovante...</p>";
				jogosDiv.innerHTML = "";
				statusSpan.textContent = "Buscando...";
				statusSpan.className = "status aguardando";
				btnAtualizar.disabled = true;

				try {
						// Usa a rota getComprovante que retorna todos os dados
						const response = await fetch(`${SCRIPT_URL}?action=getComprovante&protocolo=${encodeURIComponent(protocolo)}`);
						const data = await response.json();

						if (data.success && data.participante) {
								// Monta o objeto apostaData com base nos dados do servidor
								apostaData = {
										nome: data.participante.Nome || 'N/A',
										// Garante que a função receba uma string vazia se o valor for nulo/undefined
										telefone: formatarTelefone(data.participante.Telefone || ''),
										protocolo: data.participante.Protocolo,

										// 🕒 Data/Hora
										dataHora: (() => {
												const valor = data.participante.DataHora;
												if (!valor) return 'N/A';
													
												if (typeof valor === 'string' && valor.includes('/')) {
														return valor; // Se já veio formatado, usa a string
												}
													
												try {
														const dataLocal = new Date(valor);
														const opcoes = {
																day: '2-digit', month: '2-digit', year: 'numeric',
																hour: '2-digit', minute: '2-digit', second: '2-digit',
																hour12: false, timeZone: 'America/Sao_Paulo'
														};
														const formatada = dataLocal.toLocaleString('pt-BR', opcoes);
														return formatada.replace(',', ' -');
												} catch {
														return valor;
												}
										})(),

										status: data.participante.Status,
										// Divide os jogos (strings separadas por espaço e separadas por '|')
										jogos: data.participante.Jogos ? data.participante.Jogos.split('|').filter(j => j.trim() !== '') : []
								};

								// --- 2. Renderizar Dados na Tela ---
								renderizarComprovante(apostaData);

						} else {
								dadosDiv.innerHTML = `<p style='color:red; text-align:center;'>${data.message || 'Protocolo não encontrado.'}</p>`;
								btnAtualizar.style.display = 'none';
								btnBaixarPDF.style.display = 'none';
						}
				} catch (err) {
						console.error("Erro ao carregar comprovante:", err);
						dadosDiv.innerHTML = `<p style='color:red; text-align:center;'>Falha na conexão com o servidor. Verifique o Protocolo.</p>`;
						btnAtualizar.style.display = 'none';
						btnBaixarPDF.style.display = 'none';
				} finally {
						btnAtualizar.disabled = false;
				}
		}

		// --- FUNÇÃO DE RENDERIZAÇÃO NA TELA ---
		function renderizarComprovante(aposta) {
				// Renderiza dados principais
				dadosDiv.innerHTML = `
					<h3>Dados do Participante</h3>
					<p><b>Nome:</b> ${aposta.nome}</p>
					<p><b>Telefone:</b> ${aposta.telefone}</p>
					<p><b>Protocolo:</b> ${aposta.protocolo}</p>
					<p><b>Data/Hora:</b> ${aposta.dataHora}</p>
				`;

				// Renderiza Jogos em Bolinhas
				jogosDiv.innerHTML = `
					<h3>Seus Jogos</h3>
					${aposta.jogos.map((jogoString, i) => {
							// Transforma "01 02 03 04 05 06" (separado por espaço) em um array de SPANs (bolinhas)
							const numerosHtml = jogoString.trim().split(/\s+/).map(n =>	
									`<span class="bolinha">${n.toString().padStart(2, '0')}</span>`
							).join(' ');

							return `
								<div class="jogo-item-comprovante">
									<b>Jogo ${i + 1}:</b>	
									<div class="numeros-bolinhas-container">
										${numerosHtml}
									</div>
								</div>
							`;
					}).join("")}
				`;

				atualizarStatusVisual(aposta.status);
					
				// Remove PIX box existente (se houver)
				document.getElementById("pixComprovanteContainer")?.remove(); // Mudança de ID

				// Exibir PIX se ainda não pago
				if (aposta.status === "AGUARDANDO PAGAMENTO") {
            // 🛑 CORREÇÃO 1: Adiciona a classe resumo-container para o quadro cinza
						const pixContainer = document.createElement("div");
						pixContainer.className = "resumo-container"; 
						pixContainer.id = "pixComprovanteContainer"; // Novo ID para o container

						const pixBox = document.createElement("div");
						pixBox.className = "pix-box";
						pixBox.id = "pixComprovante";
						pixBox.innerHTML = `
                <h3>Chave PIX para Pagamento</h3>
								<p>Realize o pagamento no valor de <b>R$60,00</b> utilizando a chave abaixo no aplicativo do seu banco:</p>
								<span class="pix-key">${PIX_KEY}</span>
								<button id="btnCopiarPix">Copiar Chave PIX</button>
						`;
						
            pixContainer.appendChild(pixBox); // Adiciona o pixBox dentro do Container
							
						// Encontra a seção comprovante e insere o PIX antes do status-wrapper
						document.getElementById("areaComprovante").insertBefore(pixContainer, document.querySelector('.status-wrapper'));

						document.getElementById("btnCopiarPix").addEventListener("click", (e) => {
								navigator.clipboard.writeText(PIX_KEY);
								const btn = e.target;
								btn.textContent = "Copiado! ✅";
								btn.style.backgroundColor = COR_SUCESSO;	
								setTimeout(() => {
										btn.textContent = "Copiar Chave PIX";
										btn.style.backgroundColor = ""; // Volta ao estilo padrão
								}, 2000);
						});
				}
		}

		// ===== Atualiza o status visualmente =====
		function atualizarStatusVisual(status) {
				statusSpan.textContent = status;
				statusSpan.className = "status " + (status === "PAGO" ? "pago" : "aguardando");
		}

		// ===== Atualizar status manualmente (Botão) =====
		btnAtualizar.addEventListener("click", async () => {
				if (!apostaData) return;
					
				statusSpan.textContent = "Atualizando...";
				statusSpan.className = "status aguardando";
				btnAtualizar.disabled = true;
				btnAtualizar.textContent = "Verificando...";

				try {
						// Usa a rota getStatus, que é mais leve, para a atualização
						const response = await fetch(
								`${SCRIPT_URL}?action=getStatus&protocolo=${encodeURIComponent(apostaData.protocolo)}`
						);
						const data = await response.json();

						if (data && data.status) {
								apostaData.status = data.status; // Atualiza a variável global
								atualizarStatusVisual(data.status);
									
								// Re-renderiza para mostrar/esconder o PIX se o status mudou para PAGO
								renderizarComprovante(apostaData);	
						} else {
								statusSpan.textContent = "Erro ao atualizar status.";
						}
				} catch (err) {
						console.error(err);
						statusSpan.textContent = "Falha na conexão.";
				} finally {
						btnAtualizar.disabled = false;
						btnAtualizar.textContent = "Atualizar";
				}
		});

		// ===== GERAR PDF DO COMPROVANTE (PROFISSIONAL E AMIGÁVEL) =====
		btnBaixarPDF.addEventListener("click", () => {
			if (!apostaData) {
				alert("Nenhuma aposta encontrada para gerar o comprovante.");
				return;
			}

			const { jsPDF } = window.jspdf;
			// Tamanho A4: 210 x 297 mm
			const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

			// --- Definição de Cores ---
			const COR_AZUL = [0, 114, 227]; // Azul de destaque
			const COR_VERDE_MEGA = [0, 128, 0]; // Verde da Mega Sena
			const COR_CINZA_CLARO = [240, 240, 240];
			const COR_TEXTO = [51, 51, 51]; // #333

			// --- Posição inicial ---
			let y = 15;
			const MARGEM_X = 20;
			const LARGURA_MAX = 170;

			// =============================
			// 1. CABEÇALHO E TÍTULO
			// =============================
			doc.setFontSize(16);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(COR_VERDE_MEGA[0], COR_VERDE_MEGA[1], COR_VERDE_MEGA[2]);
			doc.text("BOLÃO MEGA DA VIRADA", 105, y, { align: "center" });

			y += 8;
			doc.setFontSize(11);
			doc.setFont("helvetica", "normal");
			doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
			doc.text("Comprovante Oficial de Participação", 105, y, { align: "center" });

			y += 5;
			doc.setDrawColor(COR_VERDE_MEGA[0], COR_VERDE_MEGA[1], COR_VERDE_MEGA[2]);
			doc.setLineWidth(1);
			doc.line(MARGEM_X, y, MARGEM_X + LARGURA_MAX, y);

			y += 8; // Espaço após a linha

			// =============================
			// 2. DADOS DO PARTICIPANTE (Box Simples)
			// =============================
			doc.setFontSize(11);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
			doc.text("Dados do Participante:", MARGEM_X, y);

			doc.setFont("helvetica", "normal");
			doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
			y += 6;
			doc.text(`Nome:`, MARGEM_X, y);
			doc.text(apostaData.nome, MARGEM_X + 20, y);
			y += 5;
			doc.text(`Telefone:`, MARGEM_X, y);
			doc.text(apostaData.telefone, MARGEM_X + 20, y);
			y += 5;
			doc.text(`Protocolo:`, MARGEM_X, y);
			doc.text(apostaData.protocolo, MARGEM_X + 25, y);
			y += 5;
			doc.text(`Data/Hora:`, MARGEM_X, y);
			doc.text(apostaData.dataHora, MARGEM_X + 35, y);

			y += 10;

			// =============================
			// 3. STATUS DO PAGAMENTO (Box Colorido)
			// =============================
			const statusColor = apostaData.status === "PAGO" ? COR_VERDE_MEGA : COR_AZUL;
			
			// Fundo da caixa de status
			doc.setFillColor(COR_CINZA_CLARO[0], COR_CINZA_CLARO[1], COR_CINZA_CLARO[2]);
			doc.rect(MARGEM_X, y, LARGURA_MAX, 10, 'F'); 

			doc.setFontSize(12);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
			doc.text("Status de Pagamento:", MARGEM_X + 5, y + 6.5);

			doc.setFontSize(14);
			doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
			doc.text(apostaData.status, MARGEM_X + LARGURA_MAX - 5, y + 6.5, { align: "right" });
			
			doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
			doc.setFont("helvetica", "normal");

			y += 15;

			// =============================
			// 4. JOGOS
			// =============================
			doc.setFontSize(11);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
			doc.text("Seus Jogos:", MARGEM_X, y);

			doc.setFont("courier", "normal"); // Fonte monoespaçada para números
			doc.setFontSize(12);
			y += 5;
			
			apostaData.jogos.forEach((j, i) => {
				// Rótulo Jogo X:
				doc.setFont("helvetica", "bold");
				doc.text(`Jogo ${i + 1}:`, MARGEM_X + 5, y);

				// Números
				doc.setFont("courier", "bold");
				doc.text(j, MARGEM_X + 30, y); // Espaço fixo
				
				y += 7;
				
				// Verifica quebra de página
				if (y > 250) { 
					doc.addPage();
					y = 30; // Novo topo da página
					// Repete o título dos jogos na nova página
					doc.setFont("helvetica", "bold");
					doc.setTextColor(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
					doc.text("Seus Jogos (continuação):", MARGEM_X, y);
					y += 5;
				}
			});
			
			doc.setFont("helvetica", "normal");
			y += 5;

			// =============================
			// 5. INFORMAÇÕES PIX (Se Aplicável)
			// =============================
			if (apostaData.status === "AGUARDANDO PAGAMENTO") {
				if (y > 240) { doc.addPage(); y = 30; } // Quebra de página antes do PIX

				y += 5;
				
				// Fundo da caixa PIX (Amarelo claro para destaque de pagamento)
				doc.setFillColor(255, 250, 230); // Amarelo claro
				doc.rect(MARGEM_X, y, LARGURA_MAX, 30, 'F');
				
				doc.setFontSize(11);
				doc.setFont("helvetica", "bold");
				doc.setTextColor(COR_AZUL[0], COR_AZUL[1], COR_AZUL[2]);
				doc.text("Instruções de Pagamento - PIX", MARGEM_X + LARGURA_MAX / 2, y + 5, { align: "center" });

				doc.setFontSize(10);
				doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
				doc.setFont("helvetica", "normal");
				doc.text("Chave PIX (Copie e cole no app do seu banco):", MARGEM_X + 5, y + 15);
				
				doc.setFontSize(12);
				doc.setFont("courier", "bold");
				doc.setTextColor(COR_VERDE_MEGA[0], COR_VERDE_MEGA[1], COR_VERDE_MEGA[2]);
				// Garante que a chave PIX caiba na largura
				const PIX_KEY = "88f77025-40bc-4364-9b64-02ad88443cc4";
				doc.text(PIX_KEY, MARGEM_X + LARGURA_MAX / 2, y + 23, { align: "center" });
			}

			// =============================
			// 6. RODAPÉ / AVISO
			// =============================
			
			// Garante espaço suficiente
			let finalY = Math.max(y + 35, 260); 
			
			doc.setDrawColor(200);
			doc.setLineWidth(0.5);
			doc.line(MARGEM_X, finalY, MARGEM_X + LARGURA_MAX, finalY);

			doc.setFontSize(9);
			doc.setTextColor(100, 100, 100);
			doc.setFont("helvetica", "normal");
			
			finalY += 5;
			doc.text("Guarde este comprovante e o número de protocolo para futuras consultas.", 105, finalY, { align: "center" });
			finalY += 4;
			doc.text("Documento gerado automaticamente. Verifique o status na página de consulta.", 105, finalY, { align: "center" });


			// ===== Salvar =====
			const nomeArquivo = `Comprovante_${apostaData.protocolo}.pdf`;
			doc.save(nomeArquivo);
		});

			
		// Inicia o carregamento dos dados
		carregarComprovante(protocolo);
});