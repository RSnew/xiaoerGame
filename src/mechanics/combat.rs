/// Trait shared by all combatants (players, enemies, etc.).
pub trait Combatant {
    fn name(&self) -> &str;
    fn hp(&self) -> i32;
    fn max_hp(&self) -> i32;
    fn shield(&self) -> i32;
    fn add_shield(&mut self, amount: i32);
    fn clear_shield(&mut self);

    /// Deals damage, absorbing through shield first.
    fn take_damage(&mut self, amount: i32);

    fn is_alive(&self) -> bool {
        self.hp() > 0
    }

    fn display_status(&self) -> String {
        if self.shield() > 0 {
            format!(
                "{}: {}/{} HP (🛡️{})",
                self.name(),
                self.hp(),
                self.max_hp(),
                self.shield()
            )
        } else {
            format!("{}: {}/{} HP", self.name(), self.hp(), self.max_hp())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct DummyCombatant {
        name: String,
        hp: i32,
        max_hp: i32,
        shield: i32,
    }

    impl DummyCombatant {
        fn new(name: &str, hp: i32, max_hp: i32) -> Self {
            Self {
                name: name.into(),
                hp,
                max_hp,
                shield: 0,
            }
        }
    }

    impl Combatant for DummyCombatant {
        fn name(&self) -> &str {
            &self.name
        }
        fn hp(&self) -> i32 {
            self.hp
        }
        fn max_hp(&self) -> i32 {
            self.max_hp
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
    }

    #[test]
    fn take_damage_reduces_hp() {
        let mut e = DummyCombatant::new("T", 3, 3);
        e.take_damage(1);
        assert_eq!(e.hp(), 2);
        assert!(e.is_alive());
    }

    #[test]
    fn damage_does_not_go_below_zero() {
        let mut e = DummyCombatant::new("T", 1, 3);
        e.take_damage(5);
        assert_eq!(e.hp(), 0);
        assert!(!e.is_alive());
    }

    #[test]
    fn shield_absorbs_damage() {
        let mut e = DummyCombatant::new("T", 3, 3);
        e.add_shield(1);
        e.take_damage(1);
        assert_eq!(e.hp(), 3);
        assert_eq!(e.shield(), 0);
    }

    #[test]
    fn shield_partial_absorb() {
        let mut e = DummyCombatant::new("T", 3, 3);
        e.add_shield(1);
        e.take_damage(2);
        assert_eq!(e.hp(), 2);
        assert_eq!(e.shield(), 0);
    }

    #[test]
    fn clear_shield_resets() {
        let mut e = DummyCombatant::new("T", 3, 3);
        e.add_shield(2);
        e.clear_shield();
        assert_eq!(e.shield(), 0);
    }

    #[test]
    fn display_status_format() {
        let e = DummyCombatant::new("勇者", 2, 3);
        assert_eq!(e.display_status(), "勇者: 2/3 HP");
    }

    #[test]
    fn display_status_with_shield() {
        let mut e = DummyCombatant::new("勇者", 3, 3);
        e.add_shield(1);
        assert!(e.display_status().contains("🛡️1"));
    }
}
