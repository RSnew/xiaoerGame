pub mod attack;
pub mod defense;

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
}

impl Card {
    pub fn new(name: &str, description: &str, effect: CardEffect) -> Self {
        Self {
            name: name.to_string(),
            description: description.to_string(),
            effect,
        }
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
        let c = Card::new("攻击", "造成 1 点伤害", CardEffect::Damage(1));
        assert_eq!(format!("{c}"), "攻击 - 造成 1 点伤害");
    }
}
