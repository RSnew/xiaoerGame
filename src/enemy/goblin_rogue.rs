use crate::mechanics::combat::Combatant;

/// A goblin rogue with the "躲闪大师" passive: 10% chance to dodge each hit.
pub struct GoblinRogue {
    name: String,
    hp: i32,
    max_hp: i32,
    speed: i32,
    shield: i32,
}

impl GoblinRogue {
    pub fn new(name: &str, max_hp: i32) -> Self {
        Self {
            name: name.to_string(),
            hp: max_hp,
            max_hp,
            speed: 4,
            shield: 0,
        }
    }
}

impl Combatant for GoblinRogue {
    fn name(&self) -> &str {
        &self.name
    }
    fn hp(&self) -> i32 {
        self.hp
    }
    fn max_hp(&self) -> i32 {
        self.max_hp
    }
    fn speed(&self) -> i32 {
        self.speed
    }
    fn shield(&self) -> i32 {
        self.shield
    }
    fn add_shield(&mut self, amount: i32) {
        self.shield += amount;
    }
    fn clear_shield(&mut self) {
        self.shield = 0;
    }
    fn take_damage(&mut self, amount: i32) {
        let absorbed = amount.min(self.shield);
        self.shield -= absorbed;
        self.hp = (self.hp - (amount - absorbed)).max(0);
    }
    fn heal(&mut self, amount: i32) -> i32 {
        let before = self.hp;
        self.hp = (self.hp + amount).min(self.max_hp);
        self.hp - before
    }
    /// 被动：躲闪大师 —— 每次受击有 10% 概率完全闪避。
    fn dodge_chance(&self) -> f64 {
        0.1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn goblin_rogue_takes_damage() {
        let mut g = GoblinRogue::new("哥布林刺客", 4);
        g.take_damage(1);
        assert_eq!(g.hp(), 3);
        assert!(g.is_alive());
    }

    #[test]
    fn goblin_rogue_defeated() {
        let mut g = GoblinRogue::new("哥布林刺客", 1);
        g.take_damage(1);
        assert_eq!(g.hp(), 0);
        assert!(!g.is_alive());
    }

    #[test]
    fn goblin_rogue_has_dodge_chance() {
        let g = GoblinRogue::new("哥布林刺客", 4);
        assert!((g.dodge_chance() - 0.1).abs() < f64::EPSILON);
    }
}
