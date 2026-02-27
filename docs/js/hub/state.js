const STORAGE_KEY = 'xiaoer_hub_state';

const DEFAULT_STATE = {
    gold: 0,
    equippedCards: ['attack', 'defense'],
    equippedSkills: ['emergency_heal'],
};

export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_STATE };
        return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_STATE };
    }
}

export function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getEquippedCards() {
    return loadState().equippedCards;
}

export function setEquippedCards(cardIds) {
    const state = loadState();
    state.equippedCards = cardIds;
    saveState(state);
}

export function getEquippedSkills() {
    return loadState().equippedSkills;
}

export function setEquippedSkills(skillIds) {
    const state = loadState();
    state.equippedSkills = skillIds;
    saveState(state);
}
