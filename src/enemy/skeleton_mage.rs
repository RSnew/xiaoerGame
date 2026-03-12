use crate::mechanics::combat::Combatant;

/// A skeleton mage enemy with higher HP but slower speed.
/// Passive: "亡灵护盾" — starts each battle with 1 shield.
pub struct SkeletonMage {
    name: String,
    hp: i32,
    max_hp: i32,
    speed: i32,
    shield: i32,
}

impl SkeletonMage {
    pub fn new(name: &str, max_hp: i32) -> Self {
        Self {
            name: name.to_string(),
            hp: max_hp,
            max_hp,
            speed: 2,
            shield: 1, // passive: starts with 1 shield
        }
    }
}

impl Combatant for SkeletonMage {
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
    fn skeleton_mage_starts_with_shield() {
        let s = SkeletonMage::new("骷髅法师", 5);
        assert_eq!(s.hp(), 5);
        assert_eq!(s.shield(), 1);
        assert_eq!(s.speed(), 2);
    }

    #[test]
    fn skeleton_mage_shield_absorbs_first_hit() {
        let mut s = SkeletonMage::new("骷髅法师", 5);
        s.take_damage(1);
        assert_eq!(s.hp(), 5); // shield absorbed it
        assert_eq!(s.shield(), 0);
    }

    #[test]
    fn skeleton_mage_defeated() {
        let mut s = SkeletonMage::new("骷髅法师", 1);
        s.clear_shield();
        s.take_damage(1);
        assert!(!s.is_alive());
    }
}
