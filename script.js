// --- CHECKLISTS PADRÃO (Estático) ---
const defaultChecklists = {
    quarto: {
        essencial: ['Cama/Colchão', 'Travesseiros', 'Jogo de Cama', 'Guarda-roupa'],
        comum: ['Mesa cabeceira', 'Cortina', 'Espelho', 'Abajur', 'Tapete', 'Ventilador']
    },
    sala: {
        essencial: ['Sofá', 'Rack', 'Iluminação'],
        comum: ['TV', 'Mesa centro', 'Tapete', 'Cortinas', 'Almofadas', 'Quadros']
    },
    banheiro: {
        essencial: ['Toalhas', 'Espelho', 'Lixeira', 'Porta-papel', 'Escova sanitária'],
        comum: ['Gabinete', 'Porta-escova', 'Cesto roupa', 'Tapete']
    },
    cozinha: {
        essencial: ['Geladeira', 'Fogão', 'Panelas', 'Pratos/Talheres', 'Lixeira'],
        comum: ['Micro-ondas', 'Liquidificador', 'Potes', 'Cafeteira', 'Sanduicheira']
    },
    area: {
        essencial: ['Máquina lavar', 'Varal', 'Balde', 'Vassoura/Rodo'],
        comum: ['Tábua passar', 'Ferro', 'Cesto', 'Armário']
    }
};

// --- VARIÁVEIS GLOBAIS ---
let sections = [];
let houseData = {}; 
let checklistData = {};
let wallet = { balance: 0, history: [] };
let currentSectionId = null;

// --- FIREBASE SYNC ---

// 1. CARREGAR DADOS (Chamado pelo HTML ao logar)
window.loadUserData = async (uid) => {
    try {
        const docRef = window.doc(window.db, "users", uid);
        const docSnap = await window.getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Dados carregados:", data);
            
            // Atualiza estado local
            sections = data.sections || [];
            houseData = data.houseData || {};
            checklistData = data.checklistData || {};
            wallet = data.wallet || { balance: 0, history: [] };
        } else {
            console.log("Novo usuário, criando estrutura padrão...");
            // Inicializa padrão
            sections = [{
                id: 'mobilia', name: 'Mobília e Planejamento',
                rooms: [{ id: 'sala', name: 'Sala' }, { id: 'cozinha', name: 'Cozinha' }]
            }];
            sections.forEach(sec => sec.rooms.forEach(room => initializeRoomData(room)));
            saveData(); 
        }

        // Renderiza
        if(sections.length > 0) switchSection(sections[0].id);
        renderSectionNav();
        updateAllTotals();
        updateWalletUI();

    } catch (e) {
        console.error("Erro ao carregar:", e);
    }
};

// 2. SALVAR DADOS
const saveData = async () => {
    if (!window.currentUser) return;

    const uid = window.currentUser.uid;
    const dataToSave = { sections, houseData, checklistData, wallet };

    try {
        await window.setDoc(window.doc(window.db, "users", uid), dataToSave, { merge: true });
        console.log("Salvo no Firebase");
    } catch (e) {
        console.error("Erro ao salvar:", e);
    }
};

// --- HELPER INICIALIZAÇÃO ---
function initializeRoomData(room) {
    if (!houseData[room.id]) {
        houseData[room.id] = { essencial: [], comum: [], desejado: [] };
        let type = '';
        if (room.id.includes('quarto')) type = 'quarto';
        else if (room.id.includes('sala')) type = 'sala';
        else if (room.id.includes('banheiro')) type = 'banheiro';
        else if (room.id.includes('cozinha')) type = 'cozinha';
        else if (room.id.includes('area')) type = 'area';

        checklistData[room.id] = {
            essencial: type ? [...(defaultChecklists[type]?.essencial || [])] : [],
            comum: type ? [...(defaultChecklists[type]?.comum || [])] : [],
            desejado: []
        };
    }
}

// --- CARTEIRA ---
function handleTransaction(type) {
    const descInput = document.getElementById('trans-desc');
    const valInput = document.getElementById('trans-val');
    const desc = descInput.value.trim() || (type === 'add' ? 'Depósito' : 'Retirada');
    const val = parseFloat(valInput.value);

    if (isNaN(val) || val <= 0) { alert("Valor inválido."); return; }

    if (type === 'add') {
        wallet.balance += val;
        wallet.history.unshift({ type: 'add', desc, val });
    } else {
        wallet.balance -= val;
        wallet.history.unshift({ type: 'remove', desc, val });
    }
    descInput.value = ''; valInput.value = '';
    
    updateWalletUI();
    updateAllTotals();
    saveData();
}

function updateWalletUI() {
    document.getElementById('wallet-balance').innerText = formatCurrency(wallet.balance);
    const list = document.getElementById('wallet-history');
    list.innerHTML = '';
    wallet.history.slice(0, 5).forEach(item => {
        const li = document.createElement('li');
        const sign = item.type === 'add' ? '+' : '-';
        const cssClass = item.type === 'add' ? 'hist-plus' : 'hist-minus';
        li.innerHTML = `<span>${item.desc}</span> <span class="${cssClass}">${sign} ${formatCurrency(item.val)}</span>`;
        list.appendChild(li);
    });
}

// --- SEÇÕES ---
function renderSectionNav() {
    const nav = document.getElementById('section-nav');
    nav.innerHTML = '';
    sections.forEach(sec => {
        const btn = document.createElement('div');
        btn.className = 'section-tab';
        if(sec.id === currentSectionId) btn.classList.add('active');
        btn.innerText = sec.name;
        btn.onclick = () => switchSection(sec.id);
        nav.appendChild(btn);
    });
}

function switchSection(sectionId) {
    currentSectionId = sectionId;
    renderSectionNav();
    document.getElementById('section-summary-bar').style.display = 'block';
    document.getElementById('room-area-wrapper').style.display = 'block';
    
    const currentSec = sections.find(s => s.id === sectionId);
    document.getElementById('current-section-name-display').innerText = currentSec ? currentSec.name : '';
    renderRoomsNav();
    updateAllTotals();
    if(currentSec && currentSec.rooms.length > 0) switchRoom(currentSec.rooms[0].id);
    else document.getElementById('main-container').innerHTML = '<div style="text-align:center; padding:30px; color:#666">Nenhum cômodo.</div>';
}

function addNewSection() {
    const name = document.getElementById('new-section-name').value.trim();
    if(!name) return;
    const id = 'sec-' + Date.now();
    sections.push({ id, name, rooms: [] });
    document.getElementById('new-section-name').value = '';
    switchSection(id);
    saveData();
}

function deleteCurrentSection() {
    if(!currentSectionId || !confirm("Apagar seção inteira?")) return;
    sections = sections.filter(s => s.id !== currentSectionId);
    if(sections.length > 0) switchSection(sections[0].id);
    else {
        currentSectionId = null;
        renderSectionNav();
        document.getElementById('section-summary-bar').style.display = 'none';
        document.getElementById('room-area-wrapper').style.display = 'none';
    }
    updateAllTotals();
    saveData();
}

// --- CÔMODOS ---
function renderRoomsNav() {
    const nav = document.getElementById('room-nav');
    nav.innerHTML = '';
    const currentSec = sections.find(s => s.id === currentSectionId);
    if(!currentSec) return;
    currentSec.rooms.forEach(room => {
        const btn = document.createElement('button');
        btn.className = 'room-btn';
        btn.innerText = room.name;
        btn.onclick = () => switchRoom(room.id);
        btn.dataset.target = room.id;
        nav.appendChild(btn);
    });
}

function addNewRoom() {
    if(!currentSectionId) return;
    const name = document.getElementById('new-room-name').value.trim();
    if(!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now();
    const currentSec = sections.find(s => s.id === currentSectionId);
    currentSec.rooms.push({ id, name });
    initializeRoomData({ id, name });
    document.getElementById('new-room-name').value = '';
    renderRoomsNav();
    switchRoom(id);
    updateAllTotals();
    saveData();
}

function switchRoom(roomId) {
    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`button[data-target="${roomId}"]`);
    if(btn) btn.classList.add('active');

    const container = document.getElementById('main-container');
    const roomName = document.querySelector(`button[data-target="${roomId}"]`)?.innerText || 'Cômodo';
    
    container.innerHTML = `
        <div class="room-section active" id="section-${roomId}">
            <div class="room-header">
                <h2>${roomName}</h2>
                <div class="room-stats"><span id="room-stat-${roomId}"></span></div>
            </div>
            <div class="columns-wrapper">
                ${renderColumnHTML(roomId, 'essencial', 'Essenciais')}
                ${renderColumnHTML(roomId, 'comum', 'Comuns')}
                ${renderColumnHTML(roomId, 'desejado', 'Desejados')}
            </div>
        </div>
    `;
    renderChecklist(roomId, 'essencial'); renderChecklist(roomId, 'comum'); renderChecklist(roomId, 'desejado');
    renderLists(roomId, 'essencial'); renderLists(roomId, 'comum'); renderLists(roomId, 'desejado');
    updateRoomTotals(roomId);
}

function renderColumnHTML(roomId, category, title) {
    return `
        <div class="column">
            <h3>${title}</h3>
            <div class="checklist-area">
                <div class="checklist-title">Sugestões / Falta:</div>
                <div class="checklist-items" id="check-${roomId}-${category}"></div>
                <div class="add-checklist-wrapper">
                    <input type="text" id="new-check-${roomId}-${category}" placeholder="+ Item">
                    <button class="btn-check-add" onclick="addToChecklist('${roomId}', '${category}')"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <div class="add-form">
                <input type="text" id="in-${roomId}-${category}-name" placeholder="Nome">
                <input type="number" id="in-${roomId}-${category}-price" placeholder="R$" step="0.01">
                <textarea id="in-${roomId}-${category}-desc" placeholder="Detalhes..."></textarea>
                <input type="text" id="in-${roomId}-${category}-link" placeholder="Link">
                <input type="file" id="in-${roomId}-${category}-img" accept="image/*" class="hidden-file-input">
                <label for="in-${roomId}-${category}-img" class="file-upload-btn"><i class="fas fa-upload"></i> Escolher Foto</label>
                <button class="add-btn" onclick="addItem('${roomId}', '${category}')">Adicionar</button>
            </div>
            <ul class="item-list" id="list-${roomId}-${category}"></ul>
        </div>
    `;
}

// --- ITENS ---
function addItem(roomId, category) {
    const name = document.getElementById(`in-${roomId}-${category}-name`).value.trim();
    const price = parseFloat(document.getElementById(`in-${roomId}-${category}-price`).value);
    const desc = document.getElementById(`in-${roomId}-${category}-desc`).value;
    const link = document.getElementById(`in-${roomId}-${category}-link`).value;
    const file = document.getElementById(`in-${roomId}-${category}-img`).files[0];

    if(!name || isNaN(price)) { alert("Nome e preço obrigatórios."); return; }

    const save = (img) => {
        houseData[roomId][category].push({ id: Date.now(), name, price, desc, link, img, status: 'pending' });
        
        // Limpa
        document.getElementById(`in-${roomId}-${category}-name`).value = '';
        document.getElementById(`in-${roomId}-${category}-price`).value = '';
        document.getElementById(`in-${roomId}-${category}-desc`).value = '';
        document.getElementById(`in-${roomId}-${category}-link`).value = '';
        document.getElementById(`in-${roomId}-${category}-img`).value = '';
        
        renderLists(roomId, category); renderChecklist(roomId, category); updateRoomTotals(roomId); updateAllTotals();
        saveData();
    };
    
    if(file) {
        const reader = new FileReader();
        reader.onload = e => save(e.target.result);
        reader.readAsDataURL(file);
    } else { save('https://via.placeholder.com/60/000/fff?text=Foto'); }
}

function removeItem(roomId, category, id) {
    houseData[roomId][category] = houseData[roomId][category].filter(i => i.id !== id);
    renderLists(roomId, category); renderChecklist(roomId, category); updateAllTotals();
    saveData();
}

function toggleStatus(roomId, category, id) {
    const item = houseData[roomId][category].find(i => i.id === id);
    if(item) { item.status = (item.status === 'bought' ? 'pending' : 'bought'); }
    renderLists(roomId, category); updateAllTotals();
    saveData();
}

function renderLists(roomId, category) {
    const ul = document.getElementById(`list-${roomId}-${category}`);
    ul.innerHTML = '';
    houseData[roomId][category].forEach(item => {
        const isBought = item.status === 'bought';
        const li = document.createElement('li');
        li.className = `item-card ${isBought ? 'bought' : ''}`;
        li.innerHTML = `
            <img src="${item.img}" class="item-img">
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                ${item.desc ? `<span class="item-desc">${item.desc}</span>` : ''}
                ${item.link ? `<a href="${item.link}" target="_blank" class="item-link">Link</a>` : ''}
                <label class="status-switch">
                    <input type="checkbox" ${isBought ? 'checked' : ''} onchange="toggleStatus('${roomId}','${category}',${item.id})">
                    <span class="slider">
                        <span class="status-label label-comprado">COMPRADO</span>
                        <span class="status-label label-pendente">PENDENTE</span>
                    </span>
                </label>
            </div>
            <button class="delete-btn" onclick="removeItem('${roomId}','${category}',${item.id})"><i class="fas fa-trash"></i></button>
        `;
        ul.appendChild(li);
    });
}

// --- CHECKLIST & TOTAIS ---
function renderChecklist(roomId, category) {
    const div = document.getElementById(`check-${roomId}-${category}`);
    div.innerHTML = '';
    const purchased = houseData[roomId][category].map(i => i.name.toLowerCase().trim());
    checklistData[roomId][category].forEach((item, idx) => {
        if(!purchased.includes(item.toLowerCase().trim())) {
            const tag = document.createElement('div');
            tag.className = 'checklist-tag';
            tag.innerHTML = `${item} <i class="fas fa-plus" onclick="fillForm('${roomId}','${category}','${item}')"></i> <i class="fas fa-times" onclick="removeCheck('${roomId}','${category}',${idx})"></i>`;
            div.appendChild(tag);
        }
    });
}
function addToChecklist(roomId, category) {
    const val = document.getElementById(`new-check-${roomId}-${category}`).value.trim();
    if(val) { checklistData[roomId][category].push(val); document.getElementById(`new-check-${roomId}-${category}`).value = ''; renderChecklist(roomId, category); saveData(); }
}
function removeCheck(r, c, i) { checklistData[r][c].splice(i, 1); renderChecklist(r, c); saveData(); }
function fillForm(r, c, name) { document.getElementById(`in-${r}-${c}-name`).value = name; document.getElementById(`in-${r}-${c}-price`).focus(); }
function updateRoomTotals(r) { document.getElementById(`room-stat-${r}`).innerText = "Atualizado"; }

function updateAllTotals() {
    let totals = { ess: 0, com: 0, des: 0 };
    let boughtVal = 0, pendingVal = 0;
    let countTotal = 0, countBought = 0;

    sections.forEach(sec => sec.rooms.forEach(room => {
        if(houseData[room.id]) {
            ['essencial', 'comum', 'desejado'].forEach(cat => {
                houseData[room.id][cat].forEach(item => {
                    const price = item.price;
                    if(cat === 'essencial') totals.ess += price;
                    if(cat === 'comum') totals.com += price;
                    if(cat === 'desejado') totals.des += price;
                    
                    if(item.status === 'bought') { boughtVal += price; countBought++; }
                    else { pendingVal += price; }
                    countTotal++;
                });
            });
        }
    }));
    const totalCost = totals.ess + totals.com + totals.des;

    // Atualiza Barras
    const finPct = totalCost > 0 ? (boughtVal / totalCost) * 100 : 0;
    document.getElementById('bar-finance').style.width = `${finPct}%`;
    document.getElementById('prog-text-finance').innerText = `${finPct.toFixed(1)}%`;
    document.getElementById('val-paid').innerText = `Pago: ${formatCurrency(boughtVal)}`;
    document.getElementById('val-pending').innerText = `Falta: ${formatCurrency(pendingVal)}`;

    const qtyPct = countTotal > 0 ? (countBought / countTotal) * 100 : 0;
    document.getElementById('bar-qty').style.width = `${qtyPct}%`;
    document.getElementById('prog-text-qty').innerText = `${qtyPct.toFixed(1)}%`;
    document.getElementById('qty-paid').innerText = `${countBought} itens`;
    document.getElementById('qty-pending').innerText = `${countTotal - countBought} itens`;

    const coverPct = totalCost > 0 ? (wallet.balance / totalCost) * 100 : 0;
    document.getElementById('bar-cover').style.width = `${coverPct > 100 ? 100 : coverPct}%`;
    document.getElementById('prog-text-cover').innerText = `${coverPct.toFixed(1)}%`;

    // Totais Texto
    document.getElementById('gl-ess').innerText = formatCurrency(totals.ess);
    document.getElementById('gl-com').innerText = formatCurrency(totals.com);
    document.getElementById('gl-des').innerText = formatCurrency(totals.des);
    document.getElementById('gl-total').innerText = formatCurrency(totalCost);

    // Seção Atual
    if(currentSectionId) {
        const sec = sections.find(s => s.id === currentSectionId);
        let sT=0, sB=0;
        if(sec) {
            sec.rooms.forEach(r => ['essencial','comum','desejado'].forEach(c => {
                if(houseData[r.id] && houseData[r.id][c]) {
                    houseData[r.id][c].forEach(i => { sT+=i.price; if(i.status==='bought') sB+=i.price; });
                }
            }));
            document.getElementById('sec-combined-total').innerText = formatCurrency(sT);
            document.getElementById('sec-combined-bought').innerText = `Pago: ${formatCurrency(sB)}`;
            document.getElementById('sec-combined-pending').innerText = `Falta: ${formatCurrency(sT - sB)}`;
        }
    }
}
function formatCurrency(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }