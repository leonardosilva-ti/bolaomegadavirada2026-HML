// === /js/admin.js - ADMIN COMPLETO (COM PAGINAÇÃO) ===
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuX4NxUodwTALVVsFMvDHFhrgV-tR4MBTZA_xdJd2rXLg5qIj1CSg3yXghM66JpWSm/exec";

const el = id => document.getElementById(id);

// ==== ELEMENTOS HTML ====
const loginArea = el("loginArea");
const adminArea = el("adminArea");
const loginMsg = el("loginMsg");

const listaParticipantes = el("listaParticipantes");
const countParticipantes = el("countParticipantes");
const countJogos = el("countJogos");

// JOGO DA SORTE
const jogoSorteContainer = el("jogoSorteContainer");
const jogoSorteInputs = el("jogoSorteInputs");
const btnSalvarJogoSorte = el("btnSalvarJogoSorte");
const btnApagarJogoSorte = el("btnApagarJogoSorte");

// JOGOS EXCEDENTES
const excedentesContainer = el("excedentesContainer");
const btnAddExcedente = el("btnAddExcedente");
const btnSalvarExcedentes = el("btnSalvarExcedentes");

// CONFERÊNCIA
const conferenciaContainer = el("conferenciaContainer");
const btnConferir = el("btnConferir");
const resultadoConferencia = el("resultadoConferencia");
const areaRateio = el("areaRateio");
const inputValorPremio = el("valorPremio");
const btnCalcular = el("btnCalcularRateio");
const resultado = el("resultadoRateio");

// Pesquisa e Paginação
const inputPesquisa = el("inputPesquisa"); 
const btnAtualizar = el("btnAtualizar");
const btnLogout = el("btnLogout");
const paginationControls = el("paginationControls"); // NOVO ELEMENTO DE PAGINAÇÃO


// ==== VARIÁVEIS GLOBAIS ====
let todosDados = [];
let jogoSorteAtual = [];         
let jogosExcedentes = [];        
let jogosExcedentesEmEdicao = []; 
let accessToken = localStorage.getItem("adminToken") || null;

// VARIÁVEIS DE PAGINAÇÃO
let dadosFiltradosParaPaginacao = []; // Dados que estão sendo exibidos no momento (após a pesquisa)
let currentPage = 1;
const ITEMS_PER_PAGE = 10; // Limite de 10 participantes por página

// ================== FUNÇÃO DE LOG PARA PLANILHA ==================

async function logToSheet(message) {
    if (!accessToken) { return; }

    try {
        const formData = new FormData();
        formData.append("action", "log");
        formData.append("token", accessToken);
        formData.append("message", message);
        
        await fetch(SCRIPT_URL, { method: "POST", body: formData });
    } catch (err) {
        console.error("Erro ao enviar log para a planilha:", err);
    }
}


// ================== LOGIN ==================
el("btnLogin")?.addEventListener("click", async () => {
    const user = el("adminUser").value.trim();
    const pass = el("adminPass").value.trim();
    loginMsg.classList.add("hidden");

    if (!user || !pass) {
        loginMsg.textContent = "Preencha usuário e senha.";
        loginMsg.classList.remove("hidden");
        return;
    }

    try {
        const formData = new FormData();
        formData.append("action", "login");
        formData.append("user", user);
        formData.append("pass", pass);

        const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
        let data;
        try { data = await res.json(); }
        catch (e) { const text = await res.text(); data = { success: false, message: text }; }

        if (data.success && data.token) {
            accessToken = data.token;
            localStorage.setItem("adminToken", accessToken);
            loginArea.classList.add("hidden");
            adminArea.classList.remove("hidden");
            carregarParticipantes();
        } else {
            loginMsg.textContent = data.message || "Usuário ou senha inválidos.";
            loginMsg.classList.remove("hidden");
        }
    } catch (err) {
        loginMsg.textContent = "Erro de conexão com o servidor. Tente novamente.";
        loginMsg.classList.remove("hidden");
        console.error(err);
    }
});

btnLogout?.addEventListener("click", () => {
    adminArea.classList.add("hidden");
    loginArea.classList.remove("hidden");
    el("adminUser").value = "";
    el("adminPass").value = "";
    loginMsg.classList.add("hidden");
    accessToken = null;
    localStorage.removeItem("adminToken");
});

// ================== CARREGAR PARTICIPANTES ==================
async function carregarParticipantes() {
    if (!accessToken) { alert("Erro: Sessão expirada."); btnLogout?.click(); return; }

    listaParticipantes.innerHTML = `<tr><td colspan="4" class="text-center py-4">Carregando...</td></tr>`;
    currentPage = 1;
    inputPesquisa.value = ""; 
    dadosFiltradosParaPaginacao = []; 

    try {
        const formData = new FormData();
        formData.append("action", "getAdminData");
        formData.append("token", accessToken);

        const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
        const data = await res.json();

        if (data.message && data.message.includes("negado")) {
            alert(data.message);
            btnLogout?.click();
            return;
        }

        todosDados = data.participantes || [];
        countParticipantes.textContent = todosDados.length;
        countJogos.textContent = todosDados.reduce((acc,p) => acc + (p.Jogos?.split('|').length||0),0);

        // Define a lista inicial a ser paginada (todos os dados)
        dadosFiltradosParaPaginacao = todosDados;
        renderTabelaPaginada(); 

        // ==== Jogo da Sorte ====
        if (data.jogoDaSorte) {
            jogoSorteAtual = Array.from(new Set(String(data.jogoDaSorte).split(/\s+/).filter(Boolean)))
                .map(n => n.toString().padStart(2,'0'));
        } else {
            jogoSorteAtual = [];
        }
        renderizarJogoSorte();
        renderizarInputsJogoSorte(); 

        // ==== Jogos Excedentes ====
        let rawExcedentes = data.jogosExcedentes || data.jogosAdm || [];
        if (!Array.isArray(rawExcedentes)) rawExcedentes = [];

        // Popula o array de CONFERÊNCIA
        jogosExcedentes = rawExcedentes.map(item => {
            if (Array.isArray(item)) {
                return item.map(n => String(n).padStart(2,'0'));
            }
            if (typeof item === 'string') {
                return item.split(/\s+/).filter(Boolean).map(n => String(n).padStart(2,'0'));
            }
            return [];
        }).filter(arr => arr.length === 6);

        // O array de EDIÇÃO deve ser zerado (começar vazio)
        jogosExcedentesEmEdicao = [];
        renderizarTodosExcedentes();

        // ==== Conferência ====
        renderizarConferencia();
    } catch (err) {
        listaParticipantes.innerHTML = `<tr><td colspan="4" class="text-center text-red-500">Erro ao carregar dados: ${err.message}</td></tr>`;
    }
}

btnAtualizar?.addEventListener("click", carregarParticipantes);

// ================== TABELA PARTICIPANTES (PAGINADA) ==================

/**
 * Renderiza a tabela paginada e os controles de navegação.
 * Usa o array global `dadosFiltradosParaPaginacao`.
 */
function renderTabelaPaginada() {
    const totalItems = dadosFiltradosParaPaginacao.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (currentPage < 1 && totalItems > 0) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    // Obtém apenas os dados da página atual
    const dadosPagina = dadosFiltradosParaPaginacao.slice(startIndex, endIndex);

    if (!dadosPagina.length && totalItems > 0) {
        listaParticipantes.innerHTML = `<tr><td colspan="4" class="text-center py-4">Página vazia.</td></tr>`;
        renderPaginationControls(totalPages);
        return;
    }
    
    if (!dadosPagina.length && totalItems === 0) {
        listaParticipantes.innerHTML = `<tr><td colspan="4" class="text-center py-4">Nenhum participante encontrado.</td></tr>`;
        renderPaginationControls(totalPages);
        return;
    }
    
    // Renderiza o conteúdo da tabela
    listaParticipantes.innerHTML = dadosPagina.map(p => {
        const jogosHtml = p.Jogos ? p.Jogos.split('|').join('<br>') : 'Nenhum jogo cadastrado.';
        
        return `
            <tr data-protocolo="${p.Protocolo}">
                <td class="py-2 px-3 border">
                    <div class="nome-coluna">
                        <strong>${p.Nome}</strong>
                        <button class="muted small btn-toggle-jogos" data-protocolo="${p.Protocolo}">+ Mostrar jogos</button>
                    </div>
                </td>
                <td class="py-2 px-3 border text-center">${p.Protocolo}</td>
                <td class="py-2 px-3 border text-center ${p.Status==="PAGO"?"text-green-600":"text-red-500"}">${p.Status||"AGUARDANDO"}</td>
                <td class="py-2 px-3 border text-center">
                    <button class="primary small" onclick="confirmarPagamento('${p.Protocolo}')">💰 Confirmar</button><br>
                    <button class="danger small" onclick="excluirParticipante('${p.Protocolo}')">🗑 Excluir</button>
                </td>
            </tr>
            <tr class="jogos-participante" id="jogos-${p.Protocolo}">
                <td colspan="4" class="py-2 px-3 border">
                    ${jogosHtml}
                </td>
            </tr>
        `;
    }).join("");

    // Renderiza os controles de paginação
    renderPaginationControls(totalPages);
}

/**
 * Renderiza os botões de controle de paginação.
 * @param {number} totalPages O número total de páginas.
 */
function renderPaginationControls(totalPages) {
    if (totalPages <= 1) {
        paginationControls.innerHTML = "";
        return;
    }

    paginationControls.innerHTML = `
        <button id="btnPrevPage" class="muted small" ${currentPage === 1 ? 'disabled' : ''}>← Anterior</button>
        <span class="text-sm">Página ${currentPage} de ${totalPages}</span>
        <button id="btnNextPage" class="muted small" ${currentPage === totalPages ? 'disabled' : ''}>Próximo →</button>
    `;

    // Adiciona os event listeners aos novos botões de paginação
    el("btnPrevPage")?.addEventListener('click', () => changePage(-1));
    el("btnNextPage")?.addEventListener('click', () => changePage(1));
}

/**
 * Altera a página atual e renderiza novamente.
 * @param {number} step -1 para página anterior, 1 para próxima página.
 */
function changePage(step) {
    const totalItems = dadosFiltradosParaPaginacao.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    const newPage = currentPage + step;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTabelaPaginada();
        // Rola para o topo da tabela (opcional, mas melhora a UX)
        el("tabelaParticipantes")?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


// ================== FUNÇÃO DE TOGGLE ==================

/** Alterna a visibilidade dos jogos para um protocolo específico. */
window.toggleJogos = (protocolo) => {
    const linhaJogos = el(`jogos-${protocolo}`);
    const botao = document.querySelector(`.btn-toggle-jogos[data-protocolo='${protocolo}']`);

    if (linhaJogos) {
        linhaJogos.classList.toggle('visible');

        if (linhaJogos.classList.contains('visible')) {
            botao.textContent = '- Esconder jogos';
            botao.classList.remove('muted');
            botao.classList.add('primary');
        } else {
            botao.textContent = '+ Mostrar jogos';
            botao.classList.remove('primary');
            botao.classList.add('muted');
        }
    }
};

// Adiciona listener de evento DENTRO da tabela para lidar com o clique nos botões de toggle
listaParticipantes.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('btn-toggle-jogos')) {
        const protocolo = target.dataset.protocolo;
        window.toggleJogos(protocolo);
    }
});


// ================== PESQUISA E FILTRO ==================

inputPesquisa?.addEventListener('keyup', () => {
    const termo = inputPesquisa.value.toLowerCase().trim();
    
    // Zera a página para a primeira
    currentPage = 1;

    if (termo === "") {
        dadosFiltradosParaPaginacao = todosDados;
    } else {
        // Filtra a lista completa (todosDados)
        dadosFiltradosParaPaginacao = todosDados.filter(p => 
            p.Nome.toLowerCase().includes(termo) || 
            p.Protocolo.toLowerCase().includes(termo)
        );
    }
    
    // Renderiza a primeira página da nova lista filtrada/completa
    renderTabelaPaginada();
});


// ================== AÇÕES CONFIRMAR / EXCLUIR ==================
window.confirmarPagamento = async protocolo => {
    if(!confirm(`Confirmar pagamento do protocolo ${protocolo}?`)) return;
    await postAction("setPago", { protocolo });
};

window.excluirParticipante = async protocolo => {
    if(!confirm(`Excluir participante ${protocolo}?`)) return;
    await postAction("excluir", { protocolo });
};

async function postAction(action, params) {
    if (!accessToken) { alert("Token ausente."); btnLogout?.click(); return; }

    try {
        const formData = new FormData();
        formData.append("action", action);
        formData.append("token", accessToken);
        for (const k in params) formData.append(k, params[k]);

        const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
        let data;
        try { data = await res.json(); }
        catch (e) { const text = await res.text(); data = { success: false, message: text }; }

        if(data.success) {
            alert(data.message || "Ação concluída.");
        } else {
            alert("Falha: "+(data.message||data.error||"Erro desconhecido."));
            if(data.message && data.message.includes("Token")) btnLogout?.click();
        }

        if (action !== 'log') { 
            carregarParticipantes();
        }
    } catch(err) {
        alert("Erro de conexão: "+err.message);
    }
}

// ================== JOGO DA SORTE ==================
function renderizarJogoSorte() {
    jogoSorteContainer.innerHTML = "";
    jogoSorteContainer.style.display = "flex";
    jogoSorteContainer.style.justifyContent = "center";
    jogoSorteContainer.style.gap = "10px";
    
    const numerosParaMostrar = jogoSorteAtual.length === 9 ? jogoSorteAtual : Array(9).fill("-");

    numerosParaMostrar.forEach(num=>{
        const div=document.createElement("div");
        div.className="jogo-numero" + (num === "-" ? " empty" : ""); 
        div.textContent=num;
        jogoSorteContainer.appendChild(div);
    });
}

function renderizarInputsJogoSorte(){
    jogoSorteInputs.innerHTML="";
    jogoSorteInputs.style.display = "flex";
    jogoSorteInputs.style.justifyContent = "center";
    jogoSorteInputs.style.gap = "8px";

    for(let i=0;i<9;i++){
        const input=document.createElement("input");
        input.type="number";
        input.min=1;
        input.max=60;
        input.className="input-numero";
        input.value = ""; 
        jogoSorteInputs.appendChild(input);
    }
}

btnSalvarJogoSorte?.addEventListener("click", async()=>{
    const numeros = Array.from(jogoSorteInputs.querySelectorAll("input"))
        .map(i=>i.value.trim())
        .filter(v=>v!=="")
        .map(n=>parseInt(n).toString().padStart(2,"0"));

    if(numeros.length!==9){ alert("Informe exatamente 9 números."); return; }
    if(new Set(numeros).size!==9){ alert("Não é permitido números repetidos."); return; }
    if(numeros.some(n=>isNaN(parseInt(n))||parseInt(n)<1||parseInt(n)>60)){ alert("Números entre 01 e 60."); return; }

    await postAction("salvarJogoSorte",{ jogo:numeros.join(" ") });
});

btnApagarJogoSorte?.addEventListener("click", async()=>{
    if(!confirm("Deseja apagar todos os números do Jogo da Sorte?")) return;
    await postAction("salvarJogoSorte",{ jogo:"" });
});

// ================== JOGOS EXCEDENTES ==================
function renderizarExcedente(index){
    const div=document.createElement("div");
    div.className="flex gap-2 mb-2";
    div.dataset.index=index;

    const jogo = jogosExcedentesEmEdicao[index] || ["","","","","",""];

    for(let i=0;i<6;i++){
        const input=document.createElement("input");
        input.type="number";
        input.min=1;
        input.max=60;
        input.className="input-numero";
        input.value=jogo[i] || "";
        div.appendChild(input);
    }

    const btnRemove=document.createElement("button");
    btnRemove.textContent="🗑";
    btnRemove.type="button";
    btnRemove.className="danger small";
    btnRemove.onclick=()=>{ 
        const grids = Array.from(excedentesContainer.querySelectorAll("div[data-index]"));
        grids.forEach((g, idx) => {
            const vals = Array.from(g.querySelectorAll("input")).map(i=>i.value.trim().padStart(2,"0"));
            jogosExcedentesEmEdicao[idx] = vals; 
        });
        jogosExcedentesEmEdicao.splice(index,1); 
        renderizarTodosExcedentes(); 
    };
    div.appendChild(btnRemove);

    return div;
}

function renderizarTodosExcedentes(){
    excedentesContainer.innerHTML="";
    jogosExcedentesEmEdicao.forEach((_,idx)=>{ excedentesContainer.appendChild(renderizarExcedente(idx)); });
}

btnAddExcedente?.addEventListener("click", ()=>{
    const grids = excedentesContainer.querySelectorAll("div[data-index]");
    grids.forEach((grid, idx) => {
        const vals = Array.from(grid.querySelectorAll("input")).map(i => i.value.trim().padStart(2,"0"));
        jogosExcedentesEmEdicao[idx] = vals;
    });

    jogosExcedentesEmEdicao.push(["","","","","",""]);
    renderizarTodosExcedentes();
});

btnSalvarExcedentes?.addEventListener("click", async()=>{
    const grids = excedentesContainer.querySelectorAll("div[data-index]");
    const dados = Array.from(grids).map(grid =>
        Array.from(grid.querySelectorAll("input")).map(i => i.value.trim()) 
    );

    for(const jogo of dados){
        if(jogo.some(n=>!n)) { alert("Preencha todos os números de cada jogo."); return; }
        const numerosInteiros = jogo.map(Number);
        if(numerosInteiros.some(n=>isNaN(n)||n<1||n>60)){ alert("Números devem ser entre 01 e 60."); return; }
        if(new Set(numerosInteiros).size!==6){ alert("Não é permitido números repetidos em um jogo."); return; }
    }
    
    if (dados.length === 0) {
        const confirmClear = confirm("Nenhum jogo excedente será salvo. Deseja apagar todos os jogos excedentes existentes na planilha?");
        if (!confirmClear) return;
        await postAction("salvarJogosAdm", { jogos: "" });
        return;
    }

    const jogosStrings = dados.map(arr => {
        return arr.map(Number)
                  .sort((a, b) => a - b) 
                  .map(n => n.toString().padStart(2, "0"))
                  .join(" ");
    });

    const payloadStr = jogosStrings.join("|");

    await postAction("salvarJogosAdm",{ jogos: payloadStr });
});


// ================== CONFERÊNCIA ==================
function renderizarConferencia(){
    conferenciaContainer.innerHTML="";
    conferenciaContainer.style.display="flex";
    conferenciaContainer.style.justifyContent="center";
    conferenciaContainer.style.gap="8px";

    for(let i=0;i<6;i++){
        const input=document.createElement("input");
        input.type="number";
        input.min=1;
        input.max=60;
        input.className="input-numero";
        conferenciaContainer.appendChild(input);
    }
}

function capturarConferencia(){
    const arr = Array.from(conferenciaContainer.querySelectorAll("input"))
        .map(i=>i.value.trim())
        .filter(v=>v!=="")
        .map(n=>parseInt(n).toString().padStart(2,"0"));

    arr.sort((a,b) => parseInt(a,10) - parseInt(b,10));
    return arr;
}

btnConferir?.addEventListener("click",()=>{
    const sorteados=capturarConferencia();
    logToSheet(`Início da Conferência. Números Sorteados Digitados: ${sorteados.join(' ')}`);

    if(sorteados.length!==6) {
        logToSheet(`ERRO: Números Sorteados Incompletos (${sorteados.length}/6). Abortando.`);
        return alert("Informe exatamente 6 números sorteados.");
    }

    resultadoConferencia.innerHTML=`<p class="loading">Conferindo resultados...</p>`;
    areaRateio.classList.add("hidden");

    const premiados={sena:[],quina:[],quadra:[]};

    let logSummary = {
        totalParticipantes: todosDados.length,
        totalJogosExcedentes: jogosExcedentes.length,
        acertos: {sena: 0, quina: 0, quadra: 0}
    };

    todosDados.forEach(p=>{
        if(p.Jogos){
            p.Jogos.split('|').forEach((jogo,idx)=>{
                const nums = jogo.split(' ').map(n=>n.padStart(2,'0'));
                const acertos = nums.filter(n=>sorteados.includes(n)).length;
                if(acertos>=4){
                    const tipoPremio = acertos===6?'sena':acertos===5?'quina':'quadra';
                    premiados[tipoPremio].push({
                        Nome:p.Nome,
                        Protocolo:p.Protocolo,
                        acertos,
                        idx:idx+1,
                        tipo:"Participante",
                        jogo:jogo
                    });
                    logSummary.acertos[tipoPremio]++;
                }
            });
        }
    });

    if (Array.isArray(jogoSorteAtual) && jogoSorteAtual.length) {
        const jogoNums = jogoSorteAtual.map(n => n.toString().padStart(2,'0'));
        const acertos = jogoNums.filter(n => sorteados.includes(n)).length;
        if(acertos>=4){
            const tipoPremio = acertos===6?'sena':acertos===5?'quina':'quadra';
            premiados[tipoPremio].push({
                Nome:"Jogo da Sorte",
                Protocolo:"-",
                acertos,
                idx:1,
                tipo:"Jogo da Sorte",
                jogo:jogoNums.join(" ")
            });
            logSummary.acertos[tipoPremio]++;
        }
    }

    jogosExcedentes.forEach((jArr, idx) => {
        if (!Array.isArray(jArr) || jArr.length !== 6) return;
        const jogoFormatado = jArr.map(n => n.toString().padStart(2,'0'));
        const acertos = jogoFormatado.filter(n => sorteados.includes(n)).length;
        if(acertos>=4){
            const tipoPremio = acertos===6?'sena':acertos===5?'quina':'quadra';
            premiados[tipoPremio].push({
                Nome:"Excedente",
                Protocolo:"-",
                acertos,
                idx:idx+1,
                tipo:"Jogo Excedente",
                jogo:jogoFormatado.join(" ")
            });
            logSummary.acertos[tipoPremio]++;
        }
    });

    logToSheet(`Resumo: Sorteados: ${sorteados.join(' ')}. Premiados (Sena: ${logSummary.acertos.sena}, Quina: ${logSummary.acertos.quina}, Quadra: ${logSummary.acertos.quadra}). Total Pagos: ${todosDados.filter(p=>p.Status==='PAGO').length}.`);


    let html=`<h4>Resultado da Conferência</h4><p><strong>Números:</strong> ${sorteados.join(' ')}</p><hr>`;

    ["sena","quina","quadra"].forEach(tipo=>{
        if(premiados[tipo] && premiados[tipo].length){
            html+=`<h5>🎉 ${tipo.toUpperCase()} (${premiados[tipo].length})</h5>`;
            premiados[tipo].forEach(j=>html+=`
                <p>
                    <strong>${j.tipo}</strong> - ${j.Nome} (${j.Protocolo})<br>
                    Jogo ${j.idx}: <strong>${j.jogo}</strong><br>
                    Acertos: ${j.acertos}
                </p>
            `);
        }
    });

    if(!premiados.sena.length && !premiados.quina.length && !premiados.quadra.length)
        html+=`<p style="color:red;">Nenhum premiado.</p>`;

    resultadoConferencia.innerHTML=html;
    areaRateio.classList.remove("hidden");

    document.rateioData = { totalPagos: todosDados.filter(p=>p.Status==='PAGO').length };
});

// ================== RATEIO ==================

btnCalcular?.addEventListener("click",()=>{ 
    const total=parseFloat(inputValorPremio.value);
    const pagos=document.rateioData?.totalPagos||0; 

    if(!total||total<=0) return mostrarRateio("Insira um valor válido.","red");
    if(pagos===0) return mostrarRateio("Nenhum participante PAGO encontrado para o rateio.","red");

    const porPessoa=total/pagos;
    
    const totalFormatado = total.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const porPessoaFormatado = porPessoa.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    mostrarRateio(`💵 R$ ${totalFormatado} / ${pagos} → R$ ${porPessoaFormatado} por participante.`, "green");
});

function mostrarRateio(msg,cor){
    resultado.textContent=msg;
    resultado.style.color=cor;
}
