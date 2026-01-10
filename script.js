// --- DADOS E CONFIGURAÇÕES ---
const defaultCategories = ['essencial', 'comum', 'desejado'];

let rooms = []; 
let houseData = {}; 
let checklistData = {};
let wallet = { balance: 0, history: [] };
let investments = [];
let currentRoomId = null;
let currentCryptoPrices = {};

// Variáveis Globais
let appClipboard = null;
let hoveredItemData = null;
let tempEditImages = [];

// --- INICIALIZAÇÃO ---
window.loadUserData = async (uid) => {
    try {
        const docRef = window.doc(window.db, "users", uid);
        const docSnap = await window.getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Migração de estrutura antiga
            if (data.sections && (!data.rooms || data.rooms.length === 0)) {
                console.log("Migrando estrutura...");
                rooms = [];
                data.sections.forEach(sec => {
                    if (sec.rooms) sec.rooms.forEach(r => rooms.push(r));
                });
            } else {
                rooms = data.rooms || [];
            }

            houseData = data.houseData || {};
            checklistData = data.checklistData || {};
            wallet = data.wallet || { balance: 0, history: [] };
            investments = data.investments || [];
        } else {
            rooms = [{ id: 'sala', name: 'Sala' }, { id: 'cozinha', name: 'Cozinha' }];
            rooms.forEach(room => initializeRoomData(room));
            saveData();
        }
        
        if(rooms.length > 0) switchRoom(rooms[0].id);
        renderRoomsNav();
        updateWalletUI();
        refreshCryptoPrices();
        renderCryptoList();
        setupKeyboardShortcuts();
        setupEditModalImageInput();
    } catch (e) { 
        console.error("Erro load:", e); 
        alert("Erro ao carregar dados: " + e.message);
    }
};

// --- SALVAMENTO BLINDADO ---
const saveData = async (isManual = false) => {
    if (!window.currentUser) {
        if(isManual) alert("Você precisa estar logado para salvar!");
        return;
    }
    const uid = window.currentUser.uid;
    
    // PREPARAÇÃO DOS DADOS (LIMPEZA)
    // Isso remove valores 'undefined' que fazem o Firebase travar
    const rawData = { rooms, houseData, checklistData, wallet, investments };
    const dataToSave = JSON.parse(JSON.stringify(rawData)); 
    
    try { 
        await window.setDoc(window.doc(window.db, "users", uid), dataToSave, { merge: true }); 
        if(!isManual) showToast("Salvo automaticamente.");
    } catch (e) { 
        console.error("Erro save:", e); 
        // Mostra o erro exato na tela para facilitar o diagnóstico
        alert(`ERRO AO SALVAR!\nCódigo: ${e.code}\nMensagem: ${e.message}`);
    }
};

window.manualSaveAndExit = async () => {
    if(!window.currentUser) { alert("Você não está logado."); return; }
    
    const btn = document.querySelector('.btn-save-exit');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    await saveData(true);

    btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    setTimeout(() => {
        alert("Dados salvos com sucesso! Você pode fechar ou sair.");
        window.logout();
    }, 500);
};

function showToast(msg) {
    const existing = document.querySelector('.toast-notification');
    if(existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'toast-notification';
    div.innerHTML = `<i class="fas fa-check-circle" style="color:#4CAF50;"></i> ${msg}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2500);
}

function initializeRoomData(room) {
    if (!houseData[room.id]) {
        houseData[room.id] = {};
        defaultCategories.forEach(cat => houseData[room.id][cat] = []);
        checklistData[room.id] = {};
    }
}

// --- LOG UNIFICADO E DELETE ---
function logTransaction(type, desc, val) {
    const id = Date.now() + Math.random(); 
    wallet.history.unshift({ id, type, desc, val, date: new Date().toLocaleDateString() });
    if(wallet.history.length > 50) wallet.history.pop();
    updateWalletUI();
}

window.deleteTransaction = (id) => {
    const index = wallet.history.findIndex(x => x.id === id);
    if(index === -1) return;
    
    const item = wallet.history[index];
    
    // Reverte o saldo (apenas visual, pois o histórico é o registro)
    if(item.type === 'add') {
        wallet.balance -= item.val;
    } else if (item.type === 'remove') {
        wallet.balance += item.val;
    }
    
    wallet.history.splice(index, 1);
    updateWalletUI();
    updateAllTotals();
    saveData();
    showToast("Transação removida.");
};

// --- CARTEIRA ---
window.handleTransaction = (type) => {
    const descInput = document.getElementById('trans-desc');
    const valInput = document.getElementById('trans-val');
    const desc = descInput.value.trim() || (type === 'add' ? 'Depósito' : 'Retirada');
    const val = parseFloat(valInput.value);
    
    if (isNaN(val) || val <= 0) { alert("Valor inválido."); return; }
    
    wallet.balance = parseFloat(wallet.balance) || 0;
    
    if (type === 'add') { 
        wallet.balance += val; 
        logTransaction('add', desc, val);
    } else { 
        wallet.balance -= val; 
        logTransaction('remove', desc, val);
    }
    
    descInput.value = ''; valInput.value = '';
    saveData(); updateAllTotals();
};

function updateWalletUI() {
    const bal = parseFloat(wallet.balance) || 0;
    document.getElementById('wallet-balance').innerText = formatCurrency(bal);
    const list = document.getElementById('wallet-history');
    list.innerHTML = '';
    
    wallet.history.slice(0, 10).forEach(item => {
        const li = document.createElement('li');
        let colorClass = 'hist-plus'; let signal = '+';
        if(item.type === 'remove') { colorClass = 'hist-minus'; signal = '-'; }
        if(item.type.includes('crypto')) { colorClass = 'hist-crypto'; signal = ''; }
        
        const valText = item.type.includes('crypto') ? '' : `${signal} ${formatCurrency(item.val)}`;
        
        li.innerHTML = `
            <div style="flex-grow:1;">
                <span style="font-size:0.85rem; display:block;">${item.desc}</span> 
                <span class="${colorClass}" style="font-weight:bold; font-size:0.8rem;">${valText}</span>
            </div>
            <button class="btn-del-hist" onclick="deleteTransaction(${item.id})"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(li);
    });
}

// --- CRIPTO ---
window.addCrypto = () => {
    const coin = document.getElementById('crypto-select').value;
    const amount = parseFloat(document.getElementById('crypto-amount').value);
    if(isNaN(amount) || amount <= 0) { alert("Quantidade inválida"); return; }
    
    const existing = investments.find(i => i.coinId === coin);
    if(existing) { existing.amount += amount; } else { investments.push({ coinId: coin, amount: amount }); }
    
    logTransaction('crypto-add', `Comprou ${amount} ${coin.toUpperCase()}`, 0);
    document.getElementById('crypto-amount').value = '';
    renderCryptoList(); saveData(); refreshCryptoPrices();
};

window.removeCrypto = (coinId) => {
    const item = investments.find(i => i.coinId === coinId);
    if(!item) return;
    if(confirm(`Remover todo o saldo de ${coinId.toUpperCase()}?`)) {
        investments = investments.filter(i => i.coinId !== coinId);
        logTransaction('crypto-rem', `Vendeu ${item.amount} ${coinId.toUpperCase()}`, 0);
        renderCryptoList(); saveData(); updateCryptoTotal();
    }
};

window.refreshCryptoPrices = async () => {
    const btn = document.querySelector('.refresh-btn');
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const ids = 'bitcoin,ethereum,solana,tether,ripple'; 
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl`);
        currentCryptoPrices = await res.json();
        updateCryptoTotal();
    } catch(e) { console.error("Erro API Cripto:", e); } finally { if(btn) btn.innerHTML = '<i class="fas fa-sync-alt"></i>'; }
};

function updateCryptoTotal() {
    let totalBRL = 0;
    const list = document.getElementById('crypto-list');
    if(list) list.innerHTML = ''; 
    investments.forEach(inv => {
        const price = currentCryptoPrices[inv.coinId] ? currentCryptoPrices[inv.coinId].brl : 0;
        const valBRL = inv.amount * price;
        totalBRL += valBRL;
        const li = document.createElement('li');
        li.innerHTML = `<span>${inv.coinId.toUpperCase()} (${inv.amount})</span><div style="display:flex; gap:10px; align-items:center;"><span style="color:#f3ba2f;">${price>0 ? formatCurrency(valBRL) : '...'}</span><i class="fas fa-trash" style="cursor:pointer; color:#ef5350;" onclick="removeCrypto('${inv.coinId}')"></i></div>`;
        list.appendChild(li);
    });
    document.getElementById('crypto-total-brl').innerText = formatCurrency(totalBRL);
    updateAllTotals(totalBRL);
}
function renderCryptoList() { updateCryptoTotal(); }

// --- NAV DE CÔMODOS ---
function renderRoomsNav() {
    const nav = document.getElementById('room-nav'); nav.innerHTML = '';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-tab-btn';
    addBtn.innerHTML = '<i class="fas fa-plus"></i>';
    addBtn.onclick = () => { document.getElementById('modal-room-name').value = ''; document.getElementById('modal-room-bg').value = '#19191a'; document.getElementById('modal-room-text').value = '#888888'; updateRoomPreview(); document.getElementById('new-room-modal').style.display='flex'; };
    nav.appendChild(addBtn);

    rooms.forEach(room => {
        const btn = document.createElement('button'); btn.className = 'room-btn'; btn.innerText = room.name;
        if (room.id === currentRoomId) btn.classList.add('active');
        if (room.bgColor) btn.style.backgroundColor = room.bgColor;
        if (room.textColor) btn.style.color = room.textColor;
        btn.onclick = () => switchRoom(room.id); btn.dataset.target = room.id;
        btn.ondragover = (e) => { e.preventDefault(); btn.classList.add('drag-over-tab'); };
        btn.ondragleave = (e) => { btn.classList.remove('drag-over-tab'); };
        btn.ondrop = (e) => dropOnRoom(e, room.id);
        nav.appendChild(btn);
    });
}

window.updateRoomPreview = () => {
    const name = document.getElementById('modal-room-name').value || 'Nome do Cômodo';
    const bg = document.getElementById('modal-room-bg').value;
    const txt = document.getElementById('modal-room-text').value;
    const preview = document.getElementById('room-preview-box');
    preview.innerText = name; preview.style.backgroundColor = bg; preview.style.color = txt;
};

window.saveNewRoom = () => {
    const name = document.getElementById('modal-room-name').value.trim(); 
    const bgColor = document.getElementById('modal-room-bg').value;
    const textColor = document.getElementById('modal-room-text').value;
    if(!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g,'')+'-'+Date.now();
    rooms.push({id, name, bgColor, textColor});
    initializeRoomData({id, name}); 
    document.getElementById('new-room-modal').style.display='none';
    renderRoomsNav(); switchRoom(id); updateAllTotals(); saveData();
};

window.deleteCurrentRoom = () => {
    if(!currentRoomId || !confirm("Excluir este cômodo e todos os itens dele?")) return;
    rooms = rooms.filter(r => r.id !== currentRoomId);
    delete houseData[currentRoomId];
    saveData();
    if(rooms.length > 0) switchRoom(rooms[0].id);
    else { currentRoomId = null; renderRoomsNav(); document.getElementById('main-container').innerHTML = '<div style="text-align:center; padding:30px;">Sem cômodos.</div>'; }
    updateAllTotals();
};

window.switchRoom = (roomId) => {
    currentRoomId = roomId;
    renderRoomsNav();
    if (!houseData[roomId]) initializeRoomData({id: roomId});
    
    const container = document.getElementById('main-container');
    const roomObj = rooms.find(r => r.id === roomId);
    const roomName = roomObj ? roomObj.name : 'Cômodo';
    const categories = Object.keys(houseData[roomId]).filter(k => Array.isArray(houseData[roomId][k]));
    
    let columnsHTML = '';
    categories.forEach(cat => {
        columnsHTML += renderColumnHTML(roomId, cat, capitalize(cat));
    });

    container.innerHTML = `
        <div class="room-section active" id="section-${roomId}">
            <div class="room-header">
                <div style="display:flex; align-items:center;">
                    <h2>${roomName}</h2>
                    <button class="btn-add-list" onclick="openNewListModal()"><i class="fas fa-plus"></i> Nova Lista</button>
                    <button class="btn-delete-room" onclick="deleteCurrentRoom()"><i class="fas fa-trash"></i> Excluir</button>
                </div>
                <div class="room-stats" id="room-stat-${roomId}">Total: R$ 0,00</div>
            </div>
            <div class="columns-wrapper">${columnsHTML}</div>
        </div>`;
    
    categories.forEach(cat => { renderLists(roomId, cat); });
    updateAllTotals(); 
};

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function renderColumnHTML(r, c, t) {
    return `<div class="column">
        <h3>
            <span>${t} 
                <button class="btn-edit-list-name" onclick="editListName('${r}', '${c}')"><i class="fas fa-pen"></i></button>
                <button class="btn-delete-list" onclick="deleteList('${r}', '${c}')"><i class="fas fa-trash"></i></button>
            </span>
            <span class="col-total" id="total-${r}-${c}">R$ 0</span>
        </h3>
        <div class="add-form">
            <div class="input-group-row"><input type="text" id="in-${r}-${c}-link" placeholder="Link"><button class="ai-action-btn" onclick="autoFillFromLink('${r}','${c}')" title="IA"><i class="fas fa-magic" id="icon-${r}-${c}"></i></button></div>
            <input type="text" id="in-${r}-${c}-name" placeholder="Nome"><input type="number" id="in-${r}-${c}-price" placeholder="R$" step="0.01">
            <textarea id="in-${r}-${c}-desc" placeholder="Detalhes"></textarea>
            <input type="file" id="in-${r}-${c}-img" accept="image/*" multiple class="hidden-file-input">
            <label for="in-${r}-${c}-img" class="file-upload-btn"><i class="fas fa-images"></i> Fotos</label>
            <button class="add-btn" onclick="addItem('${r}','${c}')">Adicionar</button>
        </div>
        <ul class="item-list" id="list-${r}-${c}" ondragover="allowDrop(event)" ondragleave="leaveDrop(event)" ondrop="dropItem(event, '${r}', '${c}')"></ul>
    </div>`;
}

window.deleteList = (r, c) => {
    if(confirm(`Tem certeza que deseja excluir a lista "${capitalize(c)}"?`)) { delete houseData[r][c]; saveData(); switchRoom(r); updateAllTotals(); }
};

window.openNewListModal = () => { document.getElementById('modal-list-name').value = ''; document.getElementById('target-current').checked = true; document.getElementById('manual-selection-wrapper').style.display = 'none'; document.getElementById('room-selection-container').style.display = 'none'; setupRoomCheckboxes(); document.getElementById('new-list-modal').style.display = 'flex'; };
window.toggleListSelection = (val) => { document.getElementById('manual-selection-wrapper').style.display = (val === 'select') ? 'block' : 'none'; };
window.toggleRoomDropdown = () => { const el = document.getElementById('room-selection-container'); const arrow = document.getElementById('selector-arrow'); if (el.style.display === 'none') { el.style.display = 'block'; arrow.style.transform = 'rotate(180deg)'; } else { el.style.display = 'none'; arrow.style.transform = 'rotate(0deg)'; } };
function setupRoomCheckboxes() { const c = document.getElementById('room-selection-container'); c.innerHTML = ''; rooms.forEach(r => { const div = document.createElement('div'); div.className = 'room-checkbox-row'; div.innerHTML = `<label><input type="checkbox" value="${r.id}" ${r.id===currentRoomId?'checked':''}> ${r.name}</label>`; c.appendChild(div); }); }
window.saveNewList = () => { const name = document.getElementById('modal-list-name').value.trim(); if(!name) return; const listId = name.toLowerCase().replace(/[^a-z0-9]/g, '-'); const target = document.querySelector('input[name="add-list-target"]:checked').value; let targets = []; if(target === 'current') targets.push(currentRoomId); else if(target === 'global') rooms.forEach(r => targets.push(r.id)); else if(target === 'select') document.querySelectorAll('#room-selection-container input:checked').forEach(cb => targets.push(cb.value)); targets.forEach(rid => { if(!houseData[rid]) houseData[rid] = {}; if(!houseData[rid][listId]) houseData[rid][listId] = []; }); document.getElementById('new-list-modal').style.display = 'none'; if(targets.includes(currentRoomId)) switchRoom(currentRoomId); updateAllTotals(); saveData(); };
window.editListName = (r, old) => { const n = prompt("Novo nome:", old); if(n && n !== old) { const k = n.toLowerCase().trim().replace(/\s+/g, '-'); if(houseData[r][k]) { alert("Nome já existe!"); return; } houseData[r][k] = houseData[r][old]; delete houseData[r][old]; saveData(); switchRoom(r); } };

// ... [Funções Imagem/Drag/Drop/Edit] ...
window.changeImage = (e, direction, r, c, itemId) => { e.stopPropagation(); const item = houseData[r][c].find(i => i.id === itemId); if (!item) return; const imgs = Array.isArray(item.imgs) ? item.imgs : (item.img ? [item.img] : ['https://via.placeholder.com/150/000/fff?text=Sem+Foto']); const imgEl = document.getElementById(`img-el-${itemId}`); let currentIndex = parseInt(imgEl.dataset.index) || 0; let newIndex = currentIndex + direction; if (newIndex >= imgs.length) newIndex = 0; if (newIndex < 0) newIndex = imgs.length - 1; imgEl.src = imgs[newIndex]; imgEl.dataset.index = newIndex; const countEl = document.getElementById(`img-count-${itemId}`); if(countEl) countEl.innerText = `${newIndex + 1}/${imgs.length}`; };
function renderLists(r, c) { const ul = document.getElementById(`list-${r}-${c}`); ul.innerHTML=''; if(!houseData[r] || !houseData[r][c]) return; houseData[r][c].forEach(i => { const li = document.createElement('li'); const bought = i.status==='bought'; li.className=`item-card ${bought?'bought':''}`; li.setAttribute('draggable', 'true'); li.ondragstart = (e) => dragStart(e, r, c, i.id); li.onclick = () => openEditModal(r, c, i.id); li.onmouseenter = () => { hoveredItemData = { r, c, item: i }; }; li.onmouseleave = () => { hoveredItemData = null; }; const images = Array.isArray(i.imgs) && i.imgs.length > 0 ? i.imgs : (i.img ? [i.img] : ['https://via.placeholder.com/150/000/fff?text=Sem+Foto']); const showArrows = images.length > 1; li.innerHTML=`<div class="carousel-wrapper">${showArrows ? `<button class="carousel-btn prev-btn" onclick="changeImage(event, -1, '${r}', '${c}', ${i.id})">❮</button>` : ''}<img src="${images[0]}" class="item-img" id="img-el-${i.id}" data-index="0">${showArrows ? `<button class="carousel-btn next-btn" onclick="changeImage(event, 1, '${r}', '${c}', ${i.id})">❯</button>` : ''}${showArrows ? `<span class="img-counter" id="img-count-${i.id}">1/${images.length}</span>` : ''}</div><div class="item-info"><span class="item-name">${i.name}</span><span class="item-price">${formatCurrency(i.price)}</span>${i.desc?`<span class="item-desc">${i.desc}</span>`:''} ${i.link?`<a href="${i.link}" target="_blank" class="item-link" onclick="event.stopPropagation()">Link <i class="fas fa-external-link-alt"></i></a>`:''}<label class="status-switch" onclick="event.stopPropagation()"><input type="checkbox" ${bought?'checked':''} onchange="toggleStatus('${r}','${c}',${i.id})"><span class="slider"><span class="status-label label-comprado">COMPRADO</span><span class="status-label label-pendente">PENDENTE</span></span></label></div><button class="delete-btn" onclick="event.stopPropagation(); removeItem('${r}','${c}',${i.id})"><i class="fas fa-trash"></i></button>`; ul.appendChild(li); }); }
window.addItem = async (r, c) => { const name = document.getElementById(`in-${r}-${c}-name`).value.trim(); const price = parseFloat(document.getElementById(`in-${r}-${c}-price`).value); const desc = document.getElementById(`in-${r}-${c}-desc`).value; const link = document.getElementById(`in-${r}-${c}-link`).value; const fileIn = document.getElementById(`in-${r}-${c}-img`); const files = fileIn.files; const remote = fileIn.getAttribute('data-remote'); if(!name || isNaN(price)) { alert("Nome e Preço são obrigatórios!"); return; } const processFiles = async () => { if (files.length > 0) { const promises = Array.from(files).map(file => { return new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(file); }); }); return Promise.all(promises); } else if (remote) { return [remote]; } else { return ['https://via.placeholder.com/150/000/fff?text=Sem+Foto']; } }; const finalImages = await processFiles(); houseData[r][c].push({ id: Date.now(), name, price, desc, link, imgs: finalImages, status: 'pending' }); document.getElementById(`in-${r}-${c}-name`).value=''; document.getElementById(`in-${r}-${c}-price`).value=''; document.getElementById(`in-${r}-${c}-desc`).value=''; document.getElementById(`in-${r}-${c}-link`).value=''; fileIn.value=''; fileIn.removeAttribute('data-remote'); document.querySelector(`label[for="in-${r}-${c}-img"]`).innerHTML = '<i class="fas fa-images"></i> Fotos'; renderLists(r, c); updateAllTotals(); saveData(); };
window.autoFillFromLink = async (r, c) => { const link = document.getElementById(`in-${r}-${c}-link`).value; const icon = document.getElementById(`icon-${r}-${c}`); if(!link) return; icon.className="fas fa-spinner fa-spin"; try { const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(link)}&palette=true`); const d = await res.json(); if(d.status==='success') { const m = d.data; if(m.title) document.getElementById(`in-${r}-${c}-name`).value = m.title.substring(0,40); if(m.description) document.getElementById(`in-${r}-${c}-desc`).value = m.description; if(m.image?.url) { const imgIn = document.getElementById(`in-${r}-${c}-img`); imgIn.setAttribute('data-remote', m.image.url); document.querySelector(`label[for="in-${r}-${c}-img"]`).innerHTML = '<i class="fas fa-check"></i> Foto IA Encontrada'; } } } catch(e) { console.error(e); } finally { icon.className="fas fa-magic"; } };
window.removeItem = (r,c,id) => { houseData[r][c]=houseData[r][c].filter(i=>i.id!==id); renderLists(r,c); updateAllTotals(); saveData(); };
window.toggleStatus = (r,c,id) => { const i=houseData[r][c].find(x=>x.id===id); if(i) i.status=(i.status==='bought'?'pending':'bought'); renderLists(r,c); updateAllTotals(); saveData(); };
window.dragStart = (e, r, c, id) => { e.target.classList.add('dragging'); e.dataTransfer.setData("text/plain", JSON.stringify({ r, c, id })); };
window.allowDrop = (e) => { e.preventDefault(); const list = e.target.closest('ul'); if(list) list.classList.add('drag-over'); };
window.leaveDrop = (e) => { const list = e.target.closest('ul'); if(list) list.classList.remove('drag-over'); };
window.dropItem = (e, targetR, targetC) => { e.preventDefault(); const list = e.target.closest('ul'); if(list) list.classList.remove('drag-over'); try { const data = JSON.parse(e.dataTransfer.getData("text/plain")); const { r: originR, c: originC, id: itemId } = data; if (originR === targetR && originC === targetC) return; const itemIndex = houseData[originR][originC].findIndex(i => i.id === itemId); if (itemIndex === -1) return; const item = houseData[originR][originC][itemIndex]; houseData[originR][originC].splice(itemIndex, 1); houseData[targetR][targetC].push(item); renderLists(originR, originC); renderLists(targetR, targetC); updateAllTotals(); saveData(); } catch (err) { console.error("Drop error:", err); } };
window.dropOnRoom = (e, targetRoomId) => { e.preventDefault(); const btn = document.querySelector(`button[data-target="${targetRoomId}"]`); if(btn) btn.classList.remove('drag-over-tab'); try { const data = JSON.parse(e.dataTransfer.getData("text/plain")); const { r: originR, c: originC, id: itemId } = data; if (originR === targetRoomId) return; const itemIndex = houseData[originR][originC].findIndex(i => i.id === itemId); if (itemIndex === -1) return; const item = houseData[originR][originC][itemIndex]; houseData[originR][originC].splice(itemIndex, 1); const targetCat = houseData[targetRoomId][originC] ? originC : Object.keys(houseData[targetRoomId])[0]; houseData[targetRoomId][targetCat].push(item); renderLists(originR, originC); showToast(`Item movido.`); updateAllTotals(); saveData(); } catch (err) { console.error("Room Drop error:", err); } };
function setupKeyboardShortcuts() { document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'c') { if (hoveredItemData) { appClipboard = JSON.parse(JSON.stringify(hoveredItemData)); showToast(`Copiado: ${appClipboard.item.name}`); } } if ((e.ctrlKey || e.metaKey) && e.key === 'v') { if (appClipboard && currentRoomId) { const newItem = { ...appClipboard.item, id: Date.now(), status: 'pending', name: appClipboard.item.name + ' (Cópia)' }; const targetCat = houseData[currentRoomId][appClipboard.c] ? appClipboard.c : Object.keys(houseData[currentRoomId])[0]; houseData[currentRoomId][targetCat].push(newItem); renderLists(currentRoomId, targetCat); updateAllTotals(); saveData(); showToast(`Colado.`); } } }); }
window.openEditModal = (r, c, id) => { const item = houseData[r][c].find(i => i.id === id); if (!item) return; tempEditImages = Array.isArray(item.imgs) && item.imgs.length > 0 ? [...item.imgs] : (item.img ? [item.img] : []); document.getElementById('edit-r-origin').value = r; document.getElementById('edit-c-origin').value = c; document.getElementById('edit-id').value = id; document.getElementById('edit-name').value = item.name; document.getElementById('edit-price').value = item.price; document.getElementById('edit-link').value = item.link || ''; document.getElementById('edit-desc').value = item.desc || ''; renderEditGallery(); const roomSelect = document.getElementById('edit-move-room'); roomSelect.innerHTML = ''; rooms.forEach(room => { const opt = document.createElement('option'); opt.value = room.id; opt.text = room.name; if(room.id === r) opt.selected = true; roomSelect.appendChild(opt); }); const catSelect = document.getElementById('edit-move-cat'); catSelect.innerHTML = ''; Object.keys(houseData[r]).forEach(cat => { const opt = document.createElement('option'); opt.value = cat; opt.text = capitalize(cat); if(cat === c) opt.selected = true; catSelect.appendChild(opt); }); roomSelect.onchange = (e) => { const selectedRoom = e.target.value; catSelect.innerHTML = ''; Object.keys(houseData[selectedRoom]).forEach(cat => { const opt = document.createElement('option'); opt.value = cat; opt.text = capitalize(cat); catSelect.appendChild(opt); }); }; document.getElementById('edit-modal').style.display = 'flex'; };
window.renderEditGallery = () => { const container = document.getElementById('edit-gallery-container'); container.innerHTML = ''; tempEditImages.forEach((img, idx) => { const wrapper = document.createElement('div'); wrapper.className = 'edit-thumb-wrapper'; wrapper.innerHTML = `<img src="${img}" class="edit-thumb"><button class="edit-remove-img" onclick="removeEditImage(${idx})">&times;</button>`; container.appendChild(wrapper); }); };
window.removeEditImage = (idx) => { tempEditImages.splice(idx, 1); renderEditGallery(); };
function setupEditModalImageInput() { const input = document.getElementById('edit-add-img-input'); input.addEventListener('change', async (e) => { const files = e.target.files; if(files.length > 0) { const promises = Array.from(files).map(file => { return new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(file); }); }); const newImages = await Promise.all(promises); tempEditImages = [...tempEditImages, ...newImages]; renderEditGallery(); } input.value = ''; }); }
window.closeEditModal = () => { document.getElementById('edit-modal').style.display = 'none'; };
window.saveEditItem = () => { const rOld = document.getElementById('edit-r-origin').value; const cOld = document.getElementById('edit-c-origin').value; const id = parseInt(document.getElementById('edit-id').value); const rNew = document.getElementById('edit-move-room').value; const cNew = document.getElementById('edit-move-cat').value; const itemIndex = houseData[rOld][cOld].findIndex(i => i.id === id); if (itemIndex === -1) return; const item = houseData[rOld][cOld][itemIndex]; houseData[rOld][cOld].splice(itemIndex, 1); item.name = document.getElementById('edit-name').value; item.price = parseFloat(document.getElementById('edit-price').value) || 0; item.link = document.getElementById('edit-link').value; item.desc = document.getElementById('edit-desc').value; item.imgs = tempEditImages.length > 0 ? tempEditImages : ['https://via.placeholder.com/150/000/fff?text=Sem+Foto']; if (!houseData[rNew]) initializeRoomData({id: rNew}); houseData[rNew][cNew].push(item); closeEditModal(); if (rOld !== rNew) switchRoom(rNew); else { renderLists(rOld, cOld); if(cOld !== cNew) renderLists(rOld, cNew); } updateAllTotals(); saveData(); };

// --- CÁLCULO E BARRAS (ATUALIZADO) ---
function updateAllTotals(cryptoTotal = 0) {
    let currentCryptoVal = cryptoTotal; 
    if(cryptoTotal === 0 && investments.length > 0 && Object.keys(currentCryptoPrices).length > 0) {
        investments.forEach(inv => { currentCryptoVal += (inv.amount * (currentCryptoPrices[inv.coinId]?.brl || 0)); });
    }

    let globalTotals = {};
    let totalCost = 0, totalPaid = 0, totalPending = 0;
    
    // Custos por Nível
    let costEssencial = 0;
    let costComum = 0;
    let costDesejado = 0;

    rooms.forEach(r => {
        if (houseData[r.id]) {
            let thisRoomCost = 0;
            Object.keys(houseData[r.id]).forEach(cat => {
                if (Array.isArray(houseData[r.id][cat])) {
                    if (!globalTotals[cat]) globalTotals[cat] = 0;
                    let colTotal = 0;

                    houseData[r.id][cat].forEach(i => {
                        const price = Number(i.price) || 0;
                        globalTotals[cat] += price;
                        totalCost += price;
                        if(i.status === 'bought') totalPaid += price; else totalPending += price;

                        const catLower = cat.toLowerCase();
                        if (catLower.includes('essencial')) costEssencial += price;
                        else if (catLower.includes('comum')) costComum += price;
                        else if (catLower.includes('desejado')) costDesejado += price;

                        thisRoomCost += price;
                        colTotal += price;
                    });

                    if (currentRoomId === r.id) {
                        const colEl = document.getElementById(`total-${r.id}-${cat}`);
                        if(colEl) colEl.innerText = formatCurrency(colTotal);
                    }
                }
            });
            const roomStatEl = document.getElementById(`room-stat-${r.id}`);
            if(roomStatEl) roomStatEl.innerText = `Total: ${formatCurrency(thisRoomCost)}`;
        }
    });

    const walletNum = parseFloat(wallet.balance) || 0;
    const totalMoney = walletNum + currentCryptoVal; // SOMA DINHEIRO + CRIPTO

    // Atualiza Barras
    updateBar('bar-level-1', 'text-level-1', costEssencial > 0 ? (totalMoney/costEssencial)*100 : (totalMoney>0?100:0));
    updateBar('bar-level-2', 'text-level-2', costComum > 0 ? (totalMoney/costComum)*100 : (totalMoney>0?100:0));
    updateBar('bar-level-3', 'text-level-3', costDesejado > 0 ? (totalMoney/costDesejado)*100 : (totalMoney>0?100:0));
    updateBar('bar-level-4', 'text-level-4', totalCost > 0 ? (totalMoney/totalCost)*100 : (totalMoney>0?100:0));
    updateBar('bar-level-5', 'text-level-5', totalCost > 0 ? (totalPaid/totalCost)*100 : 0);

    const container = document.getElementById('dynamic-totals-container'); container.innerHTML = '';
    Object.keys(globalTotals).forEach(cat => {
        const row = document.createElement('div'); row.className = 'total-row';
        row.innerHTML = `<span>${capitalize(cat)}:</span> <strong>${formatCurrency(globalTotals[cat])}</strong>`;
        container.appendChild(row);
    });
    document.getElementById('gl-total').innerText = formatCurrency(totalCost);
}

function updateBar(barId, textId, pct) {
    const safePct = isNaN(pct) ? 0 : pct;
    const visualWidth = safePct > 100 ? 100 : safePct;
    const bar = document.getElementById(barId);
    if(bar) bar.style.width = `${visualWidth}%`;
    const txt = document.getElementById(textId);
    if(txt) txt.innerText = `${safePct.toFixed(1)}%`;
}

function formatCurrency(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }