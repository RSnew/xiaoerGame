/** Base class for all combatants (players, enemies, etc.). */
export class Combatant {
    constructor(name, maxHp, speed = 3) {
        this.name = name;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.speed = speed;
        this.shield = 0;
    }

    /** Deals damage, absorbing through shield first. */
    takeDamage(amount) {
        const absorbed = Math.min(amount, this.shield);
        this.shield -= absorbed;
        this.hp = Math.max(0, this.hp - (amount - absorbed));
    }

    addShield(amount) {
        this.shield += amount;
    }

    clearShield() {
        this.shield = 0;
    }

    /** Heal HP, capped at maxHp. Returns actual amount healed. */
    heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - before;
    }

    isAlive() {
        return this.hp > 0;
    }

    hpPercent() {
        return (this.hp / this.maxHp) * 100;
    }
}
