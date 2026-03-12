use crate::mechanics::combat::Combatant;

/// A fast forest wolf with 15% dodge chance.
/// Passive: "迅捷" — 15% dodge, high speed.
pub struct ForestWolf {
    name: String,
    hp: i32,
    max_hp: i32,
    speed: i32,
    shield: i32,
}

impl ForestWolf {
    pub fn new(name: &str, max_hp: i32) -> Self {
        Self {
            name: name.to_string(),
            hp: max_hp,
            max_hp,
            speed: 5,
            shield: 0,
        }
    }
}

impl Combatant for ForestWolf {
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
    /// Passive: 迅捷 — 15% dodge chance.
    fn dodge_chance(&self) -> f64 {
        0.15
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn forest_wolf_stats() {
        let w = ForestWolf::new("森林狼", 3);
        assert_eq!(w.hp(), 3);
        assert_eq!(w.speed(), 5);
        assert!((w.dodge_chance() - 0.15).abs() < f64::EPSILON);
    }

    #[test]
    fn forest_wolf_defeated() {
        let mut w = ForestWolf::new("森林狼", 1);
        w.take_damage(1);
        assert!(!w.is_alive());
    }
}
