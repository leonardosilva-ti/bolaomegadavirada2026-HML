// === /js/admin.js - ADMIN COMPLETO (CORREÇÃO JOGO DA SORTE) ===
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
const btnCalcular = el("btnCalcular");
const resultado = el("resultado");

const btnAtualizar = el("btnAtualizar");
const btnLogout = el("btnLogout");

// ==== VARIÁVEIS GLOBAIS CORRIGIDAS ====
let todosDados = [];
let jogoSorteAtual = [];         // array de strings '01','02',...
let jogosExcedentes = [];        // array de arrays [['01','02',...], ['..'], ...] - USADO APENAS PELA CONFERÊNCIA
let jogosExcedentesEmEdicao = []; // NOVO ARRAY: USADO PARA A INTERFACE DE EDIÇÃO/CADASTRO.
let accessToken = localStorage.getItem("adminToken") || null;

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

        renderTabela(todosDados);

        // ==== Jogo da Sorte ====
        // Normaliza para array de strings '01'
        if (data.jogoDaSorte) {
            jogoSorteAtual = Array.from(new Set(String(data.jogoDaSorte).split(/\s+/).filter(Boolean)))
                .map(n => n.toString().padStart(2,'0'));
        } else {
            jogoSorteAtual = [];
        }
        renderizarJogoSorte();
        renderizarInputsJogoSorte(); // Chamar aqui garante que os inputs estejam vazios

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

// ================== TABELA PARTICIPANTES ==================
function renderTabela(dados) {
    if (!dados.length) {
        listaParticipantes.innerHTML = `<tr><td colspan="4" class="text-center py-4">Nenhum participante encontrado.</td></tr>`;
        return;
    }

    listaParticipantes.innerHTML = dados.map(p => `
        <tr>
            <td class="py-2 px-3 border">${p.Nome}<br><small>${p.Jogos?.split('|').join('<br>')}</small></td>
            <td class="py-2 px-3 border text-center">${p.Protocolo}</td>
            <td class="py-2 px-3 border text-center ${p.Status==="PAGO"?"text-green-600":"text-red-500"}">${p.Status||"AGUARDANDO"}</td>
            <td class="py-2 px-3 border text-center">
                <button class="primary small" onclick="confirmarPagamento('${p.Protocolo}')">💰 Confirmar</button><br>
                <button class="danger small" onclick="excluirParticipante('${p.Protocolo}')">🗑 Excluir</button>
            </td>
        </tr>
    `).join("");
}

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
        // tentar parsear JSON mas defender-se de respostas text/plain
        let data;
        try { data = await res.json(); }
        catch (e) { const text = await res.text(); data = { success: false, message: text }; }

        if(data.success) {
            alert(data.message || "Ação concluída.");
        } else {
            alert("Falha: "+(data.message||data.error||"Erro desconhecido."));
            if(data.message && data.message.includes("Token")) btnLogout?.click();
        }

        // recarrega dados após ação (backend já atualizou)
        carregarParticipantes();
    } catch(err) {
        alert("Erro de conexão: "+err.message);
    }
}

// ================== JOGO DA SORTE CORRIGIDO ==================
function renderizarJogoSorte() {
    jogoSorteContainer.innerHTML = "";
    jogoSorteContainer.style.display = "flex";
    jogoSorteContainer.style.justifyContent = "center";
    jogoSorteContainer.style.gap = "10px";
    
    // Se não houver jogo cadastrado, mostra 9 hífens
    const numerosParaMostrar = jogoSorteAtual.length === 9 ? jogoSorteAtual : Array(9).fill("-");

    numerosParaMostrar.forEach(num=>{
        const div=document.createElement("div");
        // Adiciona classe 'empty' se for o hífen
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
        // CORREÇÃO: Input sempre começa vazio ("")
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

    // Usa o array de EDIÇÃO
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
        // 1. Captura valores atuais no DOM e atualiza o array de edição
        const grids = Array.from(excedentesContainer.querySelectorAll("div[data-index]"));
        grids.forEach((g, idx) => {
            const vals = Array.from(g.querySelectorAll("input")).map(i=>i.value.trim().padStart(2,"0"));
            jogosExcedentesEmEdicao[idx] = vals; 
        });
        // 2. Remove o item e redesenha
        jogosExcedentesEmEdicao.splice(index,1); 
        renderizarTodosExcedentes(); 
    };
    div.appendChild(btnRemove);

    return div;
}

function renderizarTodosExcedentes(){
    excedentesContainer.innerHTML="";
    // Renderiza o array de edição
    jogosExcedentesEmEdicao.forEach((_,idx)=>{ excedentesContainer.appendChild(renderizarExcedente(idx)); });
}

btnAddExcedente?.addEventListener("click", ()=>{
    // 1. Captura valores atuais no DOM e atualiza o array de edição
    const grids = excedentesContainer.querySelectorAll("div[data-index]");
    grids.forEach((grid, idx) => {
        const vals = Array.from(grid.querySelectorAll("input")).map(i => i.value.trim().padStart(2,"0"));
        jogosExcedentesEmEdicao[idx] = vals;
    });

    // 2. Adiciona um novo slot vazio e redesenha
    jogosExcedentesEmEdicao.push(["","","","","",""]);
    renderizarTodosExcedentes();
});

btnSalvarExcedentes?.addEventListener("click", async()=>{
    // Captura os valores ATUAIS do DOM
    const grids = excedentesContainer.querySelectorAll("div[data-index]");
    const dados = Array.from(grids).map(grid =>
        Array.from(grid.querySelectorAll("input")).map(i => i.value.trim()) // Remove padStart para ordenar como números
    );

    for(const jogo of dados){
        // Verifica se há campos vazios
        if(jogo.some(n=>!n)) { alert("Preencha todos os números de cada jogo."); return; }

        // Garante que todos são números válidos e checa repetição
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

    // 🚨 CORREÇÃO: Ordena e formata com padStart
    const jogosStrings = dados.map(arr => {
        // Converte para número, ordena e depois formata de volta para string com zero à esquerda
        return arr.map(Number)
                  .sort((a, b) => a - b) // Ordena em ordem crescente
                  .map(n => n.toString().padStart(2, "0"))
                  .join(" ");
    });

    // Envia como "jogo1|jogo2|..."
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

    // ordenar numericamente
    arr.sort((a,b) => parseInt(a,10) - parseInt(b,10));
    return arr;
}

btnConferir?.addEventListener("click",()=>{
    const sorteados=capturarConferencia();
    if(sorteados.length!==6) return alert("Informe exatamente 6 números sorteados.");

    resultadoConferencia.innerHTML=`<p class="loading">Conferindo resultados...</p>`;
    areaRateio.classList.add("hidden");

    const premiados={sena:[],quina:[],quadra:[]};

    // === CONFERIR PARTICIPANTES ===
    todosDados.forEach(p=>{
        if(p.Jogos){
            p.Jogos.split('|').forEach((jogo,idx)=>{
                const nums = jogo.split(' ').map(n=>n.padStart(2,'0'));
                const acertos = nums.filter(n=>sorteados.includes(n)).length;
                if(acertos>=4){
                    premiados[acertos===6?'sena':acertos===5?'quina':'quadra'].push({
                        Nome:p.Nome,
                        Protocolo:p.Protocolo,
                        acertos,
                        idx:idx+1,
                        tipo:"Participante",
                        jogo:jogo
                    });
                }
            });
        }
    });

    // === CONFERIR JOGO DA SORTE ===
    if (Array.isArray(jogoSorteAtual) && jogoSorteAtual.length) {
        const jogoNums = jogoSorteAtual.map(n => n.toString().padStart(2,'0'));
        const acertos = jogoNums.filter(n => sorteados.includes(n)).length;
        if(acertos>=4){
            premiados[acertos===6?'sena':acertos===5?'quina':'quadra'].push({
                Nome:"Jogo da Sorte",
                Protocolo:"-",
                acertos,
                idx:1,
                tipo:"Jogo da Sorte",
                jogo:jogoNums.join(" ")
            });
        }
    }

    // === CONFERIR JOGOS EXCEDENTES (USA o array populado do servidor) ===
    // jogosExcedentes é array de arrays [['01','02',...], ...]
    jogosExcedentes.forEach((jArr, idx) => {
        if (!Array.isArray(jArr) || jArr.length !== 6) return;
        const jogoFormatado = jArr.map(n => n.toString().padStart(2,'0'));
        const acertos = jogoFormatado.filter(n => sorteados.includes(n)).length;
        if(acertos>=4){
            premiados[acertos===6?'sena':acertos===5?'quina':'quadra'].push({
                Nome:"Excedente",
                Protocolo:"-",
                acertos,
                idx:idx+1,
                tipo:"Jogo Excedente",
                jogo:jogoFormatado.join(" ")
            });
        }
    });

    // ==== EXIBIÇÃO ====
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

    // guarda info para rateio (total pagos)
    document.rateioData = { totalPagos: todosDados.filter(p=>p.Status==='PAGO').length };
});

// ================== RATEIO ==================

// 🚨 CORREÇÃO APLICADA: Substituindo btnCalcularRateio por btnCalcular
btnCalcular?.addEventListener("click",()=>{ 
    const total=parseFloat(inputValorPremio.value);
    const pagos=document.rateioData?.totalPagos||0;

    if(!total||total<=0) return mostrarRateio("Insira um valor válido.","red");
    if(pagos===0) return mostrarRateio("Nenhum participante pago.","red");

    const porPessoa=total/pagos;
    
    // --- FORMATANDO OS VALORES ---
    
    // 1. Formata o valor total
    const totalFormatado = total.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // 2. Formata o valor por pessoa
    const porPessoaFormatado = porPessoa.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // --- MENSAGEM ATUALIZADA ---
    mostrarRateio(`💵 R$ ${totalFormatado} / ${pagos} → R$ ${porPessoaFormatado} por participante.`, "green");
});

// FUNÇÃO UTILITÁRIA RESTAURADA E NECESSÁRIA PARA O RATEIO
function mostrarRateio(msg,cor){
    resultado.textContent=msg;
    resultado.style.color=cor;
}
