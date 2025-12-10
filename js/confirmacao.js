// Arquivo: js/confirmacao.js

// URL de Implantação do Apps Script fornecida no prompt
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzavXeNlDzPh_hGnoWM7AKv5ecp4WHJdHd-ILwWQ2j-O59GNHLoBwYMrkZyRQrNSmSK/exec';

const CHAVE_PIX_FIXA = "88f77025-40bc-4364-9b64-02ad88443cc4"; // Chave PIX fixa

const aposta = JSON.parse(localStorage.getItem("dadosBolao")); 

const dadosDiv = document.getElementById("dadosConfirmacao");
const jogosDiv = document.getElementById("jogosConfirmacao");
const chavePixDisplay = document.getElementById("chavePixDisplay");
const copiarPixBtn = document.getElementById("copiarPixBtn");
const mensagem = document.getElementById("mensagem");
const termosCheckbox = document.getElementById("aceitoTermos");
const btnConfirmar = document.getElementById("btnConfirmar");

/**
 * Formata um número de telefone (apenas dígitos) para (DD) 9XXXX-XXXX
 * @param {string} telefone Apenas os dígitos do telefone.
 * @returns {string} Telefone formatado ou a string original se inválido.
 */
function formatarTelefone(telefone) {
    if (!telefone) return 'Não Informado';
    const limpo = telefone.replace(/\D/g, ''); 

    if (limpo.length === 11) { 
        return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 7)}-${limpo.substring(7)}`;
    }
    return limpo; 
}


if (!aposta || !aposta.jogos || aposta.jogos.length !== 5) {
    dadosDiv.innerHTML = "<p style='color:red'>Nenhuma aposta válida encontrada. Retorne à página principal.</p>";
    btnConfirmar.disabled = true;
    if (copiarPixBtn) copiarPixBtn.disabled = true;
} else {
    // 1. Exibe os dados do participante
    dadosDiv.innerHTML = `
        <h3>Seus Dados</h3>
        <p><b>Nome Completo:</b> ${aposta.nome || 'Não Informado'}</p>
        <p><b>Telefone (WhatsApp):</b> ${formatarTelefone(aposta.telefone)}</p>
    `;
    
    // 2. Exibe os jogos no formato de bolinha
    jogosDiv.innerHTML = `
        <h3>Jogos Selecionados (5)</h3>
        ${aposta.jogos.map((jogo, i) => {
            const numerosHtml = jogo.sort((a, b) => a - b).map(n => 
                `<span class="bolinha">${n.toString().padStart(2, '0')}</span>`
            ).join(' ');

            return `
                <div class="jogo-item-confirmacao">
                    <b>Jogo ${i + 1}:</b> 
                    <div class="numeros-bolinhas-container">
                        ${numerosHtml}
                    </div>
                </div>
            `;
        }).join("")}
    `;

    // 3. Exibe a chave PIX
    chavePixDisplay.textContent = CHAVE_PIX_FIXA;
}

// Lógica para o botão Copiar PIX
copiarPixBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(CHAVE_PIX_FIXA)
        .then(() => {
            const originalText = 'Copiar Chave';
            copiarPixBtn.textContent = 'Chave Copiada! ✅';
            copiarPixBtn.classList.add('copied-feedback'); 
            
            setTimeout(() => {
                copiarPixBtn.textContent = originalText;
                copiarPixBtn.classList.remove('copied-feedback');
            }, 1500);
        })
        .catch(err => {
            console.error('Falha ao copiar:', err);
            alert(`Falha ao copiar automaticamente. A chave PIX é: ${CHAVE_PIX_FIXA}. Por favor, copie manualmente.`);
        });
});

termosCheckbox.addEventListener("change", () => {
    btnConfirmar.disabled = !termosCheckbox.checked;
});

document.getElementById("btnVoltar").addEventListener("click", () => {
    window.location.href = "index.html";
});


btnConfirmar.addEventListener("click", async () => {
    if (!termosCheckbox.checked) {
        mensagem.textContent = "Você deve aceitar os termos antes de confirmar.";
        mensagem.style.color = "red";
        return;
    }

    mensagem.textContent = "Enviando e registrando aposta...";
    mensagem.style.color = "blue";
    btnConfirmar.disabled = true;
    document.getElementById("btnVoltar").disabled = true;

    const protocolo = gerarProtocoloUnico(); 
    const dataHora = new Date().toLocaleString("pt-BR");

    const apostaCompleta = {
        ...aposta,
        dataHora,
        protocolo,
        status: "AGUARDANDO PAGAMENTO"
    };

    try {
        const formData = new FormData();
        // Ação correta para o Apps Script
        formData.append("action", "registrarAposta"); 
        
        // COLUNAS DE A a D
        formData.append("dataHora", apostaCompleta.dataHora); 
        formData.append("protocolo", apostaCompleta.protocolo); 
        formData.append("nome", apostaCompleta.nome); 
        formData.append("telefone", (apostaCompleta.telefone || "").replace(/\D/g, "")); 
        
        // COLUNAS DE E a I (JOGOS) - AQUI ESTÁ A MUDANÇA
        apostaCompleta.jogos.forEach((jogo, i) => {
            // Alterado de .join(',') para .join(' ') para usar espaço como delimitador
            const jogoFormatado = jogo.sort((a, b) => a - b).map(n => n.toString().padStart(2, '0')).join(' '); 
            formData.append(`jogo${i + 1}`, jogoFormatado); // jogo1 (E) ... jogo5 (I)
        });

        // COLUNAS J e K
        formData.append("status", apostaCompleta.status); // J - Status
        formData.append("dataPago", "-"); // K - DataPago (Inicialmente com traço)
        
        const response = await fetch(SCRIPT_URL, { 
            method: "POST", 
            body: formData 
        });
        
        const texto = await response.text();

        if (texto && texto.toLowerCase().includes("sucesso")) {
            
            // Limpa o localStorage e salva o último protocolo/aposta
            localStorage.setItem("lastAposta", JSON.stringify(apostaCompleta));
            localStorage.removeItem("dadosBolao");
            
            mensagem.style.color = 'green';
            mensagem.textContent = `Aposta confirmada! Redirecionando para o comprovante...`;

            // Redireciona para o comprovante
            setTimeout(() => {
                window.location.href = `comprovante.html?protocolo=${apostaCompleta.protocolo}`; 
            }, 1500);

        } else {
            mensagem.textContent = `Erro ao enviar. Resposta do servidor: ${texto}`;
            mensagem.style.color = "red";
            btnConfirmar.disabled = false;
            document.getElementById("btnVoltar").disabled = false;
        }
    } catch (err) {
        console.error('Falha na submissão:', err);
        mensagem.textContent = "Falha na conexão com o Apps Script. A aposta não foi registrada.";
        mensagem.style.color = "red";
        btnConfirmar.disabled = false;
        document.getElementById("btnVoltar").disabled = false;
    }
});

function gerarProtocoloUnico() {
    const date = new Date();
    const pad2 = (n) => n.toString().padStart(2, '0');

    const ano = date.getFullYear();
    const mes = pad2(date.getMonth() + 1);
    const dia = pad2(date.getDate());
    const hora = pad2(date.getHours());
    const minuto = pad2(date.getMinutes());
    const segundo = pad2(date.getSeconds());
    
    const timestampPart = `${ano}${mes}${dia}${hora}${minuto}${segundo}`;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    
    const char1 = chars.charAt(Math.floor(Math.random() * chars.length));
    const char2 = chars.charAt(Math.floor(Math.random() * chars.length));
    const num1 = nums.charAt(Math.floor(Math.random() * 10));
    const num2 = nums.charAt(Math.floor(Math.random() * 10));
    const char3 = chars.charAt(Math.floor(Math.random() * chars.length));
    const num3 = nums.charAt(Math.floor(Math.random() * 10));
    
    const codePart = `${char1}${char2}${num1}${num2}${char3}${num3}`;

    return `${timestampPart}-${codePart}`; 
}