// === /js/admin.js - ADMIN COMPLETO (REVISADO) ===
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuX4NxUodwTALVVsFMvDHFhrgV-tR4MBTZA_xdJd2rXLg5qIj1CSg3yXghM66JpWSm/exec";

const el = id => document.getElementById(id);
// ==== ELEMENTOS HTML ====
const loginArea = el("loginArea");
const adminArea = el("adminArea");
const loginMsg = el("loginMsg");

const listaParticipantes = el("listaParticipantes");
const countParticipantes = el("countParticipantes");
const countJogos = el("countJogos");

// CONTROLES DA LISTA
const filtroBusca = el("filtroBusca");
const filtroStatus = el("filtroStatus");
const btnAtualizar = el("btnAtualizar"); // Movido para nova localização

// PAGINAÇÃO
const paginacao = el("paginacao");
const btnAnterior = el("btnAnterior");
const btnProxima = el("btnProxima");
const paginaInfo = el("paginaInfo");

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
const btnCalcularRateio = el("btnCalcularRateio");
const resultadoRateio = el("resultadoRateio");

const btnLogout = el("btnLogout");

// ==== VARIÁVEIS GLOBAIS ====
let todosDados = [];
let jogoSorteAtual = [];
// array de strings '01','02',...
let jogosExcedentes = [];         // array de arrays [['01','02',...], ['..'], ...] - USADO APENAS PELA CONFERÊNCIA
let jogosExcedentesEmEdicao = [];
// NOVO ARRAY: USADO PARA A INTERFACE DE EDIÇÃO/CADASTRO.
let accessToken = localStorage.getItem("adminToken") || null;

// PAGINAÇÃO
const participantesPorPagina = 10;
let paginaAtual = 1;


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
async function carregarParticipantes(recarregarTabela = false) {
    if (!accessToken) { alert("Erro: Sessão expirada."); btnLogout?.click(); return;
    }

    listaParticipantes.innerHTML = `<tr><td colspan="4" class="text-center py-4">Carregando...</td></tr>`;
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
        // Correção: Garante que `p.Jogos` é tratado como string
        countJogos.textContent = todosDados.reduce((acc,p) => acc + (p.Jogos ? p.Jogos.split('|').length : 0), 0);

        // AQUI ESTÁ A CHAVE: se recarregarTabela for true, mantém a página e filtros. Caso contrário, reseta.
        if (!recarregarTabela) {
            paginaAtual = 1;
        }
        renderTabela(todosDados);


        // ==== Jogo da Sorte ====
        // Normaliza para array de strings '01', e adiciona a ordenação (Alteração 1.1)
        if (data.jogoDaSorte) {
            jogoSorteAtual = Array.from(new Set(String(data.jogoDaSorte).split(/\s+/).filter(Boolean)))
                .map(n => n.toString().padStart(2,'0'))
                .sort((a,b) => parseInt(a,10) - parseInt(b,10)); // ORDENAÇÃO
        } else {
            jogoSorteAtual = [];
        }
        renderizarJogoSorte();
        renderizarInputsJogoSorte(); 
        // Chamar aqui garante que os inputs estejam vazios

        // ==== Jogos Excedentes ====
        let rawExcedentes = data.jogosExcedentes || data.jogosAdm || [];
        if (!Array.isArray(rawExcedentes)) rawExcedentes = [];
        // Popula o array de CONFERÊNCIA. Garante que estão ordenados para a conferência
        jogosExcedentes = rawExcedentes.map(item => {
            if(!item) return [];
            return String(item).split(/\s+/).filter(Boolean)
                .map(n => n.toString().padStart(2,'0'))
                .sort((a,b) => parseInt(a,10) - parseInt(b,10)); // ORDENAÇÃO
        }).filter(arr => arr.length === 6 && new Set(arr).size === 6); // Filtra jogos válidos de 6
        
        // Popula o array de EDIÇÃO
        jogosExcedentesEmEdicao = jogosExcedentes.map(arr => arr.slice()); // Copia
        renderizarTodosExcedentes();


    } catch (err) {
        listaParticipantes.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">Erro ao carregar dados. ${err.message}</td></tr>`;
        console.error(err);
    }
}

// ================== PAGINAÇÃO, FILTRO E BUSCA ==================
function renderTabela(dadosCompletos) {
    
    // 1. Filtragem e Busca
    let dadosFiltrados = dadosCompletos;
    const busca = filtroBusca.value.trim().toLowerCase();
    const statusFiltro = filtroStatus.value;
    
    if (busca) {
        dadosFiltrados = dadosFiltrados.filter(p => 
            p.Nome.toLowerCase().includes(busca) || 
            p.Protocolo.toLowerCase().includes(busca)
        );
    }
    
    if (statusFiltro) {
        dadosFiltrados = dadosFiltrados.filter(p => 
            (p.Status || "AGUARDANDO") === statusFiltro
        );
    }
    
    // 2. Paginação
    const totalParticipantes = dadosFiltrados.length;
    const totalPaginas = Math.ceil(totalParticipantes / participantesPorPagina);
    
    // Ajusta página atual
    if (paginaAtual < 1) paginaAtual = 1;
    if (paginaAtual > totalPaginas && totalPaginas > 0) paginaAtual = totalPaginas;
    if (totalPaginas === 0) paginaAtual = 1;

    const inicio = (paginaAtual - 1) * participantesPorPagina;
    const fim = inicio + participantesPorPagina;
    const dadosPaginados = dadosFiltrados.slice(inicio, fim);
    
    // 3. Renderização
    listaParticipantes.innerHTML = renderTabelaHTML(dadosPaginados);
    
    // 4. Controles de Paginação
    paginaInfo.textContent = `Página ${totalPaginas === 0 ? 0 : paginaAtual} de ${totalPaginas}`;
    btnAnterior.disabled = paginaAtual <= 1 || totalPaginas === 0;
    btnProxima.disabled = paginaAtual >= totalPaginas;
}

// Renderiza o HTML da lista de participantes (Alteração 5.1 e 5.2)
function renderTabelaHTML(dados) {
    if (!dados || dados.length === 0) {
        return `<tr><td colspan="4" class="text-center py-4">Nenhum participante encontrado.</td></tr>`;
    }

    return dados.map(p => { 
        // Formata os jogos para exibição
        const jogosContent = p.Jogos?.split('|').join('<br>') || 'Nenhum jogo cadastrado.';
        const hasJogos = p.Jogos && p.Jogos.length > 0;
        const status = p.Status || "AGUARDANDO";
        
        // Botão para mostrar/esconder (Alteração 5.2)
        const btnToggle = hasJogos ? `<button id="btn-jogos-${p.Protocolo}" class="muted small mt-2" onclick="toggleJogos('${p.Protocolo}')">Mostrar Jogos</button>` : '';

        // Jogos inicialmente escondidos (Alteração 5.2)
        const jogosHidden = `
            <div id="jogos-${p.Protocolo}" class="mt-2 pt-2 border-t hidden">
                <small>${jogosContent}</small>
            </div>
        `;

        return `
            <tr>
                <td class="py-2 px-3 border"> 
                    ${p.Nome}
                    ${btnToggle}
                    ${jogosHidden}
                </td>
                <td class="py-2 px-3 border text-center">${p.Protocolo}</td>
                <td class="py-2 px-3 border text-center ${status==="PAGO"?"text-green-600":"text-red-500"}">${status}</td>
                <td class="py-2 px-3 border text-center">
                    <button class="primary small" onclick="confirmarPagamento('${p.Protocolo}')">💰 Confirmar</button><br>
                    <button class="danger small" onclick="excluirParticipante('${p.Protocolo}')">🗑 Excluir</button>
                </td>
            </tr>
        `;
    }).join("");
}

// Listeners para Paginação, Filtro e Busca
function atualizarTabela() {
    paginaAtual = 1; // Reseta para a página 1 em nova busca/filtro
    renderTabela(todosDados);
}
filtroBusca?.addEventListener("input", atualizarTabela);
filtroStatus?.addEventListener("change", atualizarTabela);
btnAtualizar?.addEventListener("click", () => {
    carregarParticipantes(); // Recarrega todos os dados do servidor
});
btnAnterior?.addEventListener("click", () => {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderTabela(todosDados);
    }
});
btnProxima?.addEventListener("click", () => {
    paginaAtual++;
    renderTabela(todosDados);
});

// Função para mostrar/esconder jogos (Alteração 5.2)
window.toggleJogos = (protocolo) => {
    const jogosDiv = el(`jogos-${protocolo}`);
    const btnToggle = el(`btn-jogos-${protocolo}`);
    if(jogosDiv.classList.contains("hidden")) {
        jogosDiv.classList.remove("hidden");
        btnToggle.textContent = "Esconder Jogos";
    } else {
        jogosDiv.classList.add("hidden");
        btnToggle.textContent = "Mostrar Jogos";
    }
}


// ================== AÇÕES CONFIRMAR / EXCLUIR ==================
// Função auxiliar para POST
async function postAction(action, params = {}) {
    const formData = new FormData();
    formData.append("action", action);
    formData.append("token", accessToken);
    for (const key in params) {
        formData.append(key, params[key]);
    }
    
    try {
        const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
            alert(data.message || "Ação concluída com sucesso.");
            return true;
        } else {
            alert("Falha na ação: " + (data.message || "Erro desconhecido."));
            return false;
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão ao executar a ação.");
        return false;
    }
}

// MODIFICAÇÃO: Incluir data no `confirmarPagamento` (Alteração 5.4)
window.confirmarPagamento = async protocolo => {
    const dataPagamento = prompt(`Confirmar pagamento do protocolo ${protocolo}? \n\n Informe a data do pagamento (Ex: 31/12/2024):`);
    
    if (dataPagamento === null) return; // Usuário cancelou
    
    if (!dataPagamento.trim()) {
        alert("A data de pagamento é obrigatória.");
        return;
    }

    if(await postAction("setPago", { protocolo, dataPagamento })) {
        carregarParticipantes();
    }
};

window.excluirParticipante = async protocolo => { 
    if(!confirm(`Excluir participante ${protocolo}? Esta ação é irreversível.`)) return;
    if(await postAction("excluirParticipante", { protocolo })) {
        carregarParticipantes();
    }
};

// ================== JOGO DA SORTE ==================
function renderizarJogoSorte(){
    jogoSorteContainer.innerHTML="";
    jogoSorteContainer.className = "jogo-numero-container"; // Garante a classe de estilo
    
    // Se não tiver jogo da sorte, exibe 9 hífens
    const numerosParaMostrar = (jogoSorteAtual && jogoSorteAtual.length === 6)
        ? jogoSorteAtual
        : Array(9).fill("-");
    
    numerosParaMostrar.forEach(num=>{
        const div=document.createElement("div"); // Adiciona classe 'empty' se for o hífen
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

    for(let i=0;i<6;i++){ // Apenas 6 inputs para 6 números
        const input=document.createElement("input");
        input.type="number";
        input.min=1;
        input.max=60;
        input.className="input-numero";
        input.value = ""; 
        jogoSorteInputs.appendChild(input);
    }
}

// Salvar Jogo da Sorte (Alteração 1.1 - Ordenação)
btnSalvarJogoSorte?.addEventListener("click", async()=>{ 
    const numeros = Array.from(jogoSorteInputs.querySelectorAll("input"))
        .map(i=>i.value.trim())
        .filter(v=>v!=="")
        .map(n=>parseInt(n).toString().padStart(2,"0"));
    
    if(numeros.length === 0) return alert("Preencha os campos ou use 'Apagar Jogo da Sorte'.");
    if(numeros.length !== 6) return alert("Um jogo da sorte deve ter exatamente 6 números.");

    // Checa por duplicatas
    if (new Set(numeros).size !== 6) return alert("Números duplicados encontrados. Por favor, insira 6 números únicos.");

    // ORDENAÇÃO antes de salvar (Alteração 1.1)
    numeros.sort((a,b) => parseInt(a,10) - parseInt(b,10));

    if(await postAction("salvarJogoDaSorte", { jogo: numeros.join(" ") })) {
        carregarParticipantes();
    }
});

btnApagarJogoSorte?.addEventListener("click", async()=>{
    if(!confirm("Tem certeza que deseja apagar o Jogo da Sorte?")) return;
    if(await postAction("salvarJogoDaSorte", { jogo: "" })) {
        carregarParticipantes();
    }
});

// ================== JOGOS EXCEDENTES ==================
function renderizarExcedente(index) {
    const jogo = jogosExcedentesEmEdicao[index] || ["","","","","",""]; // Jogo atual
    
    const div = document.createElement("div");
    div.className = "input-jogo-excedente";
    div.dataset.index = index;
    
    // Inputs
    for(let i=0; i<6; i++) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = 1;
        input.max = 60;
        input.className = "input-numero";
        input.value = jogo[i] || "";
        // Adiciona listener para atualizar o array em tempo real
        input.addEventListener('input', (e) => {
            // Atualiza o valor na posição correta do jogo no array de edição
            jogosExcedentesEmEdicao[index][i] = e.target.value.trim().padStart(2,"0");
        });
        div.appendChild(input);
    }

    // Botão de remover
    const btnRemove = document.createElement("button");
    btnRemove.className = "danger small";
    btnRemove.textContent = "X";
    btnRemove.style.width = "40px";
    btnRemove.style.marginTop = "0";
    btnRemove.addEventListener('click', async () => {
        if(!confirm("Remover este jogo excedente?")) return;
        // 1. Remove o item e redesenha
        jogosExcedentesEmEdicao.splice(index,1); 
        renderizarTodosExcedentes();      
    });
    div.appendChild(btnRemove);
    return div;
}

function renderizarTodosExcedentes(){
    excedentesContainer.innerHTML=""; // Renderiza o array de edição
    jogosExcedentesEmEdicao.forEach((_,idx)=>{ excedentesContainer.appendChild(renderizarExcedente(idx)); });
}

btnAddExcedente?.addEventListener("click", ()=>{
    // 1. Não precisa capturar, pois o listener de 'input' já faz isso.
    // 2. Adiciona um novo slot vazio e redesenha
    jogosExcedentesEmEdicao.push(["","","","","",""]);
    renderizarTodosExcedentes(); 
});

// Salvar Excedentes (Alteração 2 - Ordenação)
btnSalvarExcedentes?.addEventListener("click", async()=>{
    let jogosValidos = [];
    let temErro = false;

    // Constrói a lista de jogos válidos e ordena (Alteração 2)
    jogosExcedentesEmEdicao.forEach((jogoArr) => {
        const vals = jogoArr
            .map(n => n.trim())
            .filter(v => v !== "")
            .map(n => parseInt(n).toString().padStart(2, "0"));

        if (vals.length > 0 && vals.length !== 6) {
            temErro = true;
        } else if (vals.length === 6) {
            // Checa por duplicatas
            if (new Set(vals).size !== 6) {
                alert("Jogos Excedentes: Números duplicados encontrados em um jogo.");
                temErro = true;
                return;
            }
            
            // ORDENAÇÃO antes de salvar (Alteração 2)
            vals.sort((a,b) => parseInt(a,10) - parseInt(b,10));
            jogosValidos.push(vals.join(" "));
        }
    });

    if (temErro) return alert("Corrija os jogos excedentes (deve ter 6 números únicos por jogo ou estar vazio).");

    if(await postAction("salvarJogosAdm", { jogos: jogosValidos })) {
        carregarParticipantes();
    }
});

// ================== CONFERÊNCIA ==================
function capturarConferencia(){
    const arr = Array.from(conferenciaContainer.querySelectorAll("input"))
        .map(i=>i.value.trim())
        .filter(v=>v!=="")
        .map(n=>parseInt(n).toString().padStart(2,"0"));
    
    // ordenar numericamente
    arr.sort((a,b) => parseInt(a,10) - parseInt(b,10)); 
    return arr;
}

// Cria os inputs de 1 a 60 para Conferência
for(let i=0;i<6;i++){
    const input=document.createElement("input");
    input.type="number";
    input.min=1;
    input.max=60;
    input.className="input-numero";
    conferenciaContainer.appendChild(input);
}


btnConferir?.addEventListener("click",async()=>{ 
    const sorteados=capturarConferencia();
    if(sorteados.length!==6) return alert("Informe exatamente 6 números sorteados.");
    resultadoConferencia.innerHTML=`<p class="loading">Conferindo resultados...</p>`;
    areaRateio.classList.add("hidden");
    const premiados={sena:[],quina:[],quadra:[]};

    // === CONFERIR PARTICIPANTES ===
    // 'todosDados' já inclui o status de pagamento
    todosDados.forEach(p=>{
        if(p.Jogos){
            p.Jogos.split('|').forEach(jogo=>{
                if (!jogo) return;
                const jogoNumeros = String(jogo).split(/\s+/).filter(Boolean).map(n=>n.toString().padStart(2,'0'));
                if(jogoNumeros.length!==6) return;
                
                const acertos = jogoNumeros.filter(n => sorteados.includes(n)).length;
                
                if(acertos>=4){
                    premiados[acertos===6?'sena':acertos===5?'quina':'quadra'].push({
                        Protocolo: p.Protocolo,
                        acertos: acertos,
                        tipo: "Participante",
                        jogo: jogo.trim() // Jogo já ordenado pelo servidor
                    });
                }
            });
        }
    });

    // === CONFERIR JOGO DA SORTE ===
    if(jogoSorteAtual.length === 6){
        const acertos = jogoSorteAtual.filter(n => sorteados.includes(n)).length;
        if(acertos>=4){
            premiados[acertos===6?'sena':acertos===5?'quina':'quadra'].push({
                Protocolo: null, 
                acertos: acertos,
                tipo: "Jogo da Sorte",
                jogo: jogoSorteAtual.join(" ")
            });
        }
    }
    
    // === CONFERIR JOGOS EXCEDENTES (jogosExcedentes é o array populado do servidor) ===
    jogosExcedentes.forEach(jArr => {
        if (!Array.isArray(jArr) || jArr.length !== 6) return;
        const jogoFormatado = jArr.map(n => n.toString().padStart(2,'0')); 
        const acertos = jogoFormatado.filter(n => sorteados.includes(n)).length;
        if(acertos>=4){
            premiados[acertos===6?'sena':acertos===5?'quina':'quadra'].push({
                Protocolo: null, 
                acertos: acertos,
                tipo: "Jogo Excedente",
                jogo: jogoFormatado.join(" ") 
            });
        }
    });

    // === RENDERIZAR RESULTADOS (Alteração 3) ===
    let html = `<h4>Resultado do Sorteio (${sorteados.join(" ")})</h4>`;
    let totalGanhadores = 0;
    
    const premios = {sena: 'Sena (6 acertos)', quina: 'Quina (5 acertos)', quadra: 'Quadra (4 acertos)'};

    for (const chave of ['sena', 'quina', 'quadra']) {
        const grupo = premiados[chave];
        if (grupo.length > 0) {
            html += `<hr><h5>${premios[chave]} (${grupo.length} jogos)</h5>`;
            totalGanhadores += grupo.length;
            
            grupo.forEach(g => {
                let displayLine = "";
                
                if (g.tipo === "Participante") {
                    // Busca dados para o status
                    const participante = todosDados.find(p => p.Protocolo === g.Protocolo);
                    const status = participante?.Status || "AGUARDANDO";
                    const statusInfo = `<span class="${status==="PAGO"?"text-green-600":"text-red-500"}">Status: ${status}</span>`;
                    
                    displayLine = `Protocolo: ${g.Protocolo} - Jogo: ${g.jogo} (${g.acertos} acertos) - ${statusInfo}`;
                
                } else if (g.tipo === "Jogo Excedente") {
                    displayLine = `Jogo Excedente - Jogo: ${g.jogo} (${g.acertos} acertos)`;
                
                } else if (g.tipo === "Jogo da Sorte") {
                    displayLine = `Jogo da Sorte - Jogo: ${g.jogo} (${g.acertos} acertos)`;
                }

                html += `<p style="margin: 5px 0;">${displayLine}</p>`;
            });
        }
    }
    
    // CORREÇÃO DE LÓGICA: Calcula o total de PAGOS para o rateio.
    const totalPagos = todosDados.filter(p => (p.Status || 'AGUARDANDO') === 'PAGO').length;
    
    if(totalGanhadores === 0){
        html = "<h5>Nenhum jogo premiado encontrado.</h5>";
        areaRateio.classList.add("hidden");
    } else {
        areaRateio.classList.remove("hidden");
    }

    // Armazena o dado para o cálculo do rateio
    document.rateioData = { totalPagos: totalPagos }; 
    resultadoConferencia.innerHTML = html; 
});


// ================== CÁLCULO DE RATEIO ==================
// Alteração 4.1 e 4.2
btnCalcularRateio?.addEventListener("click",()=>{
    const total=parseFloat(inputValorPremio.value);
    const pagos=document.rateioData?.totalPagos||0;

    if(!total||total<=0) return mostrarRateio("Insira um valor válido.","red");
    if(pagos===0) return mostrarRateio("Nenhum participante pago para realizar o rateio.","red");

    const porPessoa=total/pagos;
    
    // Formatação com separador de milhar e decimal (Alteração 4.2)
    const formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalFormatado = formatter.format(total);
    const porPessoaFormatado = formatter.format(porPessoa);

    mostrarRateio(`💵 R$ ${totalFormatado} / ${pagos} participantes → R$ ${porPessoaFormatado} por participante.`, "green");
});

function mostrarRateio(msg,cor){
    resultadoRateio.textContent=msg;
    resultadoRateio.style.color=cor;
}
