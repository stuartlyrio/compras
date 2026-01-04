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
// Hierarquia: sections -> rooms
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

// Dados de itens e checklists ficam "planos" (indexados pelo ID do quarto, que é único)
let houseData = {}; 
let checklistData = {};
let currentSectionId = null;

// --- Inicialização ---

function init() {
    // Garante que todos os quartos existentes tenham estrutura de dados
    sections.forEach(sec => {
        sec.rooms.forEach(room => initializeRoomData(room));
    });

    // Se houver seções, seleciona a primeira
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
    renderSectionNav(); // Atualiza visual active
    
    // Mostra a área de quartos
    document.getElementById('room-area-wrapper').style.display = 'block';
    
    // Atualiza título de controle
    const currentSec = sections.find(s => s.id === sectionId);
    document.getElementById('current-section-title').innerText = currentSec ? currentSec.name : '';

    renderRoomsNav();
    
    // Seleciona o primeiro quarto desta seção automaticamente, se houver
    const secObj = sections.find(s => s.id === sectionId);
    if(secObj && secObj.rooms.length > 0) {
        switchRoom(secObj.rooms[0].id);
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
    if(!confirm("Tem certeza que deseja apagar esta seção inteira e todos os seus itens?")) return;
    
    // Apaga dados dos quartos dessa seção para limpar memória (opcional)
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
        document.getElementById('room-area-wrapper').style.display = 'none';
    }
    updateAllTotals();
}


// --- Gerenciamento de Cômodos (Dentro da Seção) ---

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
    
    initializeRoomData({ id, name }); // Inicializa dados vazios
    
    input.value = '';
    renderRoomsNav();
    switchRoom(id);
}

function deleteRoom(roomId) {
    if(!confirm("Excluir este cômodo?")) return;
    
    const currentSec = sections.find(s => s.id === currentSectionId);
    currentSec.rooms = currentSec.rooms.filter(r => r.id !== roomId);
    
    delete houseData[roomId];
    delete checklistData[roomId];
    
    renderRoomsNav();
    
    if(currentSec.rooms.length > 0) {
        switchRoom(currentSec.rooms[0].id);
    } else {
        document.getElementById('main-container').innerHTML = '';
    }
    updateAllTotals();
}

// --- Renderização do Conteúdo do Cômodo ---

function switchRoom(roomId) {
    // Visual Nav
    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`button[data-target="${roomId}"]`);
    if(btn) btn.classList.add('active');

    // Renderiza o painel do quarto
    const container = document.getElementById('main-container');
    const roomName = document.querySelector(`button[data-target="${roomId}"]`)?.innerText || 'Cômodo';
    
    container.innerHTML = `
        <div class="room-section active" id="section-${roomId}">
            <div class="room-header">
                <h2>${roomName} <button class="delete-room-btn" onclick="deleteRoom('${roomId}')"><i class="fas fa-trash"></i> Excluir</button></h2>
                <div class="room-stats">
                    <div>Essenciais: <strong id="total-${roomId}-essencial">R$ 0,00</strong></div>
                    <div>Comuns: <strong id="total-${roomId}-comum">R$ 0,00</strong></div>
                    <div>Desejados: <strong id="total-${roomId}-desejado">R$ 0,00</strong></div>
                    <div style="border-left: 2px solid #ccc; padding-left: 10px; color:var(--accent-dark)">Total: <strong id="total-${roomId}-combined">R$ 0,00</strong></div>
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
                <div class="checklist-title">Falta Comprar:</div>
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
                <button class="add-btn" onclick="addItem('${roomId}', '${category}')">Adicionar</button>
            </div>
            <ul class="item-list" id="list-${roomId}-${category}"></ul>
        </div>
    `;
}

// --- Funções de Itens e Checklist (Lógica Mantida) ---

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
    if(val) {
        checklistData[roomId][category].push(val);
        document.getElementById(`new-check-${roomId}-${category}`).value = '';
        renderChecklist(roomId, category);
    }
}

function removeCheckItem(roomId, category, idx) {
    checklistData[roomId][category].splice(idx, 1);
    renderChecklist(roomId, category);
}

function fillForm(roomId, category, name) {
    document.getElementById(`input-${roomId}-${category}-name`).value = name;
    document.getElementById(`input-${roomId}-${category}-price`).focus();
}

function addItem(roomId, category) {
    const name = document.getElementById(`input-${roomId}-${category}-name`).value.trim();
    const price = parseFloat(document.getElementById(`input-${roomId}-${category}-price`).value);
    const desc = document.getElementById(`input-${roomId}-${category}-desc`).value;
    const link = document.getElementById(`input-${roomId}-${category}-link`).value;
    const file = document.getElementById(`input-${roomId}-${category}-img`).files[0];

    if(!name || isNaN(price)) { alert("Nome e preço obrigatórios."); return; }

    const save = (img) => {
        houseData[roomId][category].push({ id: Date.now(), name, price, desc, link, img });
        // Limpa form
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

function removeItem(roomId, category, id) {
    houseData[roomId][category] = houseData[roomId][category].filter(i => i.id !== id);
    renderLists(roomId, category);
    renderChecklist(roomId, category);
    updateRoomTotals(roomId);
    updateAllTotals();
}

function renderLists(roomId, category) {
    const ul = document.getElementById(`list-${roomId}-${category}`);
    ul.innerHTML = '';
    houseData[roomId][category].forEach(item => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <img src="${item.img}" class="item-img">
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                ${item.desc ? `<span class="item-desc">${item.desc}</span>` : ''}
                ${item.link ? `<a href="${item.link}" target="_blank" class="item-link">Ver Link</a>` : ''}
            </div>
            <button class="delete-btn" onclick="removeItem('${roomId}','${category}',${item.id})"><i class="fas fa-trash"></i></button>
        `;
        ul.appendChild(li);
    });
}

// --- Totais ---

function updateRoomTotals(roomId) {
    // Atualiza apenas os números do cabeçalho do cômodo atual
    const rEss = houseData[roomId].essencial.reduce((a,b)=>a+b.price,0);
    const rCom = houseData[roomId].comum.reduce((a,b)=>a+b.price,0);
    const rDes = houseData[roomId].desejado.reduce((a,b)=>a+b.price,0);
    
    const el = document.getElementById(`total-${roomId}-essencial`);
    if(el) {
        el.innerText = formatCurrency(rEss);
        document.getElementById(`total-${roomId}-comum`).innerText = formatCurrency(rCom);
        document.getElementById(`total-${roomId}-desejado`).innerText = formatCurrency(rDes);
        document.getElementById(`total-${roomId}-combined`).innerText = formatCurrency(rEss+rCom+rDes);
    }
}

function updateAllTotals() {
    let tEss=0, tCom=0, tDes=0;
    
    // Itera por TODAS as seções e TODOS os quartos
    sections.forEach(sec => {
        sec.rooms.forEach(room => {
            if(houseData[room.id]) {
                tEss += houseData[room.id].essencial.reduce((a,b)=>a+b.price,0);
                tCom += houseData[room.id].comum.reduce((a,b)=>a+b.price,0);
                tDes += houseData[room.id].desejado.reduce((a,b)=>a+b.price,0);
            }
        });
    });

    document.getElementById('global-essential').innerText = formatCurrency(tEss);
    document.getElementById('global-common').innerText = formatCurrency(tCom);
    document.getElementById('global-desejado').innerText = formatCurrency(tDes);
    document.getElementById('global-combined').innerText = formatCurrency(tEss+tCom+tDes);
}

function formatCurrency(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

init();