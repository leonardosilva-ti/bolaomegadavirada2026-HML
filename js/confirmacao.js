// ===============================================
// ARQUIVO: js/confirmacao.js — Versão Revisada
// ===============================================

// URL de implantação do Apps Script
const SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbzavXeNlDzPh_hGnoWM7AKv5ecp4WHJdHd-ILwWQ2j-O59GNHLoBwYMrkZyRQrNSmSK/exec';

// Recupera dados armazenados
const aposta = JSON.parse(localStorage.getItem("dadosBolao"));

// Elementos do DOM
const dadosDiv = document.getElementById("dadosConfirmacao");
const jogosDiv = document.getElementById("jogosConfirmacao");
const mensagem = document.getElementById("mensagem");
const termosCheckbox = document.getElementById("aceitoTermos");
const btnConfirmar = document.getElementById("btnConfirmar");
const btnVoltar = document.getElementById("btnVoltar");

// --------------------------------------------
// Utilidades
// --------------------------------------------

/**
 * Formata telefone para (DD) 9XXXX-XXXX.
 */
const formatarTelefone = (telefone) => {
    if (!telefone) return 'Não Informado';
    const digitos = telefone.replace(/\D/g, "");
    return digitos.length === 11
        ? `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
        : digitos;
};

/**
 * Gera protocolo único baseado em timestamp + código aleatório.
 */
const gerarProtocoloUnico = () => {
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const rnd = (set) => set[Math.floor(Math.random() * set.length)];
    const codigo = `${rnd(chars)}${rnd(chars)}${rnd(nums)}${rnd(nums)}${rnd(chars)}${rnd(nums)}`;
    return `${timestamp}-${codigo}`;
};

// --------------------------------------------
// Validação inicial
// --------------------------------------------
if (!aposta || !Array.isArray(aposta.jogos) || aposta.jogos.length !== 5) {
    dadosDiv.innerHTML = `<p style="color:red">Nenhuma aposta válida encontrada. Retorne à página principal.</p>`;
    btnConfirmar.disabled = true;
} else {

    // --------------------------------------------
    // Exibir Dados
    // --------------------------------------------
    dadosDiv.innerHTML = `
        <h3>Seus Dados</h3>
        <p><b>Nome Completo:</b> ${aposta.nome || 'Não Informado'}</p>
        <p><b>Telefone (WhatsApp):</b> ${formatarTelefone(aposta.telefone)}</p>
    `;

    // --------------------------------------------
    // Exibir Jogos
    // --------------------------------------------
    jogosDiv.innerHTML = `
        <h3>Jogos Selecionados (5)</h3>
        ${aposta.jogos.map((jogo, i) => {
            const numeros = jogo
                .slice()
                .sort((a, b) => a - b)
                .map(n => `<span class="bolinha">${String(n).padStart(2, '0')}</span>`)
                .join("");

            return `
                <div class="jogo-item-confirmacao">
                    <p><b>Jogo ${i + 1}:</b></p>
                    <div class="numeros-bolinhas-container">${numeros}</div>
                </div>
            `;
        }).join("")}
    `;
}


// --------------------------------------------
// Eventos
// --------------------------------------------

termosCheckbox.addEventListener("change", () => {
    btnConfirmar.disabled = !termosCheckbox.checked;
});

btnVoltar.addEventListener("click", () => {
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
    btnVoltar.disabled = true;

    const apostaCompleta = {
        ...aposta,
        dataHora: new Date().toLocaleString("pt-BR"),
        protocolo: gerarProtocoloUnico(),
        status: "AGUARDANDO PAGAMENTO"
    };

    try {
        const formData = new FormData();

        formData.append("action", "registrarAposta");
        formData.append("dataHora", apostaCompleta.dataHora);
        formData.append("protocolo", apostaCompleta.protocolo);
        formData.append("nome", apostaCompleta.nome);
        formData.append("telefone", (apostaCompleta.telefone || "").replace(/\D/g, ""));

        // Jogos (E → I)
        apostaCompleta.jogos.forEach((jogo, idx) => {
            const numeros = jogo
                .slice()
                .sort((a, b) => a - b)
                .map(n => String(n).padStart(2, "0"))
                .join(" ");
            formData.append(`jogo${idx + 1}`, numeros);
        });

        // Status e DataPago
        formData.append("status", apostaCompleta.status);
        formData.append("dataPago", "-");

        // Envio
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: formData,
        });

        const resultText = await response.text();

        if (resultText.toLowerCase().includes("sucesso")) {

            // Salva a última aposta e limpa a corrente
            localStorage.setItem("lastAposta", JSON.stringify(apostaCompleta));
            localStorage.removeItem("dadosBolao");

            mensagem.style.color = "green";
            mensagem.textContent = "Aposta confirmada! Redirecionando para o comprovante...";

            setTimeout(() => {
                window.location.href = `comprovante.html?protocolo=${apostaCompleta.protocolo}`;
            }, 1500);

        } else {
            mensagem.textContent = `Erro ao enviar. Resposta do servidor: ${resultText}`;
            mensagem.style.color = "red";
            btnConfirmar.disabled = false;
            btnVoltar.disabled = false;
        }

    } catch (err) {
        console.error("Erro:", err);
        mensagem.textContent = "Falha na conexão com o servidor. A aposta não foi registrada.";
        mensagem.style.color = "red";
        btnConfirmar.disabled = false;
        btnVoltar.disabled = false;
    }
});
