export const TurnPhase = Object.freeze({
    PLAYER: 'player',
    ENEMY: 'enemy',
});

export function nextPhase(phase) {
    return phase === TurnPhase.PLAYER ? TurnPhase.ENEMY : TurnPhase.PLAYER;
}

export function phaseLabel(phase) {
    return phase === TurnPhase.PLAYER ? '玩家回合' : '敌人回合';
}
