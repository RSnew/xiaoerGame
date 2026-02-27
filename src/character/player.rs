use crate::card::Card;
use crate::mechanics::combat::Combatant;
use crate::skill::Skill;

pub const MAX_SKILLS: usize = 2;

/// The player-controlled character.
pub struct Player {
    name: String,
    hp: i32,
    max_hp: i32,
    speed: i32,
    shield: i32,
    pub hand: Vec<Card>,
    pub skills: Vec<Skill>,
}

impl Player {
    pub fn new(name: &str, max_hp: i32) -> Self {
        Self {
            name: name.to_string(),
            hp: max_hp,
            max_hp,
            speed: 3,
            shield: 0,
            hand: Vec::new(),
            skills: Vec::new(),
        }
    }

    pub fn add_card(&mut self, card: Card) {
        self.hand.push(card);
    }

    /// Equip a skill. Returns false if already at max capacity.
    pub fn equip_skill(&mut self, skill: Skill) -> bool {
        if self.skills.len() >= MAX_SKILLS {
            return false;
        }
        self.skills.push(skill);
        true
    }

    /// Tick all skill cooldowns by elapsed milliseconds.
    pub fn tick_skill_cooldowns_ms(&mut self, elapsed_ms: u64) {
        for skill in &mut self.skills {
            skill.tick_cooldown_ms(elapsed_ms);
        }
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
    use crate::card::attack::create_attack_card;
    use crate::skill::emergency_heal::create_emergency_heal;

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

    #[test]
    fn equip_up_to_max_skills() {
        let mut p = Player::new("勇者", 3);
        assert!(p.equip_skill(create_emergency_heal()));
        assert!(p.equip_skill(create_emergency_heal()));
        assert!(!p.equip_skill(create_emergency_heal()));
        assert_eq!(p.skills.len(), MAX_SKILLS);
    }

    #[test]
    fn heal_capped_at_max_hp() {
        let mut p = Player::new("勇者", 3);
        p.take_damage(1);
        assert_eq!(p.hp(), 2);
        let healed = p.heal(5);
        assert_eq!(healed, 1);
        assert_eq!(p.hp(), 3);
    }

    #[test]
    fn tick_skill_cooldowns_ms() {
        let mut p = Player::new("勇者", 3);
        p.equip_skill(create_emergency_heal());
        p.skills[0].trigger_cooldown();
        assert!(!p.skills[0].is_ready());
        p.tick_skill_cooldowns_ms(20_000);
        assert!(p.skills[0].is_ready());
    }
}
