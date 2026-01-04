// --- Configuração dos Cômodos ---
// Agora 'let' para permitir adição/remoção
let rooms = [
    { id: 'sala', name: 'Sala' },
    { id: 'cozinha', name: 'Cozinha' },
    { id: 'quarto1', name: 'Quarto 1' },
    { id: 'quarto2', name: 'Quarto 2' },
    { id: 'banheiro', name: 'Banheiro' },
    { id: 'area', name: 'Área de Lavar' }
];

// --- Checklist Padrão ---
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

// --- Dados do App ---
let houseData = {};
let checklistData = {};

// Inicializa Estruturas (Função Refatorada para ser reutilizável)
function initializeData() {
    rooms.forEach(room => {
        // Só cria se ainda não existir para não perder dados ao adicionar novos quartos
        if (!houseData[room.id]) {
            houseData[room.id] = { essencial: [], comum: [], desejado: [] };
            
            let type = room.id;
            // Tenta achar um tipo padrão (se conter 'quarto' no nome, usa lista de quarto, etc)
            let defaultType = null;
            if (room.id.includes('quarto')) defaultType = 'quarto';
            else if (room.id.includes('sala')) defaultType = 'sala';
            else if (room.id.includes('banheiro')) defaultType = 'banheiro';
            else if (room.id.includes('cozinha')) defaultType = 'cozinha';
            else if (room.id.includes('area')) defaultType = 'area';

            checklistData[room.id] = {
                essencial: defaultType ? [...(defaultChecklists[defaultType]?.essencial || [])] : [],
                comum: defaultType ? [...(defaultChecklists[defaultType]?.comum || [])] : [],
                desejado: [] 
            };
        }
    });
}

// --- Inicialização ---
function init() {
    initializeData();
    renderApp();
    if(rooms.length > 0) {
        switchRoom(rooms[0].id);
    }
}

function renderApp() {
    renderNav();
    renderRooms();
    updateAllTotals();
}

function renderNav() {
    const nav = document.getElementById('room-nav');
    nav.innerHTML = '';
    rooms.forEach(room => {
        const btn = document.createElement('button');
        btn.className = 'room-btn';
        btn.innerText = room.name;
        btn.onclick = () => switchRoom(room.id);
        btn.dataset.target = room.id;
        nav.appendChild(btn);
    });
}

function renderRooms() {
    const container = document.getElementById('main-container');
    container.innerHTML = '';
    
    if (rooms.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px; color:#666;">Nenhum cômodo criado. Adicione um acima.</div>';
        return;
    }

    rooms.forEach(room => {
        const section = document.createElement('div');
        section.className = 'room-section';
        section.id = `section-${room.id}`;
        
        section.innerHTML = `
            <div class="room-header">
                <h2>
                    ${room.name} 
                    <button class="delete-room-btn" onclick="deleteRoom('${room.id}')">
                        <i class="fas fa-trash"></i> Excluir Cômodo
                    </button>
                </h2>
                <div class="room-stats">
                    <div>Essenciais: <strong id="total-${room.id}-essencial">R$ 0,00</strong></div>
                    <div>Comuns: <strong id="total-${room.id}-comum">R$ 0,00</strong></div>
                    <div>Desejados: <strong id="total-${room.id}-desejado">R$ 0,00</strong></div>
                    <div style="border-left: 2px solid #ccc; padding-left: 10px; color:var(--accent-dark)">Total: <strong id="total-${room.id}-combined">R$ 0,00</strong></div>
                </div>
            </div>

            <div class="columns-wrapper">
                ${renderColumnHTML(room.id, 'essencial', 'Essenciais Básicos')}
                ${renderColumnHTML(room.id, 'comum', 'Itens Comuns')}
                ${renderColumnHTML(room.id, 'desejado', 'Itens Desejados')}
            </div>
        `;
        container.appendChild(section);
        
        renderChecklist(room.id, 'essencial');
        renderChecklist(room.id, 'comum');
        renderChecklist(room.id, 'desejado');
        
        renderLists(room.id, 'essencial');
        renderLists(room.id, 'comum');
        renderLists(room.id, 'desejado');
    });
}

function renderColumnHTML(roomId, category, title) {
    return `
        <div class="column">
            <h3>${title}</h3>
            
            <div class="checklist-area">
                <div class="checklist-title">Falta Comprar:</div>
                <div class="checklist-items" id="check-${roomId}-${category}"></div>
                <div class="add-checklist-wrapper">
                    <input type="text" id="new-check-${roomId}-${category}" placeholder="+ Checklist">
                    <button onclick="addToChecklist('${roomId}', '${category}')">Add</button>
                </div>
            </div>

            <div class="add-form">
                <input type="text" id="input-${roomId}-${category}-name" placeholder="Nome do Produto">
                <input type="number" id="input-${roomId}-${category}-price" placeholder="Valor (R$)" step="0.01">
                <textarea id="input-${roomId}-${category}-desc" placeholder="Descrição (ex: Medidas, Cor...)"></textarea>
                <input type="text" id="input-${roomId}-${category}-link" placeholder="Link do Produto">
                <label style="font-size:0.8rem; color:#666;">Foto:</label>
                <input type="file" id="input-${roomId}-${category}-img" accept="image/*">
                <button class="add-btn" onclick="addItem('${roomId}', '${category}')">Confirmar Compra</button>
            </div>
            <ul class="item-list" id="list-${roomId}-${category}"></ul>
        </div>
    `;
}

// --- Funções de Gerenciamento de Cômodos (NOVAS) ---

function addNewRoom() {
    const input = document.getElementById('new-room-name');
    const name = input.value.trim();
    
    if(!name) {
        alert("Digite um nome para o cômodo.");
        return;
    }
    
    // Cria um ID único baseado no nome e data para evitar conflitos
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now().toString().slice(-4);
    
    rooms.push({ id, name });
    
    // Inicializa dados para este novo quarto
    initializeData();
    
    // Renderiza e muda para o novo quarto
    renderApp();
    switchRoom(id);
    
    input.value = ''; // Limpa input
}

function deleteRoom(roomId) {
    if(!confirm("Tem certeza que deseja excluir este cômodo e todos os itens dele?")) {
        return;
    }
    
    // Remove da lista de quartos
    rooms = rooms.filter(r => r.id !== roomId);
    
    // Remove dos dados (opcional, mas bom para liberar memória se o app fosse crescer)
    delete houseData[roomId];
    delete checklistData[roomId];
    
    renderApp();
    
    // Se sobrar quartos, vai para o primeiro. Se não, tela fica vazia.
    if(rooms.length > 0) {
        switchRoom(rooms[0].id);
    }
}


// --- Lógica Checklist ---

function renderChecklist(roomId, category) {
    // Verificação de segurança caso o cômodo tenha sido deletado
    if(!checklistData[roomId]) return;

    const checkContainer = document.getElementById(`check-${roomId}-${category}`);
    checkContainer.innerHTML = '';

    const allCheckItems = checklistData[roomId][category];
    const purchasedItems = houseData[roomId][category].map(i => i.name.toLowerCase().trim());

    allCheckItems.forEach((checkItemName, index) => {
        const isPurchased = purchasedItems.includes(checkItemName.toLowerCase().trim());

        if (!isPurchased) {
            const tag = document.createElement('div');
            tag.className = 'checklist-tag';
            tag.innerHTML = `
                <span onclick="fillForm('${roomId}', '${category}', '${checkItemName}')">${checkItemName} <i class="fas fa-plus-circle"></i></span>
                <span class="remove-check-btn" onclick="removeFromChecklist('${roomId}', '${category}', ${index})">x</span>
            `;
            checkContainer.appendChild(tag);
        }
    });
    
    if (checkContainer.children.length === 0) {
        checkContainer.innerHTML = '<span style="font-size:0.8rem; color:#aaa;">Tudo comprado ou lista vazia.</span>';
    }
}

function fillForm(roomId, category, itemName) {
    document.getElementById(`input-${roomId}-${category}-name`).value = itemName;
    document.getElementById(`input-${roomId}-${category}-price`).focus();
}

function addToChecklist(roomId, category) {
    const input = document.getElementById(`new-check-${roomId}-${category}`);
    const val = input.value.trim();
    if (val) {
        checklistData[roomId][category].push(val);
        input.value = '';
        renderChecklist(roomId, category);
    }
}

function removeFromChecklist(roomId, category, index) {
    checklistData[roomId][category].splice(index, 1);
    renderChecklist(roomId, category);
}

// --- Adicionar Item ---

function switchRoom(roomId) {
    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`button[data-target="${roomId}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    document.querySelectorAll('.room-section').forEach(sec => sec.classList.remove('active'));
    const activeSec = document.getElementById(`section-${roomId}`);
    if(activeSec) activeSec.classList.add('active');
}

function addItem(roomId, category) {
    const nameInput = document.getElementById(`input-${roomId}-${category}-name`);
    const priceInput = document.getElementById(`input-${roomId}-${category}-price`);
    const descInput = document.getElementById(`input-${roomId}-${category}-desc`);
    const linkInput = document.getElementById(`input-${roomId}-${category}-link`);
    const fileInput = document.getElementById(`input-${roomId}-${category}-img`);

    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const desc = descInput.value.trim();
    const link = linkInput.value;
    const file = fileInput.files[0];

    if (!name || isNaN(price)) {
        alert("Preencha o nome e o valor.");
        return;
    }

    const processItem = (imgSrc) => {
        const newItem = {
            id: Date.now(),
            name,
            price,
            desc,
            link,
            img: imgSrc
        };

        houseData[roomId][category].push(newItem);

        // Limpar inputs
        nameInput.value = '';
        priceInput.value = '';
        descInput.value = '';
        linkInput.value = '';
        fileInput.value = '';

        renderLists(roomId, category);
        renderChecklist(roomId, category); 
        updateAllTotals();
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { processItem(e.target.result); };
        reader.readAsDataURL(file);
    } else {
        processItem('https://via.placeholder.com/60?text=Foto');
    }
}

function removeItem(roomId, category, itemId) {
    houseData[roomId][category] = houseData[roomId][category].filter(item => item.id !== itemId);
    renderLists(roomId, category);
    renderChecklist(roomId, category);
    updateAllTotals();
}

function renderLists(roomId, category) {
    // Segurança
    if(!houseData[roomId]) return;

    const listEl = document.getElementById(`list-${roomId}-${category}`);
    listEl.innerHTML = '';

    houseData[roomId][category].forEach(item => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.innerHTML = `
            <img src="${item.img}" alt="Foto" class="item-img">
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-price">${formatCurrency(item.price)}</span>
                ${item.desc ? `<span class="item-desc">${item.desc}</span>` : ''}
                ${item.link ? `<a href="${item.link}" target="_blank" class="item-link">Ver Link</a>` : ''}
            </div>
            <button class="delete-btn" onclick="removeItem('${roomId}', '${category}', ${item.id})"><i class="fas fa-trash"></i></button>
        `;
        listEl.appendChild(li);
    });
}

function updateAllTotals() {
    let globalEssential = 0, globalCommon = 0, globalDesejado = 0;

    rooms.forEach(room => {
        const rId = room.id;
        // Se o quarto foi deletado, ignora
        if(!houseData[rId]) return;

        const rEss = houseData[rId].essencial.reduce((a, b) => a + b.price, 0);
        const rCom = houseData[rId].comum.reduce((a, b) => a + b.price, 0);
        const rDes = houseData[rId].desejado.reduce((a, b) => a + b.price, 0);
        
        // Atualiza UI local se o elemento existir (pode estar oculto mas existe no DOM)
        const elEss = document.getElementById(`total-${rId}-essencial`);
        if(elEss) {
            elEss.innerText = formatCurrency(rEss);
            document.getElementById(`total-${rId}-comum`).innerText = formatCurrency(rCom);
            document.getElementById(`total-${rId}-desejado`).innerText = formatCurrency(rDes);
            document.getElementById(`total-${rId}-combined`).innerText = formatCurrency(rEss + rCom + rDes);
        }

        globalEssential += rEss;
        globalCommon += rCom;
        globalDesejado += rDes;
    });

    document.getElementById('global-essential').innerText = formatCurrency(globalEssential);
    document.getElementById('global-common').innerText = formatCurrency(globalCommon);
    document.getElementById('global-desejado').innerText = formatCurrency(globalDesejado);
    document.getElementById('global-combined').innerText = formatCurrency(globalEssential + globalCommon + globalDesejado);
}

function formatCurrency(val) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Inicia
init();