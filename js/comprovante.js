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

    // ===== GERAR PDF DO COMPROVANTE CORRIGIDO E MELHORADO (v2 com Noto Sans) =====
    btnBaixarPDF.addEventListener("click", () => {
    if (!apostaData) {
        alert("Nenhuma aposta encontrada para gerar o comprovante.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // 🚨 ATENÇÃO: Use o nome da fonte Unicode que você carregou
    // Se a fonte for carregada corretamente, o nome NotoSans deve funcionar.
    const FONT_UNICODE = 'NotoSans'; 
    
    // Cores
    const COR_AZUL = [0, 80, 150];
    const COR_FUNDO_CINZA = [240, 240, 240];
    const COR_PAGO = [34, 139, 34];
    const COR_AGUARDANDO = [255, 140, 0];

    let y = 15; 
    const MARGEM_ESQUERDA = 20;
    const LARGURA = 170;

    // 1. Bloco do Título Principal (Agora usando a fonte UNICODE)
    doc.setFillColor(...COR_AZUL);
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setFont(FONT_UNICODE, "bold"); // 🚨 MUDEI A FONTE AQUI
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("🎫 Comprovante Oficial do Bolão", 105, y, { align: "center" });
    
    y += 8;
    doc.setFontSize(14);
    doc.text("Mega da Virada 2026", 105, y, { align: "center" });
    
    y = 38; // Início do conteúdo

    // 2. Dados do Participante
    const H_DADOS = 40;
    doc.setFillColor(...COR_FUNDO_CINZA);
    doc.rect(MARGEM_ESQUERDA, y - 5, LARGURA, H_DADOS, 'F');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal"); 
    
    doc.text("INFORMAÇÕES DO PARTICIPANTE", MARGEM_ESQUERDA + 2, y);
    doc.setDrawColor(200);
    doc.line(MARGEM_ESQUERDA + 2, y + 1, MARGEM_ESQUERDA + 60, y + 1);

    y += 5;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Nome:`, MARGEM_ESQUERDA + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`${apostaData.nome}`, MARGEM_ESQUERDA + 25, y + 5);

    doc.setFont("helvetica", "bold");
    doc.text(`Telefone:`, MARGEM_ESQUERDA + 90, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`${apostaData.telefone}`, MARGEM_ESQUERDA + 115, y + 5);
    
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Protocolo:`, MARGEM_ESQUERDA + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`${apostaData.protocolo}`, MARGEM_ESQUERDA + 27, y + 5);

    doc.setFont("helvetica", "bold");
    doc.text(`Data/Hora:`, MARGEM_ESQUERDA + 90, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`${apostaData.dataHora}`, MARGEM_ESQUERDA + 115, y + 5);
    
    y += 15;

    // 3. Status de Pagamento
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Status do Pagamento:", MARGEM_ESQUERDA, y);
    
    const statusText = apostaData.status;
    const statusColor = statusText === "PAGO" ? COR_PAGO : COR_AGUARDANDO;
    
    doc.setTextColor(...statusColor);
    doc.setFontSize(16);
    doc.text(statusText, MARGEM_ESQUERDA + 58, y);
    doc.setTextColor(0, 0, 0);

    // Linha divisória
    doc.setDrawColor(...COR_AZUL);
    doc.line(MARGEM_ESQUERDA, y + 5, MARGEM_ESQUERDA + LARGURA, y + 5);
    y += 10;

    // 4. Jogos Selecionados (Agora usando a fonte UNICODE)
    doc.setFont(FONT_UNICODE, "bold"); // 🚨 MUDEI A FONTE AQUI
    doc.setFontSize(14);
    doc.setTextColor(...COR_AZUL);
    doc.text("🎲 Seus Jogos Selecionados", MARGEM_ESQUERDA, y);
    doc.setTextColor(0, 0, 0);

    y += 8;
    doc.setFontSize(12);
    
    apostaData.jogos.forEach((j, i) => {
        if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(MARGEM_ESQUERDA, y - 5, LARGURA, 6, 'F');
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(`Jogo ${i + 1}:`, MARGEM_ESQUERDA + 5, y);
        doc.setFont("courier", "bold");
        doc.text(j, MARGEM_ESQUERDA + 30, y);
        
        y += 8;
        if (y > 260) {
            doc.addPage();
            y = 30;
            doc.setFont(FONT_UNICODE, "bold"); // 🚨 MUDEI A FONTE AQUI
            doc.setFontSize(14);
            doc.setTextColor(...COR_AZUL);
            doc.text("🎲 Seus Jogos Selecionados (continuação)", MARGEM_ESQUERDA, y);
            doc.setTextColor(0, 0, 0);
            y += 8;
        }
    });
    doc.setFont("helvetica", "normal");

    // 5. Seção PIX (Agora usando a fonte UNICODE)
    if (apostaData.status === "AGUARDANDO PAGAMENTO") {
        y += 10;
        
        if (y > 240) {
            doc.addPage();
            y = 30;
        }

        doc.setFillColor(...COR_FUNDO_CINZA);
        doc.rect(MARGEM_ESQUERDA, y - 5, LARGURA, 30, 'F');

        doc.setFont(FONT_UNICODE, "bold"); // 🚨 MUDEI A FONTE AQUI
        doc.setFontSize(14);
        doc.setTextColor(...COR_AZUL);
        doc.text("💲 Dados para Pagamento via PIX", MARGEM_ESQUERDA + 2, y);
        doc.setTextColor(0, 0, 0);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        y += 7;
        doc.text("Chave PIX (Copie e cole no app do seu banco):", MARGEM_ESQUERDA + 2, y);
        y += 6;
        doc.setFont("courier", "bold");
        doc.text(PIX_KEY, MARGEM_ESQUERDA + 2, y);
        doc.setFont("helvetica", "normal");
    }

    // 6. Rodapé
    doc.setDrawColor(150);
    doc.line(MARGEM_ESQUERDA, 275, MARGEM_ESQUERDA + LARGURA, 275);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Guarde este comprovante e o número de protocolo para futuras consultas.", 105, 280, { align: "center" });
    doc.text("Página gerada automaticamente pelo sistema do bolão - " + new Date().toLocaleDateString(), 105, 284, { align: "center" });

    // 7. Salvar
    const nomeArquivo = `Comprovante_${apostaData.protocolo}.pdf`;
    doc.save(nomeArquivo);
});

carregarComprovante(protocolo);
});
