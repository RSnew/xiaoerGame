/** Registry of all codex entries, grouped by category. */
const REGISTRY = {
    characters: [
        { id: 'hero', path: 'data/characters/hero' },
    ],
    enemies: [
        { id: 'slime', path: 'data/enemies/slime' },
    ],
    cards: [
        { id: 'attack', path: 'data/cards/attack' },
        { id: 'defense', path: 'data/cards/defense' },
    ],
};

const CAT_LABELS = { characters: '角色', enemies: '怪物', cards: '卡牌' };

/** In-memory cache: path → parsed info.json */
const cache = {};

/* ========== DOM refs ========== */
const dom = {
    tabs:           document.querySelectorAll('.tab'),
    grid:           document.getElementById('grid'),
    gridView:       document.getElementById('grid-view'),
    detailView:     document.getElementById('detail-view'),
    backBtn:        document.getElementById('back-btn'),
    portraitImg:     document.getElementById('portrait-img'),
    dName:          document.getElementById('d-name'),
    dTitle:         document.getElementById('d-title'),
    dStats:         document.getElementById('d-stats'),
    dSkillsSection: document.getElementById('d-skills-section'),
    dSkills:        document.getElementById('d-skills'),
    dIntroSection:  document.getElementById('d-intro-section'),
    dIntro:         document.getElementById('d-intro'),
    dTermsSection:  document.getElementById('d-terms-section'),
    dTerms:         document.getElementById('d-terms'),
};

let currentCategory = 'characters';

/* ========== Init ========== */
document.addEventListener('DOMContentLoaded', () => {
    dom.tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.cat));
    });
    dom.backBtn.addEventListener('click', hideDetail);
    loadCategory(currentCategory);
});

/* ========== Data loading ========== */
async function fetchInfo(path) {
    if (cache[path]) return cache[path];
    const res = await fetch(`${path}/info.json`);
    const data = await res.json();
    data._path = path;
    cache[path] = data;
    return data;
}

/* ========== Tab switching ========== */
function switchTab(cat) {
    currentCategory = cat;
    dom.tabs.forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
    hideDetail();
    loadCategory(cat);
}

/* ========== Grid ========== */
async function loadCategory(cat) {
    dom.grid.innerHTML = '';
    const entries = REGISTRY[cat] || [];
    const items = await Promise.all(entries.map(e => fetchInfo(e.path)));

    items.forEach(info => {
        const el = document.createElement('div');
        el.className = 'grid-item';
        el.innerHTML = `
            <img class="grid-item-img" src="${info._path}/${info.avatar}" alt="${info.name}" />
            <div class="grid-item-info">
                <div class="grid-item-name">${info.name}</div>
                <div class="grid-item-title">${info.title}</div>
            </div>
        `;
        el.addEventListener('click', () => showDetail(info));
        dom.grid.appendChild(el);
    });
}

/* ========== Detail view ========== */
function showDetail(info) {
    dom.gridView.classList.add('hidden');
    document.getElementById('tabs').classList.add('hidden');
    dom.detailView.classList.remove('hidden');

    dom.portraitImg.src = `${info._path}/${info.avatar}`;
    dom.dName.textContent = info.name;
    dom.dTitle.textContent = info.title;

    // Stats table
    dom.dStats.innerHTML = '';
    for (const [key, val] of Object.entries(info.stats || {})) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${key}</td><td>${val}</td>`;
        dom.dStats.appendChild(tr);
    }

    // Skills
    const skills = info.skills || [];
    if (skills.length > 0) {
        dom.dSkillsSection.classList.remove('hidden');
        dom.dSkills.innerHTML = skills.map(s => `
            <div class="skill-item">
                <div class="skill-header">
                    <span class="skill-name">${s.name}</span>
                    ${s.type ? `<span class="skill-type">${s.type}</span>` : ''}
                </div>
                <div class="skill-desc">${s.description}</div>
            </div>
        `).join('');
    } else {
        dom.dSkillsSection.classList.add('hidden');
    }

    // Introduction
    if (info.introduction) {
        dom.dIntroSection.classList.remove('hidden');
        dom.dIntro.textContent = info.introduction;
    } else {
        dom.dIntroSection.classList.add('hidden');
    }

    // Terms
    const terms = info.terms || [];
    if (terms.length > 0) {
        dom.dTermsSection.classList.remove('hidden');
        dom.dTerms.innerHTML = terms.map(t => `
            <div class="term-item">
                <div class="term-word">${t.term}</div>
                <div class="term-def">${t.definition}</div>
            </div>
        `).join('');
    } else {
        dom.dTermsSection.classList.add('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideDetail() {
    dom.detailView.classList.add('hidden');
    document.getElementById('tabs').classList.remove('hidden');
    dom.gridView.classList.remove('hidden');
}
