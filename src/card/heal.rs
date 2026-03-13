use super::{Card, CardEffect};

/// Creates the heal card (restores 1 HP, 4s cooldown).
pub fn create_heal_card() -> Card {
    Card::new("治愈", "恢复 1 点生命值", CardEffect::Heal(1), 4_000)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heal_card_properties() {
        let card = create_heal_card();
        assert_eq!(card.name, "治愈");
        assert!(matches!(card.effect, CardEffect::Heal(1)));
    }
}
