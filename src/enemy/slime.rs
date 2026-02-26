use crate::mechanics::combat::Combatant;

/// A basic slime enemy.
pub struct Slime {
    name: String,
    hp: i32,
    max_hp: i32,
}

impl Slime {
    pub fn new(name: &str, max_hp: i32) -> Self {
        Self {
            name: name.to_string(),
            hp: max_hp,
            max_hp,
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
    fn take_damage(&mut self, amount: i32) {
        self.hp = (self.hp - amount).max(0);
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
