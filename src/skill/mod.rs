pub mod emergency_heal;
pub mod fast_cycle;

/// The effect a skill produces when activated.
#[derive(Debug, Clone)]
pub enum SkillEffect {
    Heal(i32),
    ReduceAllCardCooldownMs(u64),
}

/// An equippable skill with a time-based cooldown.
#[derive(Debug, Clone)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub effect: SkillEffect,
    pub cooldown_ms: u64,
    pub remaining_cooldown_ms: u64,
}

impl Skill {
    pub fn new(name: &str, description: &str, effect: SkillEffect, cooldown_ms: u64) -> Self {
        Self {
            name: name.to_string(),
            description: description.to_string(),
            effect,
            cooldown_ms,
            remaining_cooldown_ms: 0,
        }
    }

    /// Set an initial cooldown in milliseconds (e.g. "available after X seconds").
    pub fn with_initial_cooldown_ms(mut self, initial_cooldown_ms: u64) -> Self {
        self.remaining_cooldown_ms = initial_cooldown_ms;
        self
    }

    pub fn is_ready(&self) -> bool {
        self.remaining_cooldown_ms == 0
    }

    /// Put this skill on cooldown after use.
    pub fn trigger_cooldown(&mut self) {
        self.remaining_cooldown_ms = self.cooldown_ms;
    }

    pub fn remaining_cooldown_secs(&self) -> u64 {
        if self.remaining_cooldown_ms == 0 {
            return 0;
        }
        self.remaining_cooldown_ms.div_ceil(1_000)
    }

    /// Tick cooldown by elapsed milliseconds. Returns true if the skill just became ready.
    pub fn tick_cooldown_ms(&mut self, elapsed_ms: u64) -> bool {
        if self.remaining_cooldown_ms == 0 || elapsed_ms == 0 {
            return false;
        }
        let before = self.remaining_cooldown_ms;
        self.remaining_cooldown_ms = self.remaining_cooldown_ms.saturating_sub(elapsed_ms);
        before > 0 && self.remaining_cooldown_ms == 0
    }
}

impl std::fmt::Display for Skill {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.is_ready() {
            write!(f, "{} - {} [可用]", self.name, self.description)
        } else {
            write!(
                f,
                "{} - {} [冷却 {} 秒]",
                self.name,
                self.description,
                self.remaining_cooldown_secs()
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skill_starts_ready() {
        let s = Skill::new("测试", "测试技能", SkillEffect::Heal(1), 4_000);
        assert!(s.is_ready());
    }

    #[test]
    fn cooldown_cycle() {
        let mut s = Skill::new("测试", "测试技能", SkillEffect::Heal(1), 3_000);
        s.trigger_cooldown();
        assert!(!s.is_ready());
        assert_eq!(s.remaining_cooldown_secs(), 3);

        assert!(!s.tick_cooldown_ms(1_500));
        assert_eq!(s.remaining_cooldown_secs(), 2);
        assert!(!s.tick_cooldown_ms(1_000));
        assert_eq!(s.remaining_cooldown_secs(), 1);
        assert!(s.tick_cooldown_ms(1_500));
        assert_eq!(s.remaining_cooldown_ms, 0);
        assert!(s.is_ready());
    }

    #[test]
    fn display_ready() {
        let s = Skill::new("紧急救治", "恢复 1 点生命值", SkillEffect::Heal(1), 4_000);
        let text = format!("{s}");
        assert!(text.contains("可用"));
    }

    #[test]
    fn display_on_cooldown() {
        let mut s = Skill::new("紧急救治", "恢复 1 点生命值", SkillEffect::Heal(1), 4_000);
        s.trigger_cooldown();
        let text = format!("{s}");
        assert!(text.contains("冷却 4 秒"));
    }
}
