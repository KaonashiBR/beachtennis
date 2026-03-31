import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, off, update, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDWWZqUI_afdZWUbEKp9qelddskmpQPxqk",
    authDomain: "beach-tennis-manager-92f17.firebaseapp.com",
    databaseURL: "https://beach-tennis-manager-92f17-default-rtdb.firebaseio.com",
    projectId: "beach-tennis-manager-92f17",
    storageBucket: "beach-tennis-manager-92f17.appspot.com",
    messagingSenderId: "311372138486",
    appId: "1:311372138486:web:50c9e403ad877ab094e9d7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// --- VARIÁVEIS DE ESTADO ---
let user = null;
let curArenaId = null;
let curCatId = null;
let curTourneyId = null;
let appState = { players: [], groups: [], matches: [], mode: 'individual' };

// --- CONTROLE DE TELAS E ABAS ---
window.showScreen = (id) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

window.switchCatTab = (tab) => {
    document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    if(tab === 'cats') {
        document.querySelector('[onclick*="cats"]').classList.add('active');
        document.getElementById('tab-cats').classList.add('active');
    } else {
        document.querySelector('[onclick*="arena-rank"]').classList.add('active');
        document.getElementById('tab-arena-rank').classList.add('active');
        loadArenaRanking();
    }
};

// --- LÓGICA DE RANKING POR TELEFONE (ARENA) ---
async function loadArenaRanking() {
    const table = document.getElementById('table-arena-ranking');
    table.innerHTML = '<tr><td style="padding:20px;">Carregando ranking da arena...</td></tr>';

    const snap = await get(ref(db, `arena_rankings/${curArenaId}`));
    const data = snap.val();

    if(!data) {
        table.innerHTML = '<tr><td style="padding:20px; color:#999;">Nenhum atleta pontuou nesta arena ainda.</td></tr>';
        return;
    }

    // Ordena por pontos (descendente)
    const sorted = Object.values(data).sort((a, b) => b.points - a.points);
    
    let html = `<tr><th>#</th><th style="text-align:left;">Atleta</th><th>Torneios</th><th>Pts</th></tr>`;
    sorted.forEach((p, i) => {
        html += `<tr class="rank-${i+1}">
            <td><div class="rank-pos">${i+1}</div></td>
            <td style="text-align:left;">${p.name}</td>
            <td>${p.tourneys || 0}</td>
            <td style="color:var(--primary);">${p.points}</td>
        </tr>`;
    });
    table.innerHTML = html;
}

// --- SUGESTÃO E CADASTRO DE ATLETAS ---
window.openAtletaSuggest = async () => {
    const list = document.getElementById('suggest-list');
    list.innerHTML = 'Buscando histórico...';
    document.getElementById('modal-player-suggest').style.display = 'flex';

    const snap = await get(ref(db, `arena_players_details/${curArenaId}`));
    const atletas = snap.val();
    
    if(!atletas) {
        list.innerHTML = '<div style="padding:10px;">Nenhum atleta cadastrado. Use o campo de telefone para iniciar o primeiro.</div>';
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
            window.closeSuggest();
        };
        list.appendChild(item);
    });
};

window.closeSuggest = () => {
    document.getElementById('modal-player-suggest').style.display = 'none';
};

// --- FINALIZAÇÃO E PONTUAÇÃO ---
window.submitPoints = async (winnersData) => {
    // winnersData: Array de {id, phone, name, pts}
    const updates = {};

    for (let p of winnersData) {
        if(p.phone && p.phone.length >= 8) { // Só entra no ranking se tiver telefone válido
            // 1. Atualiza Ranking da Arena
            const arenaPath = `arena_rankings/${curArenaId}/${p.phone}`;
            const snapA = await get(ref(db, arenaPath));
            let dataA = snapA.val() || { name: p.name, points: 0, tourneys: 0 };
            dataA.points += p.pts;
            dataA.tourneys += 1;
            dataA.name = p.name;
            updates[arenaPath] = dataA;

            // 2. Salva Detalhes do Atleta (para o auto-complete)
            const detailPath = `arena_players_details/${curArenaId}/${p.phone}`;
            updates[detailPath] = { name: p.name, lastActive: Date.now() };

            // 3. Atualiza Ranking Global
            const globalPath = `global_players/${p.phone}`;
            const snapG = await get(ref(db, globalPath));
            let dataG = snapG.val() || { name: p.name, points: 0, tourneys: 0 };
            dataG.points += p.pts;
            dataG.tourneys += 1;
            updates[globalPath] = dataG;
        }
    }

    await update(ref(db), updates);
    alert("Resultados processados e rankings atualizados!");
};

// --- NAVEGAÇÃO HOME ---
window.goHome = () => {
    curArenaId = null;
    window.showScreen('screen-arenas');
};

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, (u) => {
    user = u;
    document.getElementById('loading').style.display = 'none';
    if(user) {
        document.getElementById('nav-username').innerText = user.displayName.split(' ')[0];
        document.getElementById('nav-avatar').src = user.photoURL;
    }
});

// Tornar funções acessíveis globalmente (necessário por ser type="module")
window.switchCatTab = window.switchCatTab;
window.openAtletaSuggest = window.openAtletaSuggest;
window.closeSuggest = window.closeSuggest;
