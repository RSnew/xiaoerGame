use crate::mechanics::combat::Combatant;

/// A basic slime enemy.
pub struct Slime {
    name: String,
    hp: i32,
    max_hp: i32,
    speed: i32,
    shield: i32,
}

impl Slime {
    pub fn new(name: &str, max_hp: i32) -> Self {
        Self {
            name: name.to_string(),
            hp: max_hp,
            max_hp,
            speed: 3,
            shield: 0,
        }
    }
}

impl Combatant for Slime {
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slime_takes_damage() {
        let mut s = Slime::new("史莱姆", 3);
        s.take_damage(1);
        assert_eq!(s.hp(), 2);
        assert!(s.is_alive());
    }

    #[test]
    fn slime_defeated() {
        let mut s = Slime::new("史莱姆", 1);
        s.take_damage(1);
        assert_eq!(s.hp(), 0);
        assert!(!s.is_alive());
    }
}
