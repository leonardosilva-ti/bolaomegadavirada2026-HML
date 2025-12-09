// /js/script.js - Lógica da Página Principal (FINAL) adaptado para API REST
// Substitua pela URL do seu WebApp deploy
const WEBAPP_URL = "__WEBAPP_URL__";

const NUMEROS_TOTAL = 60;
const JOGOS_MAXIMO = 5;
const NUMEROS_POR_JOGO = 6;

// Variável para armazenar o estado atual dos jogos
let aposta = {
    nome: "",
    telefone: "",
    jogos: new Array(JOGOS_MAXIMO).fill("") // Array para armazenar as strings de números
};

let jogoAtual = 0; // Começa no Jogo 1

// Elementos do DOM
const nomeInput = document.getElementById("nome");
const telefoneInput = document.getElementById("telefone");
//const tituloJogo = document.getElementById("titulo-jogo");
const numerosContainer = document.getElementById("numerosContainer");
const statusJogosContainer = document.getElementById("statusJogosContainer");
const btnAnterior = document.getElementById("btnAnterior");
const btnProximo = document.getElementById("btnProximo");
const gerarAleatorios = document.getElementById("gerarAleatorios");
const cadastroForm = document.getElementById("cadastroForm");
const mensagem = document.getElementById("mensagem");

// helper REST
async function postPath(path, body = {}) {
  const url = `${WEBAPP_URL}?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  return res.json();
}

// --- FUNÇÕES DE LÓGICA ---

function renderNumeroButtons() {
    numerosContainer.innerHTML = "";
    for (let i = 1; i <= NUMEROS_TOTAL; i++) {
        const num = String(i).padStart(2, '0');
        const button = document.createElement("button");
        button.textContent = num;
        button.value = num;
        button.onclick = () => toggleNumero(num, button);

        // Verifica se o número já foi selecionado no jogo atual
        const jogoSelecionado = aposta.jogos[jogoAtual].split(' ');
        if (jogoSelecionado.includes(num)) {
            button.classList.add("selected");
        }
        numerosContainer.appendChild(button);
    }
    updateControles();
}

function toggleNumero(num, button) {
    let jogoSelecionado = aposta.jogos[jogoAtual].split(' ').filter(n => n !== "");
    
    if (button.classList.contains("selected")) {
        // Desselecionar
        button.classList.remove("selected");
        jogoSelecionado = jogoSelecionado.filter(n => n !== num);
    } else {
        // Selecionar (apenas se houver espaço)
        if (jogoSelecionado.length < NUMEROS_POR_JOGO) {
            button.classList.add("selected");
            jogoSelecionado.push(num);
        } else {
            alert(`Você só pode selecionar ${NUMEROS_POR_JOGO} números por jogo.`);
        }
    }
    
    // Atualiza o estado da aposta
    aposta.jogos[jogoAtual] = jogoSelecionado.sort().join(' ');
    
    // persiste parcialmente
    salvarLocalStorageParcial();

    updateControles();
    renderStatusJogos();
}

function updateControles() {
  const numerosSelecionados = aposta.jogos[jogoAtual].split(' ').filter(n => n !== "").length;

  // Navegação
  if (btnAnterior) btnAnterior.disabled = jogoAtual === 0;

  // Estado dos botões
  const todosCompletos = aposta.jogos.every(j => j.split(' ').filter(n => n !== "").length === NUMEROS_POR_JOGO);

  if (btnProximo) {
    if (jogoAtual < JOGOS_MAXIMO - 1 && numerosSelecionados === NUMEROS_POR_JOGO) {
      btnProximo.disabled = false;
      btnProximo.classList.remove("muted");
      btnProximo.classList.add("primary");
      btnProximo.textContent = "Próximo Jogo";
    } else if (jogoAtual === JOGOS_MAXIMO - 1 && todosCompletos) {
      btnProximo.disabled = false;
      btnProximo.classList.remove("muted");
      btnProximo.classList.add("primary");
      btnProximo.textContent = "Confirmar Aposta";
    } else {
      btnProximo.disabled = (jogoAtual < JOGOS_MAXIMO - 1 && numerosSelecionados < NUMEROS_POR_JOGO);
      btnProximo.classList.remove("primary");
      btnProximo.classList.add("muted");
      btnProximo.textContent = (jogoAtual === JOGOS_MAXIMO - 1) ? "Confirmar Aposta" : "Próximo Jogo";
    }
  }
}


function renderStatusJogos() {
    statusJogosContainer.innerHTML = "";
    for (let i = 0; i < JOGOS_MAXIMO; i++) {
        const btn = document.createElement("button");
        btn.className = "status-jogo-btn";
        btn.textContent = `Jogo ${i + 1}`;
        btn.onclick = () => navegarJogo(i);
        
        const numeros = aposta.jogos[i].split(' ').filter(n => n !== "").length;
        
        // Adicionar classe 'ativo' e 'preenchido'
        if (i === jogoAtual) {
            btn.classList.add("ativo"); // Destaca o jogo atual
        } else {
            btn.classList.remove("ativo");
        }
        
        if (numeros === NUMEROS_POR_JOGO) {
            btn.classList.add("preenchido"); // Fica verde
        } else {
            btn.classList.remove("preenchido");
        }
        
        statusJogosContainer.appendChild(btn);
    }
}

function navegarJogo(novoJogo) {
    // 1. Validações antes de mudar de jogo
    const numerosAnterior = aposta.jogos[jogoAtual].split(' ').filter(n => n !== "").length;

    if (numerosAnterior > 0 && numerosAnterior < NUMEROS_POR_JOGO) {
        if (!confirm(`O Jogo ${jogoAtual + 1} tem apenas ${numerosAnterior} números. Deseja prosseguir?`)) {
            return;
        }
    }
    
    jogoAtual = novoJogo;
    renderNumeroButtons();
    renderStatusJogos();
    updateControles();
}

function preencherAleatoriamente() {
    let jogoSelecionado = aposta.jogos[jogoAtual].split(' ').filter(n => n !== "");
    let numerosFaltantes = NUMEROS_POR_JOGO - jogoSelecionado.length;
    
    if (numerosFaltantes <= 0) {
        alert("Este jogo já está completo.");
        return;
    }

    const todosNumeros = Array.from({ length: NUMEROS_TOTAL }, (_, i) => String(i + 1).padStart(2, '0'));
    const disponiveis = todosNumeros.filter(n => !jogoSelecionado.includes(n));

    // Seleciona aleatoriamente os números faltantes
    for (let i = 0; i < numerosFaltantes; i++) {
        if (disponiveis.length === 0) break;
        const indiceAleatorio = Math.floor(Math.random() * disponiveis.length);
        jogoSelecionado.push(disponiveis.splice(indiceAleatorio, 1)[0]);
    }

    // Atualiza e renderiza
    aposta.jogos[jogoAtual] = jogoSelecionado.sort().join(' ');
    salvarLocalStorageParcial();
    renderNumeroButtons();
    renderStatusJogos();
}

// --- FLUXO PRINCIPAL ---

function carregarDadosSalvos() {
    const apostaSalva = localStorage.getItem("pendingAposta");
    if (apostaSalva) {
        try {
          const parsed = JSON.parse(apostaSalva);
          // Mescla apenas campos esperados para evitar sobrescrever estrutura
          aposta.nome = parsed.nome || aposta.nome;
          aposta.telefone = parsed.telefone || aposta.telefone;
          aposta.jogos = (Array.isArray(parsed.jogos) && parsed.jogos.length === JOGOS_MAXIMO) ? parsed.jogos : aposta.jogos;
        } catch (e) {
          // se estiver inválido, ignora
        }
        if (nomeInput) nomeInput.value = aposta.nome || "";
        if (telefoneInput) telefoneInput.value = aposta.telefone || "";
    }
}

function validarDadosPessoais() {
    // Apenas checa Nome e Telefone
    if (!nomeInput.value.trim() || !telefoneInput.value.trim()) { 
        mensagem.textContent = "Preencha todos os dados pessoais (Nome e Telefone).";
        mensagem.style.color = "red";
        return false;
    }
    aposta.nome = nomeInput.value.trim();
    aposta.telefone = telefoneInput.value.trim();
    mensagem.textContent = "";
    return true;
}

function validarJogosCompletos() {
    const jogosIncompletos = aposta.jogos.filter(j => j.split(' ').filter(n => n !== "").length !== NUMEROS_POR_JOGO);
    return jogosIncompletos.length === 0;
}

function salvarLocalStorageParcial() {
  try {
    // salva só o que precisa para resgatar sequência (sem protocolo ainda)
    localStorage.setItem("pendingAposta", JSON.stringify(aposta));
  } catch(e) {
    console.warn("Falha ao salvar localStorage:", e);
  }
}

/**
 * Salva no backend via API REST:
 * - registra participante (se necessário) -> retorna protocolo
 * - salva jogos no backend
 * Depois redireciona para confirmacao.html?protocolo=...
 */
async function salvarERedirecionar() {
    if (!validarDadosPessoais()) return;
    if (!validarJogosCompletos()) {
        mensagem.textContent = `Preencha todos os ${JOGOS_MAXIMO} jogos com ${NUMEROS_POR_JOGO} números antes de continuar.`;
        mensagem.style.color = "red";
        return;
    }

    // desabilita botão para evitar duplo clique
    if (btnProximo) {
      btnProximo.disabled = true;
      btnProximo.textContent = "Enviando...";
    }

    try {
      // 1) Registrar participante no backend (backend gera protocolo)
      const reg = await postPath("index/registrarParticipante", {
        nome: aposta.nome,
        telefone: aposta.telefone
      });

      if (!reg || !reg.success) {
        throw new Error(reg && reg.error ? reg.error : "Erro ao registrar participante");
      }

      const protocolo = reg.protocolo;

      // 2) Preparar jogos (garantir formato "01 02 03 ...")
      const jogosParaSalvar = aposta.jogos.map(j => {
        // normaliza espaços e padding
        return j
          .split(/\s+/)
          .filter(Boolean)
          .map(n => String(Number(n)).padStart(2, '0'))
          .join(' ');
      });

      // 3) Enviar jogos
      const save = await postPath("index/salvarJogos", {
        protocolo,
        jogos: jogosParaSalvar
      });

      if (!save || !save.success) {
        throw new Error(save && save.error ? save.error : "Erro ao salvar jogos");
      }

      // 4) Atualiza localStorage com protocolo (para confirmacao/comprovante)
      const apostaSalva = {
        ...aposta,
        protocolo
      };
      localStorage.setItem("pendingAposta", JSON.stringify(apostaSalva));

      // redireciona para confirmação com protocolo na querystring
      window.location.href = `confirmacao.html?protocolo=${encodeURIComponent(protocolo)}`;

    } catch (err) {
      console.error("Erro ao salvar aposta:", err);
      mensagem.textContent = `Erro ao salvar aposta: ${err.message || err}`;
      mensagem.style.color = "red";
      // reativa botão
    } finally {
      if (btnProximo) {
        btnProximo.disabled = false;
        updateControles();
      }
    }
}

// --- EVENT LISTENERS ---

// Inicialização dos dados e renderização da grade
document.addEventListener("DOMContentLoaded", () => {
    carregarDadosSalvos();
    renderStatusJogos();
    renderNumeroButtons(); // Inicia a exibição da grade de números
});

// Navegação
btnAnterior?.addEventListener("click", () => navegarJogo(jogoAtual - 1));
btnProximo?.addEventListener("click", () => {
    if (jogoAtual < JOGOS_MAXIMO - 1) {
        navegarJogo(jogoAtual + 1);
    } else {
        salvarERedirecionar();
    }
});

// Preencher Aleatoriamente
gerarAleatorios?.addEventListener("click", preencherAleatoriamente);

// Salva os dados do formulário no objeto aposta em cada mudança (para persistência)
const inputs = [nomeInput, telefoneInput]; 
inputs.forEach(input => {
    if (!input) return;
    input.addEventListener("change", () => {
        aposta.nome = nomeInput.value;
        aposta.telefone = telefoneInput.value;
        localStorage.setItem("pendingAposta", JSON.stringify(aposta));
    });
});

// Botão copiar PIX (preservado)
const btnCopiarPixEl = document.getElementById("btnCopiarPix");
if (btnCopiarPixEl) {
  btnCopiarPixEl.addEventListener("click", function() {
    const chaveEl = document.getElementById("pix-chave");
    if (!chaveEl) return;
    const chave = chaveEl.textContent.trim();
    navigator.clipboard.writeText(chave).then(() => {
      const btn = btnCopiarPixEl;
      btn.textContent = "Copiado!";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = "Copiar";
        btn.disabled = false;
      }, 2000);
    }).catch(err => {
      console.warn("Erro ao copiar PIX:", err);
      alert("Não foi possível copiar a chave PIX.");
    });
  });
}
