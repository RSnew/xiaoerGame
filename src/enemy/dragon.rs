use crate::mechanics::combat::Combatant;

/// The Dragon boss: high HP, deals 2 damage per attack.
/// Passive: "龙鳞" — 5% dodge chance.
pub struct Dragon {
    name: String,
    hp: i32,
    max_hp: i32,
    speed: i32,
    shield: i32,
}

impl Dragon {
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

impl Combatant for Dragon {
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
    /// Passive: 龙鳞 — 5% dodge chance.
    fn dodge_chance(&self) -> f64 {
        0.05
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dragon_stats() {
        let d = Dragon::new("巨龙", 8);
        assert_eq!(d.hp(), 8);
        assert_eq!(d.max_hp(), 8);
        assert_eq!(d.speed(), 4);
        assert!((d.dodge_chance() - 0.05).abs() < f64::EPSILON);
    }

    #[test]
    fn dragon_takes_damage() {
        let mut d = Dragon::new("巨龙", 8);
        d.take_damage(3);
        assert_eq!(d.hp(), 5);
        assert!(d.is_alive());
    }
}
