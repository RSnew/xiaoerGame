use super::{Card, CardEffect};

/// Creates the basic defense card (1 shield for 1 turn).
pub fn create_defense_card() -> Card {
    Card::new("防御", "获得 1 点护盾，持续 1 回合", CardEffect::Shield(1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defense_card_gives_shield() {
        let card = create_defense_card();
        assert_eq!(card.name, "防御");
        assert!(matches!(card.effect, CardEffect::Shield(1)));
    }
}
