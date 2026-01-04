// --- Definição das Checklists Padrão ---
const defaultChecklists = {
    quarto: {
        essencial: ['Cama ou Colchão', 'Travesseiros', 'Jogo de Cama', 'Guarda-roupa ou Arara', 'Cabides'],
        comum: ['Mesa de cabeceira', 'Cortina', 'Espelho de corpo inteiro', 'Abajur', 'Tapete', 'Ventilador ou Ar']
    },
    sala: {
        essencial: ['Sofá', 'Rack ou Estante', 'Iluminação básica'],
        comum: ['Televisão', 'Mesa de centro', 'Tapete', 'Cortinas', 'Almofadas e Mantas', 'Poltrona', 'Quadros/Plantas']
    },
    banheiro: {
        essencial: ['Toalhas', 'Espelho', 'Lixeira', 'Porta-papel higiênico', 'Escova sanitária', 'Tapete de banheiro'],
        comum: ['Armário/Gabinete', 'Porta-escova/sabonete', 'Cesto de roupa suja', 'Organizadores de box', 'Tapete antiderrapante']
    },
    cozinha: {
        essencial: ['Geladeira', 'Fogão ou Cooktop', 'Jogo de Panelas', 'Pratos, Copos, Talheres', 'Utensílios de preparo', 'Escorredor e Esponja', 'Lixeira', 'Panos de prato'],
        comum: ['Micro-ondas', 'Liquidificador', 'Potes', 'Tábua de corte', 'Cafeteira', 'Sanduicheira', 'Forno elétrico']
    },
    area: {
        essencial: ['Máquina de lavar', 'Varal', 'Balde', 'Vassoura/Rodo/Pá', 'Panos de chão', 'Pregadores'],
        comum: ['Tábua de passar', 'Ferro de passar', 'Cesto de roupa', 'Armário limpeza', 'Aspirador de pó', 'Organizadores']
    }
};

// --- Estrutura de Dados ---
let sections = [
    {
        id: 'mobilia',
        name: 'Mobília e Planejamento',
        rooms: [
            { id: 'sala', name: 'Sala' },
            { id: 'cozinha', name: 'Cozinha' },
            { id: 'quarto1', name: 'Quarto 1' },
            { id: 'quarto2', name: 'Quarto 2' },
            { id: 'banheiro', name: 'Banheiro' },
            { id: 'area', name: 'Área de Lavar' }
        ]
    }
];

let houseData = {}; 
let checklistData = {};
let currentSectionId = null;

// --- Inicialização ---

function init() {
    sections.forEach(sec => {
        sec.rooms.forEach(room => initializeRoomData(room));
    });

    if(sections.length > 0) {
        switchSection(sections[0].id);
    }
    renderSectionNav();
    updateAllTotals();
}

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

// --- Gerenciamento de Seções ---

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
    
    document.getElementById('section-summary-bar').style.display = 'flex';
    document.getElementById('room-area-wrapper').style.display = 'block';
    
    const currentSec = sections.find(s => s.id === sectionId);
    document.getElementById('current-section-name-display').innerText = currentSec ? currentSec.name : '';

    renderRoomsNav();
    updateAllTotals();
    
    if(currentSec && currentSec.rooms.length > 0) {
        switchRoom(currentSec.rooms[0].id);
    } else {
        document.getElementById('main-container').innerHTML = '<div style="text-align:center; padding:30px; color:#999">Nenhum cômodo nesta seção. Adicione um acima.</div>';
    }
}

function addNewSection() {
    const input = document.getElementById('new-section-name');
    const name = input.value.trim();
    if(!name) { alert("Digite o nome da seção."); return; }
    
    const id = 'sec-' + Date.now();
    sections.push({ id, name, rooms: [] });
    
    input.value = '';
    switchSection(id);
}

function deleteCurrentSection() {
    if(!currentSectionId) return;
    if(!confirm("Tem certeza que deseja apagar esta seção inteira?")) return;
    
    const sec = sections.find(s => s.id === currentSectionId);
    sec.rooms.forEach(r => {
        delete houseData[r.id];
        delete checklistData[r.id];
    });

    sections = sections.filter(s => s.id !== currentSectionId);
    
    if(sections.length > 0) {
        switchSection(sections[0].id);
    } else {
        currentSectionId = null;
        renderSectionNav();
        document.getElementById('section-summary-bar').style.display = 'none';
        document.getElementById('room-area-wrapper').style.display = 'none';
    }
    updateAllTotals();
}

// --- Gerenciamento de Cômodos ---

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
    const input = document.getElementById('new-room-name');
    const name = input.value.trim();
    if(!name) { alert("Nome do cômodo?"); return; }

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now().toString().slice(-4);
    const currentSec = sections.find(s => s.id === currentSectionId);
    currentSec.rooms.push({ id, name });
    
    initializeRoomData({ id, name });
    input.value = '';
    renderRoomsNav();
    switchRoom(id);
    updateAllTotals();
}

function deleteRoom(roomId) {
    if(!confirm("Excluir este cômodo?")) return;
    const currentSec = sections.find(s => s.id === currentSectionId);
    currentSec.rooms = currentSec.rooms.filter(r => r.id !== roomId);
    delete houseData[roomId];
    delete checklistData[roomId];
    renderRoomsNav();
    if(currentSec.rooms.length > 0) switchRoom(currentSec.rooms[0].id);
    else document.getElementById('main-container').innerHTML = '';
    updateAllTotals();
}

// --- Renderização ---

function switchRoom(roomId) {
    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`button[data-target="${roomId}"]`);
    if(btn) btn.classList.add('active');

    const container = document.getElementById('main-container');
    const roomName = document.querySelector(`button[data-target="${roomId}"]`)?.innerText || 'Cômodo';
    
    // Header do Quarto com Totais Detalhados
    container.innerHTML = `
        <div class="room-section active" id="section-${roomId}">
            <div class="room-header">
                <h2>${roomName} <button class="delete-room-btn" onclick="deleteRoom('${roomId}')"><i class="fas fa-trash"></i> Excluir</button></h2>
                <div class="room-stats">
                    <div class="stat-box">
                        <small>Essencial</small>
                        <span class="stat-main" id="total-${roomId}-essencial">R$ 0,00</span>
                        <div class="stat-sub">
                            <span class="c-green" id="bought-${roomId}-essencial">✔ 0,00</span>
                            <span class="c-red" id="pending-${roomId}-essencial">⏳ 0,00</span>
                        </div>
                    </div>
                    <div class="stat-box">
                        <small>Comum</small>
                        <span class="stat-main" id="total-${roomId}-comum">R$ 0,00</span>
                        <div class="stat-sub">
                            <span class="c-green" id="bought-${roomId}-comum">✔ 0,00</span>
                            <span class="c-red" id="pending-${roomId}-comum">⏳ 0,00</span>
                        </div>
                    </div>
                    <div class="stat-box">
                        <small>Desejado</small>
                        <span class="stat-main" id="total-${roomId}-desejado">R$ 0,00</span>
                        <div class="stat-sub">
                            <span class="c-green" id="bought-${roomId}-desejado">✔ 0,00</span>
                            <span class="c-red" id="pending-${roomId}-desejado">⏳ 0,00</span>
                        </div>
                    </div>
                    <div class="stat-box" style="border-left: 2px solid #ccc; padding-left: 15px;">
                        <small style="font-weight:bold;">TOTAL</small>
                        <span class="stat-main" style="color:var(--accent-dark); font-size:1.1rem" id="total-${roomId}-combined">R$ 0,00</span>
                        <div class="stat-sub">
                             <span id="bought-${roomId}-combined">Pago: R$ 0,00</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="columns-wrapper">
                ${renderColumnHTML(roomId, 'essencial', 'Essenciais Básicos')}
                ${renderColumnHTML(roomId, 'comum', 'Itens Comuns')}
                ${renderColumnHTML(roomId, 'desejado', 'Itens Desejados')}
            </div>
        </div>
    `;

    renderChecklist(roomId, 'essencial');
    renderChecklist(roomId, 'comum');
    renderChecklist(roomId, 'desejado');
    renderLists(roomId, 'essencial');
    renderLists(roomId, 'comum');
    renderLists(roomId, 'desejado');
    updateRoomTotals(roomId);
}

function renderColumnHTML(roomId, category, title) {
    return `
        <div class="column">
            <h3>${title}</h3>
            <div class="checklist-area">
                <div class="checklist-title">Falta Comprar (da Lista Padrão):</div>
                <div class="checklist-items" id="check-${roomId}-${category}"></div>
                <div class="add-checklist-wrapper">
                    <input type="text" id="new-check-${roomId}-${category}" placeholder="+ Item Checklist">
                    <button onclick="addToChecklist('${roomId}', '${category}')">Add</button>
                </div>
            </div>
            <div class="add-form">
                <input type="text" id="input-${roomId}-${category}-name" placeholder="Nome">
                <input type="number" id="input-${roomId}-${category}-price" placeholder="R$" step="0.01">
                <textarea id="input-${roomId}-${category}-desc" placeholder="Detalhes..."></textarea>
                <input type="text" id="input-${roomId}-${category}-link" placeholder="Link">
                <label style="font-size:0.8rem">Foto:</label>
                <input type="file" id="input-${roomId}-${category}-img" accept="image/*">
                <button class="add-btn" onclick="addItem('${roomId}', '${category}')">Adicionar à Lista</button>
            </div>
            <ul class="item-list" id="list-${roomId}-${category}"></ul>
        </div>
    `;
}

// --- Funções Principais de Itens ---

function addItem(roomId, category) {
    const name = document.getElementById(`input-${roomId}-${category}-name`).value.trim();
    const price = parseFloat(document.getElementById(`input-${roomId}-${category}-price`).value);
    const desc = document.getElementById(`input-${roomId}-${category}-desc`).value;
    const link = document.getElementById(`input-${roomId}-${category}-link`).value;
    const file = document.getElementById(`input-${roomId}-${category}-img`).files[0];

    if(!name || isNaN(price)) { alert("Nome e preço obrigatórios."); return; }

    const save = (img) => {
        houseData[roomId][category].push({ 
            id: Date.now(), 
            name, 
            price, 
            desc, 
            link, 
            img, 
            status: 'pending' 
        });

        document.getElementById(`input-${roomId}-${category}-name`).value = '';
        document.getElementById(`input-${roomId}-${category}-price`).value = '';
        document.getElementById(`input-${roomId}-${category}-desc`).value = '';
        document.getElementById(`input-${roomId}-${category}-link`).value = '';
        document.getElementById(`input-${roomId}-${category}-img`).value = '';
        
        renderLists(roomId, category);
        renderChecklist(roomId, category);
        updateRoomTotals(roomId);
        updateAllTotals();
    };

    if(file) {
        const reader = new FileReader();
        reader.onload = e => save(e.target.result);
        reader.readAsDataURL(file);
    } else {
        save('https://via.placeholder.com/60?text=Foto');
    }
}

function toggleItemStatus(roomId, category, itemId) {
    const item = houseData[roomId][category].find(i => i.id === itemId);
    if(item) {
        item.status = (item.status === 'bought') ? 'pending' : 'bought';
        renderLists(roomId, category);
        updateRoomTotals(roomId);
        updateAllTotals();
    }
}

function removeItem(roomId, category, id) {
    houseData[roomId][category] = houseData[roomId][category].filter(i => i.id !== id);
    renderLists(roomId, category);
    renderChecklist(roomId, category);
    updateRoomTotals(roomId);
    updateAllTotals();
}

// --- Renderização da Lista ---

function renderLists(roomId, category) {
    const ul = document.getElementById(`list-${roomId}-${category}`);
    ul.innerHTML = '';
    
    houseData[roomId][category].forEach(item => {
        const li = document.createElement('li');
        const isBought = item.status === 'bought';
        
        li.className = `item-card ${isBought ? 'bought' : ''}`;
        
        li.innerHTML = `
            <img src="${item.img}" class="item-img">
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                ${item.desc ? `<span class="item-desc">${item.desc}</span>` : ''}
                ${item.link ? `<a href="${item.link}" target="_blank" class="item-link">Ver Link</a>` : ''}
                
                <label class="status-switch">
                    <input type="checkbox" ${isBought ? 'checked' : ''} onchange="toggleItemStatus('${roomId}', '${category}', ${item.id})">
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

// --- Checklist Logic ---
function renderChecklist(roomId, category) {
    if(!checklistData[roomId]) return;
    const div = document.getElementById(`check-${roomId}-${category}`);
    div.innerHTML = '';
    const purchased = houseData[roomId][category].map(i => i.name.toLowerCase().trim());
    checklistData[roomId][category].forEach((item, idx) => {
        if(!purchased.includes(item.toLowerCase().trim())) {
            const tag = document.createElement('div');
            tag.className = 'checklist-tag';
            tag.innerHTML = `
                <span onclick="fillForm('${roomId}','${category}','${item}')">${item} <i class="fas fa-plus-circle"></i></span>
                <span class="remove-check-btn" onclick="removeCheckItem('${roomId}','${category}',${idx})">x</span>
            `;
            div.appendChild(tag);
        }
    });
    if(div.innerHTML === '') div.innerHTML = '<span style="color:#ccc; font-size:0.8rem">Vazio ou Completo</span>';
}
function addToChecklist(roomId, category) {
    const val = document.getElementById(`new-check-${roomId}-${category}`).value.trim();
    if(val) { checklistData[roomId][category].push(val); document.getElementById(`new-check-${roomId}-${category}`).value = ''; renderChecklist(roomId, category); }
}
function removeCheckItem(roomId, category, idx) { checklistData[roomId][category].splice(idx, 1); renderChecklist(roomId, category); }
function fillForm(roomId, category, name) { document.getElementById(`input-${roomId}-${category}-name`).value = name; document.getElementById(`input-${roomId}-${category}-price`).focus(); }


// --- TOTAIS (CÁLCULO COMPLEXO) ---

// Função auxiliar para calcular totais de uma lista
function calcStats(items) {
    let total = 0, bought = 0;
    items.forEach(i => {
        total += i.price;
        if(i.status === 'bought') bought += i.price;
    });
    return { total, bought, pending: total - bought };
}

function updateRoomTotals(roomId) {
    if(!houseData[roomId]) return;

    // Calcula stats por categoria
    const ess = calcStats(houseData[roomId].essencial);
    const com = calcStats(houseData[roomId].comum);
    const des = calcStats(houseData[roomId].desejado);
    
    // Atualiza HTML do Room Header
    const updateUI = (cat, stats) => {
        const el = document.getElementById(`total-${roomId}-${cat}`);
        if(el) {
            el.innerText = formatCurrency(stats.total);
            document.getElementById(`bought-${roomId}-${cat}`).innerText = `✔ ${formatCurrency(stats.bought)}`;
            document.getElementById(`pending-${roomId}-${cat}`).innerText = `⏳ ${formatCurrency(stats.pending)}`;
        }
    };

    updateUI('essencial', ess);
    updateUI('comum', com);
    updateUI('desejado', des);

    // Total Combined
    const totalComb = ess.total + com.total + des.total;
    const boughtComb = ess.bought + com.bought + des.bought;
    
    document.getElementById(`total-${roomId}-combined`).innerText = formatCurrency(totalComb);
    document.getElementById(`bought-${roomId}-combined`).innerText = `Pago: ${formatCurrency(boughtComb)}`;
}

function updateAllTotals() {
    // Totais Globais
    let gEss = { total:0, bought:0 }, gCom = { total:0, bought:0 }, gDes = { total:0, bought:0 };

    sections.forEach(sec => {
        sec.rooms.forEach(room => {
            if(houseData[room.id]) {
                const rEss = calcStats(houseData[room.id].essencial);
                const rCom = calcStats(houseData[room.id].comum);
                const rDes = calcStats(houseData[room.id].desejado);

                gEss.total += rEss.total; gEss.bought += rEss.bought;
                gCom.total += rCom.total; gCom.bought += rCom.bought;
                gDes.total += rDes.total; gDes.bought += rDes.bought;
            }
        });
    });

    // Atualiza DOM Global
    const updateGlobal = (cat, stats) => {
        document.getElementById(`global-${cat}-total`).innerText = formatCurrency(stats.total);
        document.getElementById(`global-${cat}-bought`).innerText = `✔ ${formatCurrency(stats.bought)}`;
        document.getElementById(`global-${cat}-pending`).innerText = `⏳ ${formatCurrency(stats.total - stats.bought)}`;
    };

    updateGlobal('essential', gEss);
    updateGlobal('common', gCom);
    updateGlobal('desejado', gDes);

    const gCombTotal = gEss.total + gCom.total + gDes.total;
    const gCombBought = gEss.bought + gCom.bought + gDes.bought;
    
    document.getElementById('global-combined-total').innerText = formatCurrency(gCombTotal);
    document.getElementById('global-combined-bought').innerText = `✔ ${formatCurrency(gCombBought)}`;
    document.getElementById('global-combined-pending').innerText = `⏳ ${formatCurrency(gCombTotal - gCombBought)}`;


    // Totais da Seção Atual
    if(currentSectionId) {
        const currentSec = sections.find(s => s.id === currentSectionId);
        if(currentSec) {
            let sEss = { total:0, bought:0 }, sCom = { total:0, bought:0 }, sDes = { total:0, bought:0 };

            currentSec.rooms.forEach(room => {
                if(houseData[room.id]) {
                    const rEss = calcStats(houseData[room.id].essencial);
                    const rCom = calcStats(houseData[room.id].comum);
                    const rDes = calcStats(houseData[room.id].desejado);

                    sEss.total += rEss.total; sEss.bought += rEss.bought;
                    sCom.total += rCom.total; sCom.bought += rCom.bought;
                    sDes.total += rDes.total; sDes.bought += rDes.bought;
                }
            });

            // Atualiza DOM Seção
            const updateSec = (cat, stats) => {
                document.getElementById(`sec-${cat}-total`).innerText = formatCurrency(stats.total);
                document.getElementById(`sec-${cat}-bought`).innerText = `✔ ${formatCurrency(stats.bought)}`;
                document.getElementById(`sec-${cat}-pending`).innerText = `⏳ ${formatCurrency(stats.total - stats.bought)}`;
            };

            updateSec('ess', sEss);
            updateSec('com', sCom);
            updateSec('des', sDes);

            const sCombTotal = sEss.total + sCom.total + sDes.total;
            const sCombBought = sEss.bought + sCom.bought + sDes.bought;

            document.getElementById('sec-combined-total').innerText = formatCurrency(sCombTotal);
            document.getElementById('sec-combined-bought').innerText = `Pago: ${formatCurrency(sCombBought)}`;
            document.getElementById('sec-combined-pending').innerText = `Falta: ${formatCurrency(sCombTotal - sCombBought)}`;
        }
    }
}

function formatCurrency(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

init();