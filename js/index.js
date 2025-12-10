document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const containerJogos = document.getElementById('container-jogos');
    const displaysJogos = document.querySelectorAll('.jogo-display');
    const limparJogoBtn = document.getElementById('limpar-jogo-btn');
    const preencherAleatoriamenteBtn = document.getElementById('preencher-aleatoriamente-btn');
    const proximoJogoBtn = document.getElementById('proximo-jogo-btn');
    const confirmarApostaBtn = document.getElementById('confirmar-aposta-btn');
    const copiarPixBtn = document.getElementById('copiar-pix-btn');
    const chavePixDisplay = document.getElementById('chave-pix-display');
    
    // Constantes e Variáveis de Estado
    const CHAVE_PIX_SIMULADA = "88f77025-40bc-4364-9b64-02ad88443cc4"; // CHAVE PIX ATUALIZADA
    const MAX_NUMEROS_JOGO = 6;
    const TOTAL_JOGOS = 5;

    // Estrutura de dados para armazenar os jogos.
    let jogosSelecionados = [
        [], // Jogo 1
        [], // Jogo 2
        [], // Jogo 3
        [], // Jogo 4
        []  // Jogo 5
    ];
    let jogoAtivoIndex = 0; // Começa no Jogo 1 (índice 0)

    // 1. Funções de Controle de Estado e Visualização

    function getJogoAtivo() {
        return displaysJogos[jogoAtivoIndex];
    }

    function atualizarDisplayJogo(jogoIndex) {
        const jogo = jogosSelecionados[jogoIndex];
        const display = displaysJogos[jogoIndex];
        const numerosDisplay = display.querySelector('.numeros-selecionados-display');

        const totalSelecionado = jogo.length;
        // Ordena e exibe os números, com reticências se houver muitos
        const numerosFormatados = jogo.sort((a, b) => a - b).map(n => n.toString().padStart(2, '0')).join(', ');
        numerosDisplay.textContent = totalSelecionado > 0 ? numerosFormatados : '...';

        // Atualiza status visual (Cinza, Amarelo, Verde)
        if (totalSelecionado === 0) {
            display.dataset.status = 'vazio';
        } else if (totalSelecionado < MAX_NUMEROS_JOGO) {
            display.dataset.status = 'incompleto';
        } else {
            display.dataset.status = 'completo';
        }

        // Habilita o botão Próximo Jogo se o jogo atual estiver completo
        if (jogoIndex === jogoAtivoIndex) {
            proximoJogoBtn.disabled = (totalSelecionado < MAX_NUMEROS_JOGO);
        }
    }

    function atualizarEstadoVisualGeral() {
        // 1. Atualiza a visibilidade do botão Confirmar Aposta
        const todosCompletos = jogosSelecionados.every(jogo => jogo.length === MAX_NUMEROS_JOGO);
        if (todosCompletos) {
            confirmarApostaBtn.style.display = 'inline-block';
            proximoJogoBtn.style.display = 'none'; // Esconde 'Próximo' se todos estiverem completos
        } else {
            confirmarApostaBtn.style.display = 'none';
            // Garante que o botão 'Próximo Jogo' só apareça se não for o último jogo
            if (jogoAtivoIndex < TOTAL_JOGOS - 1) {
                 proximoJogoBtn.style.display = 'inline-block';
            } else {
                 // Se for o Jogo 5 e estiver incompleto, ele não deve ter 'Próximo'
                 proximoJogoBtn.style.display = 'none'; 
            }
        }

        // 2. Atualiza os botões de números para refletir a seleção do JOGO ATIVO
        document.querySelectorAll('.numero-btn').forEach(btn => {
            const num = parseInt(btn.dataset.numero);
            
            // Remove a classe 'selecionado' de todos
            btn.classList.remove('selecionado');
            
            // Verifica se o número está no JOGO ATIVO
            if (jogosSelecionados[jogoAtivoIndex].includes(num)) {
                btn.classList.add('selecionado');
            }
        });
        
        // 3. Garante que todos os displays reflitam seus estados
        displaysJogos.forEach((_, index) => atualizarDisplayJogo(index));
    }

    // 2. Lógica de Seleção de Números
    
    function toggleNumero(btn, numero) {
        const jogoAtual = jogosSelecionados[jogoAtivoIndex];
        const num = parseInt(numero);

        if (jogoAtual.includes(num)) {
            // Desselecionar
            jogosSelecionados[jogoAtivoIndex] = jogoAtual.filter(n => n !== num);
        } else if (jogoAtual.length < MAX_NUMEROS_JOGO) {
            // Selecionar
            jogoAtual.push(num);
        } else {
            alert(`O Jogo ${jogoAtivoIndex + 1} já está completo com ${MAX_NUMEROS_JOGO} números.`);
            return;
        }

        atualizarEstadoVisualGeral();
    }

    // 3. Navegação entre Jogos
    
    function selecionarJogo(index) {
        if (index < 0 || index >= TOTAL_JOGOS) return;

        // Desativa a seleção visual do jogo anterior
        if (getJogoAtivo()) {
            getJogoAtivo().classList.remove('ativo');
        }
        
        jogoAtivoIndex = index;
        
        // Ativa a seleção visual do novo jogo
        getJogoAtivo().classList.add('ativo');

        // Atualiza o estado visual para mostrar os números selecionados do novo jogo
        atualizarEstadoVisualGeral();
    }

    function avancarProximoJogo() {
        // Só avança se não for o último jogo
        if (jogoAtivoIndex < TOTAL_JOGOS - 1) {
            selecionarJogo(jogoAtivoIndex + 1);
        }
    }

    // 4. Implementação dos Botões de Controle

    // A. Limpar Jogo
    limparJogoBtn.addEventListener('click', () => {
        if (confirm(`Tem certeza que deseja limpar os números do Jogo ${jogoAtivoIndex + 1}?`)) {
            jogosSelecionados[jogoAtivoIndex] = [];
            atualizarEstadoVisualGeral();
        }
    });

    // B. Preencher Aleatoriamente
    preencherAleatoriamenteBtn.addEventListener('click', () => {
        const jogoAtual = jogosSelecionados[jogoAtivoIndex];
        
        let numerosParaCompletar = MAX_NUMEROS_JOGO - jogoAtual.length;
        
        if (numerosParaCompletar <= 0) {
            alert(`O Jogo ${jogoAtivoIndex + 1} já está completo.`);
            return;
        }

        // Novo comportamento: permite repetição de números já em OUTROS jogos.
        const poolSorteioTotal = Array.from({length: 60}, (_, i) => i + 1);

        // Apenas números que AINDA NÃO ESTÃO no JOGO ATIVO
        let poolParaSorteio = poolSorteioTotal.filter(n => !jogoAtual.includes(n));

        if (numerosParaCompletar > poolParaSorteio.length) {
            alert("Erro na lógica de preenchimento. Não há números suficientes disponíveis (1-60) para completar este jogo.");
            return;
        }

        let numerosSorteados = [];
        
        // Sorteia os números restantes
        for (let i = 0; i < numerosParaCompletar; i++) {
            const randomIndex = Math.floor(Math.random() * poolParaSorteio.length);
            const numeroSorteado = poolParaSorteio.splice(randomIndex, 1)[0]; 
            numerosSorteados.push(numeroSorteado);
        }
        
        jogoAtual.push(...numerosSorteados);

        // --- NOVA VALIDAÇÃO (Única Restrição do Usuário) ---
        // Checa se o conjunto final de 6 números é idêntico a outro jogo completo.
        if (jogoAtual.length === MAX_NUMEROS_JOGO) {
            // Ordena e formata o jogo atual para comparação
            const currentSortedGame = [...jogoAtual].sort((a, b) => a - b).join(',');

            for (let i = 0; i < TOTAL_JOGOS; i++) {
                // Checa APENAS outros jogos que também estão completos (6 números)
                if (i !== jogoAtivoIndex && jogosSelecionados[i].length === MAX_NUMEROS_JOGO) {
                    const otherSortedGame = [...jogosSelecionados[i]].sort((a, b) => a - b).join(',');
                    
                    if (currentSortedGame === otherSortedGame) {
                        // Se for duplicado, reverte a adição dos números sorteados
                        jogoAtual.splice(jogoAtual.length - numerosSorteados.length, numerosSorteados.length); 
                        alert("O conjunto de 6 números gerado é idêntico a um jogo já preenchido em seu bolão. Por favor, tente novamente (clique no botão de novo) ou escolha manualmente.");
                        atualizarEstadoVisualGeral();
                        return;
                    }
                }
            }
        }
        // ----------------------------------------------------

        atualizarEstadoVisualGeral();
    });

    // C. Próximo Jogo
    proximoJogoBtn.addEventListener('click', avancarProximoJogo);

    // D. Seleção via Display
    displaysJogos.forEach((display, index) => {
        display.addEventListener('click', () => selecionarJogo(index));
    });

    // 5. Inicialização e Geração dos Botões
    
    // Geração dos botões de 1 a 60
    for (let i = 1; i <= 60; i++) {
        const numeroBtn = document.createElement('div');
        numeroBtn.className = 'numero-btn';
        numeroBtn.textContent = i.toString().padStart(2, '0');
        numeroBtn.dataset.numero = i;
        numeroBtn.addEventListener('click', () => toggleNumero(numeroBtn, i));
        containerJogos.appendChild(numeroBtn);
    }
    
    // Configuração da Chave PIX (Atualizada)
    chavePixDisplay.textContent = CHAVE_PIX_SIMULADA;
    copiarPixBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(CHAVE_PIX_SIMULADA).then(() => {
            copiarPixBtn.textContent = 'Copiado!';
            setTimeout(() => {
                copiarPixBtn.textContent = 'Copiar Chave';
            }, 1500);
        });
    });

    // 6. Botão Confirmar Aposta
    confirmarApostaBtn.addEventListener('click', (e) => {
        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value;

        if (!nome || !telefone) {
            alert('Por favor, preencha seu Nome e Telefone antes de confirmar.');
            return;
        }

        const todosCompletos = jogosSelecionados.every(jogo => jogo.length === MAX_NUMEROS_JOGO);
        if (!todosCompletos) {
            alert('Você deve preencher todos os 5 jogos com 6 números antes de confirmar.');
            return;
        }
        
        // Estrutura os dados
        const dadosAposta = {
            nome: nome,
            telefone: telefone,
            chavePix: CHAVE_PIX_SIMULADA,
            jogos: jogosSelecionados
        };

        // Salva os dados no LocalStorage
        localStorage.setItem('dadosBolao', JSON.stringify(dadosAposta));

        // Redireciona para a página de Confirmação
        window.location.href = 'confirmacao.html';
    });

    // Inicialização da interface
    selecionarJogo(0); // Garante que o Jogo 1 está ativo e a tela correta.
});