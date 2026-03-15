use crate::card::Card;
use crate::mechanics::combat::Combatant;
use crate::skill::Skill;

pub const MAX_SKILLS: usize = 2;
pub const DEFAULT_MAX_MANA: i32 = 100;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PassiveSkill {
    /// 预备：胜利后额外获得 1 金币
    Prepared,
}

impl PassiveSkill {
    pub fn name(&self) -> &'static str {
        match self {
            PassiveSkill::Prepared => "预备",
        }
    }

    pub fn victory_bonus_gold(&self) -> i32 {
        match self {
            PassiveSkill::Prepared => 1,
        }
    }
}

/// The player-controlled character.
pub struct Player {
    name: String,
    hp: i32,
    max_hp: i32,
    speed: i32,
    shield: i32,
    gold: i32,
    mana: i32,
    max_mana: i32,
    passive: Option<PassiveSkill>,
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
            gold: 0,
            mana: DEFAULT_MAX_MANA,
            max_mana: DEFAULT_MAX_MANA,
            passive: None,
            hand: Vec::new(),
            skills: Vec::new(),
        }
    }

    pub fn set_passive(&mut self, passive: PassiveSkill) {
        self.passive = Some(passive);
    }

    pub fn passive(&self) -> Option<&PassiveSkill> {
        self.passive.as_ref()
    }

    pub fn gold(&self) -> i32 {
        self.gold
    }

    pub fn add_gold(&mut self, amount: i32) {
        self.gold = (self.gold + amount).max(0);
    }

    /// Spend gold. Returns false if not enough gold.
    pub fn spend_gold(&mut self, amount: i32) -> bool {
        if self.gold >= amount {
            self.gold -= amount;
            true
        } else {
            false
        }
    }

    pub fn mana(&self) -> i32 {
        self.mana
    }

    pub fn max_mana(&self) -> i32 {
        self.max_mana
    }

    /// Spend mana. Returns false if not enough mana.
    pub fn spend_mana(&mut self, amount: i32) -> bool {
        if self.mana >= amount {
            self.mana -= amount;
            true
        } else {
            false
        }
    }

    /// Whether the player has any spell cards equipped.
    pub fn has_spell_cards(&self) -> bool {
        self.hand.iter().any(|c| c.is_spell())
    }

    /// Reset HP, mana and cooldowns for a new battle.
    pub fn reset_for_battle(&mut self) {
        self.hp = self.max_hp;
        self.shield = 0;
        self.mana = self.max_mana;
        for card in &mut self.hand {
            card.set_initial_cooldown_ms(0);
        }
        for skill in &mut self.skills {
            skill.remaining_cooldown_ms = 0;
        }
    }

    pub fn victory_bonus_gold(&self) -> i32 {
        self.passive
            .as_ref()
            .map(PassiveSkill::victory_bonus_gold)
            .unwrap_or(0)
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
    fn new_player_defaults() {
        let p = Player::new("勇者", 3);
        assert_eq!(p.gold(), 0);
        assert!(p.passive().is_none());
        assert_eq!(p.victory_bonus_gold(), 0);
    }

    #[test]
    fn passive_skill_bonus_gold() {
        let mut p = Player::new("勇者", 3);
        p.set_passive(PassiveSkill::Prepared);
        assert_eq!(p.passive().unwrap().name(), "预备");
        assert_eq!(p.victory_bonus_gold(), 1);
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
