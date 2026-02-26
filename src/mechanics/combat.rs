/// Trait shared by all combatants (players, enemies, etc.).
pub trait Combatant {
    fn name(&self) -> &str;
    fn hp(&self) -> i32;
    fn max_hp(&self) -> i32;
    fn take_damage(&mut self, amount: i32);

    fn is_alive(&self) -> bool {
        self.hp() > 0
    }

    fn display_status(&self) -> String {
        format!("{}: {}/{} HP", self.name(), self.hp(), self.max_hp())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct DummyCombatant {
        name: String,
        hp: i32,
        max_hp: i32,
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
        fn take_damage(&mut self, amount: i32) {
            self.hp = (self.hp - amount).max(0);
        }
    }

    #[test]
    fn take_damage_reduces_hp() {
        let mut e = DummyCombatant {
            name: "T".into(),
            hp: 3,
            max_hp: 3,
        };
        e.take_damage(1);
        assert_eq!(e.hp(), 2);
        assert!(e.is_alive());
    }

    #[test]
    fn damage_does_not_go_below_zero() {
        let mut e = DummyCombatant {
            name: "T".into(),
            hp: 1,
            max_hp: 3,
        };
        e.take_damage(5);
        assert_eq!(e.hp(), 0);
        assert!(!e.is_alive());
    }

    #[test]
    fn display_status_format() {
        let e = DummyCombatant {
            name: "勇者".into(),
            hp: 2,
            max_hp: 3,
        };
        assert_eq!(e.display_status(), "勇者: 2/3 HP");
    }
}
