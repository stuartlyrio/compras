// --- CHECKLISTS PADRÃO ---
const defaultChecklists = {
    quarto: { essencial: ['Cama/Colchão', 'Travesseiros', 'Jogo de Cama', 'Guarda-roupa'], comum: ['Mesa cabeceira', 'Cortina', 'Espelho', 'Abajur', 'Tapete', 'Ventilador'] },
    sala: { essencial: ['Sofá', 'Rack', 'Iluminação'], comum: ['TV', 'Mesa centro', 'Tapete', 'Cortinas', 'Almofadas', 'Quadros'] },
    banheiro: { essencial: ['Toalhas', 'Espelho', 'Lixeira', 'Porta-papel', 'Escova sanitária'], comum: ['Gabinete', 'Porta-escova', 'Cesto roupa', 'Tapete'] },
    cozinha: { essencial: ['Geladeira', 'Fogão', 'Panelas', 'Pratos/Talheres', 'Lixeira'], comum: ['Micro-ondas', 'Liquidificador', 'Potes', 'Cafeteira', 'Sanduicheira'] },
    area: { essencial: ['Máquina lavar', 'Varal', 'Balde', 'Vassoura/Rodo'], comum: ['Tábua passar', 'Ferro', 'Cesto', 'Armário'] }
};

// --- DADOS ---
let sections = [];
let houseData = {}; 
let checklistData = {};
let wallet = { balance: 0, history: [] };
let investments = []; // Guardará { coinId: 'bitcoin', amount: 0.5 }
let currentSectionId = null;
let currentCryptoPrices = {}; // Cache de preços

// --- INIT ---
window.loadUserData = async (uid) => {
    try {
        const docRef = window.doc(window.db, "users", uid);
        const docSnap = await window.getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            sections = data.sections || [];
            houseData = data.houseData || {};
            checklistData = data.checklistData || {};
            wallet = data.wallet || { balance: 0, history: [] };
            investments = data.investments || [];
        } else {
            sections = [{ id: 'mobilia', name: 'Mobília', rooms: [{ id: 'sala', name: 'Sala' }, { id: 'cozinha', name: 'Cozinha' }] }];
            sections.forEach(sec => sec.rooms.forEach(room => initializeRoomData(room)));
            saveData();
        }
        if(sections.length > 0) switchSection(sections[0].id);
        renderSectionNav();
        updateWalletUI();
        refreshCryptoPrices(); // Busca cotação ao logar
        renderCryptoList();
    } catch (e) { console.error("Erro load:", e); }
};

const saveData = async () => {
    if (!window.currentUser) return;
    const uid = window.currentUser.uid;
    const dataToSave = { sections, houseData, checklistData, wallet, investments };
    try { await window.setDoc(window.doc(window.db, "users", uid), dataToSave, { merge: true }); } catch (e) { console.error("Erro save:", e); }
};

function initializeRoomData(room) {
    if (!houseData[room.id]) {
        houseData[room.id] = { essencial: [], comum: [], desejado: [] };
        let type = '';
        if (room.id.includes('quarto')) type = 'quarto'; else if (room.id.includes('sala')) type = 'sala'; else if (room.id.includes('banheiro')) type = 'banheiro'; else if (room.id.includes('cozinha')) type = 'cozinha'; else if (room.id.includes('area')) type = 'area';
        checklistData[room.id] = { essencial: type ? [...(defaultChecklists[type]?.essencial || [])] : [], comum: type ? [...(defaultChecklists[type]?.comum || [])] : [], desejado: [] };
    }
}

// --- CARTEIRA (FIAT) ---
window.handleTransaction = (type) => {
    const descInput = document.getElementById('trans-desc');
    const valInput = document.getElementById('trans-val');
    const desc = descInput.value.trim() || (type === 'add' ? 'Depósito' : 'Retirada');
    const val = parseFloat(valInput.value);
    if (isNaN(val) || val <= 0) { alert("Valor inválido."); return; }
    if (type === 'add') { wallet.balance += val; wallet.history.unshift({ type: 'add', desc, val }); } 
    else { wallet.balance -= val; wallet.history.unshift({ type: 'remove', desc, val }); }
    descInput.value = ''; valInput.value = '';
    updateWalletUI(); updateAllTotals(); saveData();
};

function updateWalletUI() {
    document.getElementById('wallet-balance').innerText = formatCurrency(wallet.balance);
    const list = document.getElementById('wallet-history');
    list.innerHTML = '';
    wallet.history.slice(0, 5).forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.desc}</span> <span class="${item.type === 'add' ? 'hist-plus' : 'hist-minus'}">${item.type === 'add' ? '+' : '-'} ${formatCurrency(item.val)}</span>`;
        list.appendChild(li);
    });
}

// --- CRIPTO ---
window.addCrypto = () => {
    const coin = document.getElementById('crypto-select').value;
    const amount = parseFloat(document.getElementById('crypto-amount').value);
    if(isNaN(amount) || amount <= 0) { alert("Quantidade inválida"); return; }
    
    // Verifica se já tem essa moeda e soma, ou adiciona nova
    const existing = investments.find(i => i.coinId === coin);
    if(existing) { existing.amount += amount; } 
    else { investments.push({ coinId: coin, amount: amount }); }
    
    document.getElementById('crypto-amount').value = '';
    renderCryptoList();
    saveData();
    refreshCryptoPrices(); // Atualiza valor total
};

window.removeCrypto = (coinId) => {
    investments = investments.filter(i => i.coinId !== coinId);
    renderCryptoList();
    saveData();
    updateCryptoTotal(); // Recalcula sem precisar chamar API de novo
};

window.refreshCryptoPrices = async () => {
    const btn = document.querySelector('.refresh-btn');
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        // IDs fixos para buscar
        const ids = 'bitcoin,ethereum,solana,tether,ripple'; 
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl`);
        currentCryptoPrices = await res.json();
        updateCryptoTotal();
    } catch(e) {
        console.error("Erro API Cripto:", e);
    } finally {
        if(btn) btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    }
};

function updateCryptoTotal() {
    let totalBRL = 0;
    const list = document.getElementById('crypto-list');
    if(list) list.innerHTML = ''; // Limpa para redesenhar com preços novos

    investments.forEach(inv => {
        const price = currentCryptoPrices[inv.coinId] ? currentCryptoPrices[inv.coinId].brl : 0;
        const valBRL = inv.amount * price;
        totalBRL += valBRL;

        // Renderiza lista com valor atualizado
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${inv.coinId.toUpperCase()} (${inv.amount})</span>
            <div style="display:flex; gap:10px; align-items:center;">
                <span style="color:#f3ba2f;">${formatCurrency(valBRL)}</span>
                <i class="fas fa-trash" style="cursor:pointer; color:#ef5350;" onclick="removeCrypto('${inv.coinId}')"></i>
            </div>
        `;
        list.appendChild(li);
    });

    document.getElementById('crypto-total-brl').innerText = formatCurrency(totalBRL);
    updateAllTotals(totalBRL); // Manda o valor cripto para somar no poder de compra
}

function renderCryptoList() {
    // Apenas renderiza visualmente, o updateCryptoTotal que preenche com valores
    updateCryptoTotal(); 
}

// --- NAV & SEÇÕES ---
function renderSectionNav() {
    const nav = document.getElementById('section-nav'); nav.innerHTML = '';
    sections.forEach(sec => {
        const btn = document.createElement('div'); btn.className = 'section-tab';
        if(sec.id === currentSectionId) btn.classList.add('active');
        btn.innerText = sec.name; btn.onclick = () => switchSection(sec.id); nav.appendChild(btn);
    });
}
window.switchSection = (id) => {
    currentSectionId = id; renderSectionNav();
    document.getElementById('section-summary-bar').style.display = 'block';
    document.getElementById('room-area-wrapper').style.display = 'block';
    document.getElementById('current-section-name-display').innerText = sections.find(s=>s.id===id)?.name || '';
    renderRoomsNav(); updateAllTotals();
    const sec = sections.find(s=>s.id===id);
    if(sec && sec.rooms.length > 0) switchRoom(sec.rooms[0].id);
    else document.getElementById('main-container').innerHTML = '<div style="text-align:center; padding:30px; color:#666">Vazio.</div>';
};
window.addNewSection = () => {
    const name = document.getElementById('new-section-name').value.trim(); if(!name) return;
    const id = 'sec-'+Date.now(); sections.push({id, name, rooms:[]});
    document.getElementById('new-section-name').value = ''; switchSection(id); saveData();
};
window.deleteCurrentSection = () => {
    if(!currentSectionId || !confirm("Apagar?")) return;
    sections = sections.filter(s=>s.id!==currentSectionId);
    if(sections.length>0) switchSection(sections[0].id); else { currentSectionId=null; renderSectionNav(); document.getElementById('section-summary-bar').style.display='none'; document.getElementById('room-area-wrapper').style.display='none'; }
    updateAllTotals(); saveData();
};

// --- CÔMODOS ---
function renderRoomsNav() {
    const nav = document.getElementById('room-nav'); nav.innerHTML = '';
    const sec = sections.find(s=>s.id===currentSectionId); if(!sec) return;
    sec.rooms.forEach(room => {
        const btn = document.createElement('button'); btn.className='room-btn'; btn.innerText=room.name;
        btn.onclick=()=>switchRoom(room.id); btn.dataset.target=room.id; nav.appendChild(btn);
    });
}
window.addNewRoom = () => {
    if(!currentSectionId) return; const name = document.getElementById('new-room-name').value.trim(); if(!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g,'')+'-'+Date.now();
    sections.find(s=>s.id===currentSectionId).rooms.push({id, name});
    initializeRoomData({id, name}); document.getElementById('new-room-name').value=''; renderRoomsNav(); switchRoom(id); updateAllTotals(); saveData();
};
window.switchRoom = (roomId) => {
    document.querySelectorAll('.room-btn').forEach(b=>b.classList.remove('active'));
    const btn = document.querySelector(`button[data-target="${roomId}"]`); if(btn) btn.classList.add('active');
    const container = document.getElementById('main-container');
    const roomName = btn ? btn.innerText : 'Cômodo';
    container.innerHTML = `
        <div class="room-section active" id="section-${roomId}">
            <div class="room-header"><h2>${roomName}</h2><div class="room-stats"><span id="room-stat-${roomId}"></span></div></div>
            <div class="columns-wrapper">
                ${renderColumnHTML(roomId, 'essencial', 'Essenciais')}
                ${renderColumnHTML(roomId, 'comum', 'Comuns')}
                ${renderColumnHTML(roomId, 'desejado', 'Desejados')}
            </div>
        </div>`;
    renderChecklist(roomId, 'essencial'); renderChecklist(roomId, 'comum'); renderChecklist(roomId, 'desejado');
    renderLists(roomId, 'essencial'); renderLists(roomId, 'comum'); renderLists(roomId, 'desejado');
    updateRoomTotals(roomId);
};

function renderColumnHTML(r, c, t) {
    return `<div class="column">
        <h3>${t}</h3>
        <div class="checklist-area"><div class="checklist-title">Sugestões:</div><div class="checklist-items" id="check-${r}-${c}"></div>
        <div class="add-checklist-wrapper"><input type="text" id="new-check-${r}-${c}" placeholder="+ Item"><button class="btn-check-add" onclick="addToChecklist('${r}','${c}')"><i class="fas fa-plus"></i></button></div></div>
        <div class="add-form">
            <div class="input-group-row"><input type="text" id="in-${r}-${c}-link" placeholder="Link"><button class="ai-action-btn" onclick="autoFillFromLink('${r}','${c}')" title="IA"><i class="fas fa-magic" id="icon-${r}-${c}"></i></button></div>
            <input type="text" id="in-${r}-${c}-name" placeholder="Nome"><input type="number" id="in-${r}-${c}-price" placeholder="R$" step="0.01">
            <textarea id="in-${r}-${c}-desc" placeholder="Detalhes"></textarea>
            <input type="file" id="in-${r}-${c}-img" accept="image/*" class="hidden-file-input"><label for="in-${r}-${c}-img" class="file-upload-btn"><i class="fas fa-upload"></i> Foto</label>
            <button class="add-btn" onclick="addItem('${r}','${c}')">Adicionar</button>
        </div><ul class="item-list" id="list-${r}-${c}"></ul></div>`;
}

// --- IA & ITENS ---
window.autoFillFromLink = async (r, c) => {
    const link = document.getElementById(`in-${r}-${c}-link`).value; const icon = document.getElementById(`icon-${r}-${c}`);
    if(!link) return; icon.className="fas fa-spinner fa-spin";
    try {
        const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(link)}&palette=true`);
        const d = await res.json();
        if(d.status==='success') {
            const m = d.data;
            if(m.title) document.getElementById(`in-${r}-${c}-name`).value = m.title.substring(0,40);
            if(m.description) document.getElementById(`in-${r}-${c}-desc`).value = m.description;
            if(m.image?.url) {
                const imgIn = document.getElementById(`in-${r}-${c}-img`); imgIn.setAttribute('data-remote', m.image.url);
                document.querySelector(`label[for="in-${r}-${c}-img"]`).innerHTML = '<i class="fas fa-check"></i> Foto IA';
            }
        }
    } catch(e) { console.error(e); } finally { icon.className="fas fa-magic"; }
};

window.addItem = (r, c) => {
    const name = document.getElementById(`in-${r}-${c}-name`).value.trim();
    const price = parseFloat(document.getElementById(`in-${r}-${c}-price`).value);
    const desc = document.getElementById(`in-${r}-${c}-desc`).value;
    const link = document.getElementById(`in-${r}-${c}-link`).value;
    const fileIn = document.getElementById(`in-${r}-${c}-img`);
    const file = fileIn.files[0]; const remote = fileIn.getAttribute('data-remote');

    if(!name || isNaN(price)) { alert("Nome/Preço?"); return; }
    const save = (img) => {
        houseData[r][c].push({ id: Date.now(), name, price, desc, link, img, status: 'pending' });
        document.getElementById(`in-${r}-${c}-name`).value=''; document.getElementById(`in-${r}-${c}-price`).value='';
        document.getElementById(`in-${r}-${c}-desc`).value=''; document.getElementById(`in-${r}-${c}-link`).value='';
        fileIn.value=''; fileIn.removeAttribute('data-remote');
        renderLists(r, c); updateAllTotals(); saveData();
    };
    if(file) { const rd = new FileReader(); rd.onload=e=>save(e.target.result); rd.readAsDataURL(file); }
    else if(remote) save(remote); else save('https://via.placeholder.com/60/000/fff?text=Foto');
};

window.removeItem = (r,c,id) => { houseData[r][c]=houseData[r][c].filter(i=>i.id!==id); renderLists(r,c); updateAllTotals(); saveData(); };
window.toggleStatus = (r,c,id) => { const i=houseData[r][c].find(x=>x.id===id); if(i) i.status=(i.status==='bought'?'pending':'bought'); renderLists(r,c); updateAllTotals(); saveData(); };

function renderLists(r, c) {
    const ul = document.getElementById(`list-${r}-${c}`); ul.innerHTML='';
    houseData[r][c].forEach(i => {
        const li = document.createElement('li'); const bought = i.status==='bought';
        li.className=`item-card ${bought?'bought':''}`;
        li.innerHTML=`<img src="${i.img}" class="item-img"><div class="item-info"><span class="item-name">${i.name}</span><span class="item-price">${formatCurrency(i.price)}</span>
        ${i.desc?`<span class="item-desc">${i.desc}</span>`:''} ${i.link?`<a href="${i.link}" target="_blank" class="item-link">Link</a>`:''}
        <label class="status-switch"><input type="checkbox" ${bought?'checked':''} onchange="toggleStatus('${r}','${c}',${i.id})"><span class="slider"><span class="status-label label-comprado">COMPRADO</span><span class="status-label label-pendente">PENDENTE</span></span></label></div>
        <button class="delete-btn" onclick="removeItem('${r}','${c}',${i.id})"><i class="fas fa-trash"></i></button>`;
        ul.appendChild(li);
    });
}

// --- CHECKLIST HELPERS ---
window.addToChecklist=(r,c)=>{const v=document.getElementById(`new-check-${r}-${c}`).value.trim();if(v){checklistData[r][c].push(v);document.getElementById(`new-check-${r}-${c}`).value='';renderChecklist(r,c);saveData();}};
window.removeCheck=(r,c,i)=>{checklistData[r][c].splice(i,1);renderChecklist(r,c);saveData();};
window.fillForm=(r,c,n)=>{document.getElementById(`in-${r}-${c}-name`).value=n;document.getElementById(`in-${r}-${c}-price`).focus();};
function renderChecklist(r,c){const d=document.getElementById(`check-${r}-${c}`);d.innerHTML='';const p=houseData[r][c].map(x=>x.name.toLowerCase().trim());
checklistData[r][c].forEach((it,ix)=>{if(!p.includes(it.toLowerCase().trim())){const t=document.createElement('div');t.className='checklist-tag';t.innerHTML=`${it} <i class="fas fa-plus" onclick="fillForm('${r}','${c}','${it}')"></i> <i class="fas fa-times" onclick="removeCheck('${r}','${c}',${ix})"></i>`;d.appendChild(t);}});}

// --- TOTAIS ---
function updateRoomTotals(r) { document.getElementById(`room-stat-${r}`).innerText = "Atualizado"; }
function updateAllTotals(cryptoVal = 0) {
    // Se cryptoVal não foi passado (chamada normal), tentar pegar do texto (gambiarra visual) ou recalcular
    // Melhor: recalcular sempre que possível
    let currentCryptoTotal = 0;
    investments.forEach(inv => {
        const p = currentCryptoPrices[inv.coinId] ? currentCryptoPrices[inv.coinId].brl : 0;
        currentCryptoTotal += (inv.amount * p);
    });

    let totals = { ess: 0, com: 0, des: 0 }; let bVal=0, pVal=0; let cTot=0, cBou=0;
    sections.forEach(sec => sec.rooms.forEach(r => {
        if(houseData[r.id]) ['essencial','comum','desejado'].forEach(cat => {
            houseData[r.id][cat].forEach(i => {
                if(cat==='essencial') totals.ess+=i.price; if(cat==='comum') totals.com+=i.price; if(cat==='desejado') totals.des+=i.price;
                if(i.status==='bought') { bVal+=i.price; cBou++; } else { pVal+=i.price; } cTot++;
            });
        });
    }));
    const totalCost = totals.ess+totals.com+totals.des;
    
    // Barras
    const fPct = totalCost>0 ? (bVal/totalCost)*100 : 0;
    document.getElementById('bar-finance').style.width=`${fPct}%`; document.getElementById('prog-text-finance').innerText=`${fPct.toFixed(1)}%`;
    document.getElementById('val-paid').innerText=`Pago: ${formatCurrency(bVal)}`; document.getElementById('val-pending').innerText=`Falta: ${formatCurrency(pVal)}`;
    
    const qPct = cTot>0 ? (cBou/cTot)*100 : 0;
    document.getElementById('bar-qty').style.width=`${qPct}%`; document.getElementById('prog-text-qty').innerText=`${qPct.toFixed(1)}%`;
    document.getElementById('qty-paid').innerText=`${cBou} itens`; document.getElementById('qty-pending').innerText=`${cTot-cBou} itens`;

    // Poder de Compra: Carteira + Cripto
    const totalMoney = wallet.balance + currentCryptoTotal;
    const cPct = totalCost>0 ? (totalMoney/totalCost)*100 : 0;
    const visCPct = cPct>100?100:cPct;
    document.getElementById('bar-cover').style.width=`${visCPct}%`; document.getElementById('prog-text-cover').innerText=`${cPct.toFixed(1)}%`;

    // Textos
    document.getElementById('gl-ess').innerText=formatCurrency(totals.ess); document.getElementById('gl-com').innerText=formatCurrency(totals.com);
    document.getElementById('gl-des').innerText=formatCurrency(totals.des); document.getElementById('gl-total').innerText=formatCurrency(totalCost);

    // Seção
    if(currentSectionId) {
        const sec=sections.find(s=>s.id===currentSectionId); let sT=0, sB=0;
        if(sec) sec.rooms.forEach(r => ['essencial','comum','desejado'].forEach(c => houseData[r.id][c].forEach(i=>{sT+=i.price; if(i.status==='bought')sB+=i.price;})));
        document.getElementById('sec-combined-total').innerText=formatCurrency(sT); document.getElementById('sec-combined-bought').innerText=`Pago: ${formatCurrency(sB)}`; document.getElementById('sec-combined-pending').innerText=`Falta: ${formatCurrency(sT-sB)}`;
    }
}
function formatCurrency(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }