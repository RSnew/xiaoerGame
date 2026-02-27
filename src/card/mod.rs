pub mod attack;
pub mod defense;

pub const DEFAULT_CARD_COOLDOWN_MS: u64 = 3_000;

/// The effect a card produces when played.
#[derive(Debug, Clone)]
pub enum CardEffect {
    Damage(i32),
    Shield(i32),
    // Future: Heal(i32), DrawCards(usize), …
}

/// A playable card in the game.
#[derive(Debug, Clone)]
pub struct Card {
    pub name: String,
    pub description: String,
    pub effect: CardEffect,
    cooldown_ms: u64,
    remaining_cooldown_ms: u64,
}

impl Card {
    pub fn new(name: &str, description: &str, effect: CardEffect, cooldown_ms: u64) -> Self {
        Self {
            name: name.to_string(),
            description: description.to_string(),
            effect,
            cooldown_ms,
            remaining_cooldown_ms: 0,
        }
    }

    pub fn is_ready(&self) -> bool {
        self.remaining_cooldown_ms == 0
    }

    pub fn trigger_cooldown(&mut self) {
        self.remaining_cooldown_ms = self.cooldown_ms;
    }

    pub fn set_initial_cooldown_ms(&mut self, cooldown_ms: u64) {
        self.remaining_cooldown_ms = cooldown_ms;
    }

    pub fn tick_cooldown_ms(&mut self, elapsed_ms: u64) {
        self.remaining_cooldown_ms = self.remaining_cooldown_ms.saturating_sub(elapsed_ms);
    }

    pub fn remaining_cooldown_ms(&self) -> u64 {
        self.remaining_cooldown_ms
    }

    pub fn remaining_cooldown_secs(&self) -> u64 {
        if self.remaining_cooldown_ms == 0 {
            return 0;
        }
        self.remaining_cooldown_ms.div_ceil(1_000)
    }
}

impl std::fmt::Display for Card {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} - {}", self.name, self.description)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn card_display() {
        let c = Card::new("攻击", "造成 1 点伤害", CardEffect::Damage(1), 3_000);
        assert_eq!(format!("{c}"), "攻击 - 造成 1 点伤害");
    }

    #[test]
    fn cooldown_tick_in_ms() {
        let mut c = Card::new("攻击", "造成 1 点伤害", CardEffect::Damage(1), 3_000);
        c.trigger_cooldown();
        assert!(!c.is_ready());
        assert_eq!(c.remaining_cooldown_secs(), 3);

        c.tick_cooldown_ms(1_500);
        assert_eq!(c.remaining_cooldown_ms(), 1_500);
        assert_eq!(c.remaining_cooldown_secs(), 2);

        c.tick_cooldown_ms(1_500);
        assert!(c.is_ready());
        assert_eq!(c.remaining_cooldown_ms(), 0);
    }
}
