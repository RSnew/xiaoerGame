use super::{Card, CardEffect};

/// Creates the basic attack card (deals 1 damage).
pub fn create_attack_card() -> Card {
    Card::new("攻击", "造成 1 点伤害", CardEffect::Damage(1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn attack_card_deals_one_damage() {
        let card = create_attack_card();
        assert_eq!(card.name, "攻击");
        match card.effect {
            CardEffect::Damage(d) => assert_eq!(d, 1),
        }
    }
}
