document.addEventListener('DOMContentLoaded', () => {

    // ================================
    // REFERÊNCIAS DO DOM
    // ================================
    const containerJogos = document.getElementById('container-jogos');
    const displaysJogos = document.querySelectorAll('.jogo-display');

    const limparJogoBtn = document.getElementById('limpar-jogo-btn');
    const preencherAleatoriamenteBtn = document.getElementById('preencher-aleatoriamente-btn');
    const proximoJogoBtn = document.getElementById('proximo-jogo-btn');
    const confirmarApostaBtn = document.getElementById('confirmar-aposta-btn');

    const copiarPixBtn = document.getElementById('copiar-pix-btn');
    const chavePixDisplay = document.getElementById('chave-pix-display');

    // ================================
    // CONSTANTES / ESTADO
    // ================================
    const CHAVE_PIX = "88f77025-40bc-4364-9b64-02ad88443cc4";
    const MAX_NUMEROS = 6;
    const TOTAL_JOGOS = 5;

    let jogos = [[], [], [], [], []];
    let jogoAtivo = 0;

    // ================================
    // FUNÇÕES VISUAIS
    // ================================

    function atualizarDisplay(jogoIndex) {
        const jogo = jogos[jogoIndex];
        const display = displaysJogos[jogoIndex];

        if (jogo.length === 0) display.dataset.status = "vazio";
        else if (jogo.length < MAX_NUMEROS) display.dataset.status = "incompleto";
        else display.dataset.status = "completo";
    }

    function atualizarInterface() {

        // Atualiza displays
        displaysJogos.forEach((_, i) => atualizarDisplay(i));

        // Botão "Próximo"
        if (jogos[jogoAtivo].length === MAX_NUMEROS && jogoAtivo < TOTAL_JOGOS - 1) {
            proximoJogoBtn.disabled = false;
            proximoJogoBtn.style.display = "inline-block";
        } else {
            proximoJogoBtn.disabled = true;
            proximoJogoBtn.style.display = (jogoAtivo < TOTAL_JOGOS - 1) ? "inline-block" : "none";
        }

        // Botão "Confirmar"
        const completos = jogos.every(j => j.length === MAX_NUMEROS);
        confirmarApostaBtn.style.display = completos ? "inline-block" : "none";

        // Atualiza botões numéricos
        document.querySelectorAll('.numero-btn').forEach(btn => {
            const num = parseInt(btn.dataset.numero);
            btn.classList.toggle('selecionado', jogos[jogoAtivo].includes(num));
        });
    }

    // ================================
    // LÓGICA DE JOGOS
    // ================================

    function selecionarJogo(index) {
        displaysJogos[jogoAtivo].classList.remove('ativo');
        jogoAtivo = index;
        displaysJogos[jogoAtivo].classList.add('ativo');
        atualizarInterface();
    }

    function toggleNumero(num) {
        const jogo = jogos[jogoAtivo];

        if (jogo.includes(num)) {
            jogos[jogoAtivo] = jogo.filter(n => n !== num);
        } else {
            if (jogo.length >= MAX_NUMEROS) {
                alert(`O Jogo ${jogoAtivo + 1} já está completo.`);
                return;
            }
            jogo.push(num);
        }

        atualizarInterface();
    }

    function preencherAleatorio() {
        const jogo = jogos[jogoAtivo];
        const faltando = MAX_NUMEROS - jogo.length;
        if (faltando <= 0) {
            alert(`O Jogo ${jogoAtivo + 1} já está completo.`);
            return;
        }

        const pool = Array.from({ length: 60 }, (_, i) => i + 1)
            .filter(n => !jogo.includes(n));

        let novos = [];

        for (let i = 0; i < faltando; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            novos.push(pool.splice(idx, 1)[0]);
        }

        jogo.push(...novos);

        // Evita jogo repetido
        if (jogo.length === MAX_NUMEROS) {
            const sortedAtual = [...jogo].sort((a, b) => a - b).join(',');
            for (let i = 0; i < TOTAL_JOGOS; i++) {
                if (i !== jogoAtivo && jogos[i].length === MAX_NUMEROS) {
                    const sortedOutro = [...jogos[i]].sort((a, b) => a - b).join(',');
                    if (sortedAtual === sortedOutro) {
                        jogo.splice(jogo.length - novos.length, novos.length);
                        alert("Esse conjunto já existe em outro dos seus jogos. Tente novamente.");
                        atualizarInterface();
                        return;
                    }
                }
            }
        }

        atualizarInterface();
    }

    // ================================
    // EVENTOS
    // ================================

    // Displays
    displaysJogos.forEach((display, i) => {
        display.addEventListener('click', () => selecionarJogo(i));
    });

    // Botão: Limpar
    limparJogoBtn.addEventListener('click', () => {
        if (confirm(`Limpar os números do Jogo ${jogoAtivo + 1}?`)) {
            jogos[jogoAtivo] = [];
            atualizarInterface();
        }
    });

    // Botão: Aleatório
    preencherAleatoriamenteBtn.addEventListener('click', preencherAleatorio);

    // Botão: Próximo
    proximoJogoBtn.addEventListener('click', () => {
        if (jogoAtivo < TOTAL_JOGOS - 1) selecionarJogo(jogoAtivo + 1);
    });

    // Botão: Confirmar Aposta
    confirmarApostaBtn.addEventListener('click', () => {
        const nome = document.getElementById('nome').value.trim();
        const telefone = document.getElementById('telefone').value.trim();

        if (!nome || !telefone) {
            alert("Preencha seu Nome e Telefone.");
            return;
        }

        if (!jogos.every(j => j.length === MAX_NUMEROS)) {
            alert("Preencha os 5 jogos completos.");
            return;
        }

        const dados = {
            nome,
            telefone,
            chavePix: CHAVE_PIX,
            jogos
        };

        localStorage.setItem('dadosBolao', JSON.stringify(dados));
        window.location.href = "confirmacao.html";
    });

    // Botões 1–60
    for (let i = 1; i <= 60; i++) {
        const btn = document.createElement('div');
        btn.className = "numero-btn";
        btn.dataset.numero = i;
        btn.textContent = i.toString().padStart(2, '0');
        btn.addEventListener('click', () => toggleNumero(i));
        containerJogos.appendChild(btn);
    }

    // PIX
    chavePixDisplay.textContent = CHAVE_PIX;

    copiarPixBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(CHAVE_PIX).then(() => {
            copiarPixBtn.textContent = "Copiado!";
            setTimeout(() => copiarPixBtn.textContent = "Copiar Chave", 1500);
        });
    });

    // Inicializar
    selecionarJogo(0);

});
