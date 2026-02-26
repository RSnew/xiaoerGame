use crate::card::Card;
use crate::mechanics::combat::Combatant;

/// The player-controlled character.
pub struct Player {
    name: String,
    hp: i32,
    max_hp: i32,
    shield: i32,
    pub hand: Vec<Card>,
}

impl Player {
    pub fn new(name: &str, max_hp: i32) -> Self {
        Self {
            name: name.to_string(),
            hp: max_hp,
            max_hp,
            shield: 0,
            hand: Vec::new(),
        }
    }

    pub fn add_card(&mut self, card: Card) {
        self.hand.push(card);
    }
}

impl Combatant for Player {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::card::attack::create_attack_card;

    #[test]
    fn new_player_full_hp() {
        let p = Player::new("勇者", 3);
        assert_eq!(p.hp(), 3);
        assert_eq!(p.max_hp(), 3);
        assert!(p.is_alive());
    }

    #[test]
    fn player_can_hold_cards() {
        let mut p = Player::new("勇者", 3);
        p.add_card(create_attack_card());
        assert_eq!(p.hand.len(), 1);
    }

    #[test]
    fn player_dies_at_zero_hp() {
        let mut p = Player::new("勇者", 1);
        p.take_damage(1);
        assert!(!p.is_alive());
    }
}
