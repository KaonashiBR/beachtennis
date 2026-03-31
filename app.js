// Função para buscar atletas já cadastrados na Arena
window.openAtletaSuggest = async () => {
    const list = document.getElementById('suggest-list');
    list.innerHTML = 'Carregando...';
    document.getElementById('modal-player-suggest').style.display = 'flex';

    const snap = await get(ref(db, `arena_players_details/${curArenaId}`));
    const atletas = snap.val();
    
    if(!atletas) {
        list.innerHTML = 'Nenhum atleta com telefone nesta arena.';
        return;
    }

    list.innerHTML = '';
    Object.keys(atletas).forEach(phone => {
        const at = atletas[phone];
        const item = document.createElement('div');
        item.className = 'select-item';
        item.innerHTML = `<strong>${at.name}</strong> <small>(${phone})</small>`;
        item.onclick = () => {
            document.getElementById('pName').value = at.name;
            document.getElementById('pPhone').value = phone;
            closeSuggest();
        };
        list.appendChild(item);
    });
};

// Modificação no encerramento do torneio (Submit Points)
async function processRanking(player, pts, isChamp) {
    if(!player.phone) return; // Regra: Sem telefone = Sem ranking

    const updates = {};
    const pathArena = `arena_rankings/${curArenaId}/${player.phone}`;
    const pathGlobal = `global_players/${player.phone}`;

    // Busca dados atuais para somar
    const snapA = await get(ref(db, pathArena));
    let dataA = snapA.val() || { name: player.name, points: 0, tourneys: 0 };
    dataA.points += pts;
    dataA.tourneys += 1;
    
    updates[pathArena] = dataA;
    updates[pathGlobal] = dataA; // Sincroniza com Global

    await update(ref(db), updates);
}
