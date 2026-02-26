/** Base class for all combatants (players, enemies, etc.). */
export class Combatant {
    constructor(name, maxHp) {
        this.name = name;
        this.maxHp = maxHp;
        this.hp = maxHp;
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }

    isAlive() {
        return this.hp > 0;
    }

    hpPercent() {
        return (this.hp / this.maxHp) * 100;
    }
}
