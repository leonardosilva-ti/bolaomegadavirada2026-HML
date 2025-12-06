// js/comprovante.js

document.addEventListener("DOMContentLoaded", () => {
    // ⚠️ A URL DO SEU SCRIPT DEVE SER ATUALIZADA AQUI!
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuX4NxUodwTALVVsFMvDHFhrgV-tR4MBTZA_xdJd2rXLg5qIj1CSg3yXghM66JpWSm/exec";
    const PIX_KEY = "88f77025-40bc-4364-9b64-02ad88443cc4";

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
                    telefone: data.participante.Telefone || 'N/A',
                    protocolo: data.participante.Protocolo,

                    // 🕒 Correção: formata data ISO em "DD/MM/AAAA - HH:MM:SS" (fuso horário de Brasília)
                    dataHora: (() => {
                        const valor = data.participante.DataHora;
                        if (!valor) return 'N/A';
                        try {
                            const dataLocal = new Date(valor);
                            const opcoes = {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false,
                                timeZone: 'America/Sao_Paulo'
                            };
                            const formatada = dataLocal.toLocaleString('pt-BR', opcoes);
                            return formatada.replace(',', ' -');
                        } catch {
                            return valor;
                        }
                    })(),

                    status: data.participante.Status,
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
        dadosDiv.innerHTML = `
          <p><b>Nome:</b> ${aposta.nome}</p>
          <p><b>Telefone:</b> ${aposta.telefone}</p>
          <p><b>Protocolo:</b> ${aposta.protocolo}</p>
          <p><b>Data/Hora:</b> ${aposta.dataHora}</p>
        `;

        jogosDiv.innerHTML = `
          <h3>Jogos Selecionados</h3>
          ${aposta.jogos.map((j, i) => `<p><b>Jogo ${i + 1}:</b> ${j}</p>`).join("")}
        `;

        atualizarStatusVisual(aposta.status);
        
        // Remove PIX box existente, se houver
        document.querySelector('.pix-box')?.remove();

        // Exibir PIX se ainda não pago
        if (aposta.status === "AGUARDANDO PAGAMENTO") {
            const pixBox = document.createElement("div");
            pixBox.className = "pix-box";
            pixBox.innerHTML = `
              <p>Chave PIX para pagamento:</p>
              <span class="pix-key">${PIX_KEY}</span>
              <button id="btnCopiarPix">Copiar</button>
            `;
            jogosDiv.after(pixBox);

            document.getElementById("btnCopiarPix").addEventListener("click", () => {
                navigator.clipboard.writeText(PIX_KEY);
                const btn = document.getElementById("btnCopiarPix");
                btn.textContent = "Copiado!";
                btn.style.background = "#16a34a";
                setTimeout(() => {
                    btn.textContent = "Copiar";
                    btn.style.background = "";
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

    // ===== GERAR PDF DO COMPROVANTE =====
    btnBaixarPDF.addEventListener("click", () => {
    if (!apostaData) {
        alert("Nenhuma aposta encontrada para gerar o comprovante.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // ===== Cabeçalho =====
    doc.setFontSize(16);
    doc.setTextColor(0, 114, 227);
    doc.text("🎫 Comprovante Oficial do Bolão - Mega da Virada", 105, 20, { align: "center" });
    doc.setDrawColor(200);
    doc.line(20, 25, 190, 25);

    // ===== Dados principais =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    let y = 38;
    doc.text(`Nome: ${apostaData.nome}`, 20, y);
    y += 8;
    doc.text(`Telefone: ${apostaData.telefone}`, 20, y);
    y += 8;
    doc.text(`Protocolo: ${apostaData.protocolo}`, 20, y);
    y += 8;
    doc.text(`Data/Hora: ${apostaData.dataHora}`, 20, y);

    // ===== Status =====
    y += 12;
    doc.setFontSize(13);
    doc.setTextColor(80, 80, 80);
    doc.text("Status do Pagamento:", 20, y);
    doc.setFontSize(13);
    doc.setTextColor(apostaData.status === "PAGO" ? 22 : 220, apostaData.status === "PAGO" ? 197 : 50, apostaData.status === "PAGO" ? 94 : 50);
    doc.text(apostaData.status, 75, y);
    doc.setTextColor(0, 0, 0);

    // ===== Jogos =====
    y += 12;
    doc.setFontSize(13);
    doc.setTextColor(0, 114, 227);
    doc.text("Jogos Selecionados", 20, y);
    doc.setDrawColor(220);
    doc.line(20, y + 2, 80, y + 2);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    y += 8;
    apostaData.jogos.forEach((j, i) => {
        doc.text(`Jogo ${i + 1}: ${j}`, 25, y);
        y += 8;
        if (y > 260) { // quebra de página automática
            doc.addPage();
            y = 30;
        }
    });

    // ===== PIX =====
    if (apostaData.status === "AGUARDANDO PAGAMENTO") {
        y += 12;
        doc.setFontSize(13);
        doc.setTextColor(0, 114, 227);
        doc.text("Pagamento via PIX", 20, y);
        doc.line(20, y + 2, 80, y + 2);

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        y += 8;
        doc.text("Chave PIX (copie e cole no app do seu banco):", 20, y);
        y += 7;
        doc.setFont("courier", "bold");
        doc.text(PIX_KEY, 20, y);
        doc.setFont("helvetica", "normal");
    }

    // ===== Rodapé =====
    doc.setDrawColor(200);
    doc.line(20, 275, 190, 275);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Guarde este comprovante e o número de protocolo para futuras consultas.", 105, 282, { align: "center" });
    doc.text("Página gerada automaticamente pelo sistema do bolão.", 105, 288, { align: "center" });

    // ===== Salvar =====
    const nomeArquivo = `Comprovante_${apostaData.protocolo}.pdf`;
    doc.save(nomeArquivo);
});

    
    // Inicia o carregamento dos dados
    carregarComprovante(protocolo);
});
