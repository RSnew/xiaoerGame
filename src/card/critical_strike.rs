use super::{Card, CardEffect};

/// Creates the critical strike card (deals 2 damage, 5s cooldown).
pub fn create_critical_strike_card() -> Card {
    Card::new("暴击", "造成 2 点伤害", CardEffect::Damage(2), 5_000)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn critical_strike_card_properties() {
        let card = create_critical_strike_card();
        assert_eq!(card.name, "暴击");
        assert!(matches!(card.effect, CardEffect::Damage(2)));
    }
}
