// --- Configuração dos Cômodos ---
const rooms = [
    { id: 'sala', name: 'Sala' },
    { id: 'cozinha', name: 'Cozinha' },
    { id: 'quarto1', name: 'Quarto 1' },
    { id: 'quarto2', name: 'Quarto 2' },
    { id: 'banheiro', name: 'Banheiro' },
    { id: 'area', name: 'Área de Lavar' }
];

// --- Dados ---
let houseData = {};

rooms.forEach(room => {
    houseData[room.id] = {
        essencial: [],
        comum: []
    };
});

// --- Inicialização ---
function init() {
    renderNav();
    renderRooms();
    switchRoom(rooms[0].id);
    updateAllTotals();
}

function renderNav() {
    const nav = document.getElementById('room-nav');
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
    rooms.forEach(room => {
        const section = document.createElement('div');
        section.className = 'room-section';
        section.id = `section-${room.id}`;
        
        section.innerHTML = `
            <div class="room-header">
                <h2>${room.name}</h2>
                <div class="room-stats">
                    <div>Essenciais: <span id="total-${room.id}-essencial">R$ 0,00</span></div>
                    <div>Comuns: <span id="total-${room.id}-comum">R$ 0,00</span></div>
                    <div style="font-weight:bold; color:var(--accent-dark)">Total Cômodo: <span id="total-${room.id}-combined">R$ 0,00</span></div>
                </div>
            </div>

            <div class="columns-wrapper">
                <div class="column">
                    <h3>Essenciais Básicos</h3>
                    <div class="add-form">
                        <input type="text" id="input-${room.id}-essencial-name" placeholder="Nome do Produto">
                        <input type="number" id="input-${room.id}-essencial-price" placeholder="Valor (R$)" step="0.01">
                        <input type="text" id="input-${room.id}-essencial-link" placeholder="Link do Produto">
                        <label style="font-size:0.8rem; color:#666;">Foto do Produto:</label>
                        <input type="file" id="input-${room.id}-essencial-img" accept="image/*">
                        <button class="add-btn" onclick="addItem('${room.id}', 'essencial')">+ Adicionar Item</button>
                    </div>
                    <ul class="item-list" id="list-${room.id}-essencial"></ul>
                </div>

                <div class="column">
                    <h3>Itens Comuns / Secundários</h3>
                    <div class="add-form">
                        <input type="text" id="input-${room.id}-comum-name" placeholder="Nome do Produto">
                        <input type="number" id="input-${room.id}-comum-price" placeholder="Valor (R$)" step="0.01">
                        <input type="text" id="input-${room.id}-comum-link" placeholder="Link do Produto">
                        <label style="font-size:0.8rem; color:#666;">Foto do Produto:</label>
                        <input type="file" id="input-${room.id}-comum-img" accept="image/*">
                        <button class="add-btn" onclick="addItem('${room.id}', 'comum')">+ Adicionar Item</button>
                    </div>
                    <ul class="item-list" id="list-${room.id}-comum"></ul>
                </div>
            </div>
        `;
        container.appendChild(section);
    });
}

// --- Lógica Principal ---

function switchRoom(roomId) {
    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`button[data-target="${roomId}"]`).classList.add('active');
    document.querySelectorAll('.room-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`section-${roomId}`).classList.add('active');
}

function addItem(roomId, category) {
    const nameInput = document.getElementById(`input-${roomId}-${category}-name`);
    const priceInput = document.getElementById(`input-${roomId}-${category}-price`);
    const linkInput = document.getElementById(`input-${roomId}-${category}-link`);
    const fileInput = document.getElementById(`input-${roomId}-${category}-img`);

    const name = nameInput.value;
    const price = parseFloat(priceInput.value);
    const link = linkInput.value;
    const file = fileInput.files[0]; // Pega o arquivo de imagem

    if (!name || isNaN(price)) {
        alert("Por favor, preencha o nome e o valor corretamente.");
        return;
    }

    // Função interna para processar e adicionar o item
    const processItem = (imgSrc) => {
        const newItem = {
            id: Date.now(),
            name,
            price,
            link,
            img: imgSrc
        };

        houseData[roomId][category].push(newItem);

        // Limpar inputs
        nameInput.value = '';
        priceInput.value = '';
        linkInput.value = '';
        fileInput.value = ''; // Limpa o arquivo selecionado

        renderLists(roomId, category);
        updateAllTotals();
    };

    // Verifica se tem imagem para carregar
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            processItem(e.target.result); // Passa a imagem convertida
        };
        reader.readAsDataURL(file);
    } else {
        processItem('https://via.placeholder.com/60?text=Sem+Foto'); // Imagem padrão
    }
}

function removeItem(roomId, category, itemId) {
    houseData[roomId][category] = houseData[roomId][category].filter(item => item.id !== itemId);
    renderLists(roomId, category);
    updateAllTotals();
}

function renderLists(roomId, category) {
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
                <br>
                ${item.link ? `<a href="${item.link}" target="_blank" class="item-link">Ver Produto</a>` : ''}
            </div>
            <button class="delete-btn" onclick="removeItem('${roomId}', '${category}', ${item.id})">X</button>
        `;
        listEl.appendChild(li);
    });
}

// --- Cálculos ---

function updateAllTotals() {
    let globalEssential = 0;
    let globalCommon = 0;

    rooms.forEach(room => {
        const roomId = room.id;
        
        const roomCommon = houseData[roomId].comum.reduce((acc, item) => acc + item.price, 0);
        const roomEssential = houseData[roomId].essencial.reduce((acc, item) => acc + item.price, 0);
        const roomCombined = roomCommon + roomEssential;

        document.getElementById(`total-${roomId}-essencial`).innerText = formatCurrency(roomEssential);
        document.getElementById(`total-${roomId}-comum`).innerText = formatCurrency(roomCommon);
        document.getElementById(`total-${roomId}-combined`).innerText = formatCurrency(roomCombined);

        globalEssential += roomEssential;
        globalCommon += roomCommon;
    });

    const globalCombined = globalEssential + globalCommon;

    document.getElementById('global-essential').innerText = formatCurrency(globalEssential);
    document.getElementById('global-common').innerText = formatCurrency(globalCommon);
    document.getElementById('global-combined').innerText = formatCurrency(globalCombined);
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Inicia
init();