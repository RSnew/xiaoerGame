pub mod emergency_heal;

/// The effect a skill produces when activated.
#[derive(Debug, Clone)]
pub enum SkillEffect {
    Heal(i32),
}

/// An equippable skill with a cooldown.
#[derive(Debug, Clone)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub effect: SkillEffect,
    pub cooldown: u32,
    pub current_cooldown: u32,
}

impl Skill {
    pub fn new(name: &str, description: &str, effect: SkillEffect, cooldown: u32) -> Self {
        Self {
            name: name.to_string(),
            description: description.to_string(),
            effect,
            cooldown,
            current_cooldown: 0,
        }
    }

    pub fn is_ready(&self) -> bool {
        self.current_cooldown == 0
    }

    /// Put this skill on cooldown after use.
    pub fn trigger_cooldown(&mut self) {
        self.current_cooldown = self.cooldown;
    }

    /// Tick one turn of cooldown. Returns true if the skill just became ready.
    pub fn tick_cooldown(&mut self) -> bool {
        if self.current_cooldown > 0 {
            self.current_cooldown -= 1;
            return self.current_cooldown == 0;
        }
        false
    }
}

impl std::fmt::Display for Skill {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.is_ready() {
            write!(f, "{} - {} [可用]", self.name, self.description)
        } else {
            write!(
                f,
                "{} - {} [冷却中: {}回合]",
                self.name, self.description, self.current_cooldown
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skill_starts_ready() {
        let s = Skill::new("测试", "测试技能", SkillEffect::Heal(1), 4);
        assert!(s.is_ready());
    }

    #[test]
    fn cooldown_cycle() {
        let mut s = Skill::new("测试", "测试技能", SkillEffect::Heal(1), 3);
        s.trigger_cooldown();
        assert!(!s.is_ready());
        assert_eq!(s.current_cooldown, 3);

        assert!(!s.tick_cooldown());
        assert_eq!(s.current_cooldown, 2);
        assert!(!s.tick_cooldown());
        assert_eq!(s.current_cooldown, 1);
        assert!(s.tick_cooldown());
        assert_eq!(s.current_cooldown, 0);
        assert!(s.is_ready());
    }

    #[test]
    fn display_ready() {
        let s = Skill::new("紧急救治", "恢复 1 点生命值", SkillEffect::Heal(1), 4);
        let text = format!("{s}");
        assert!(text.contains("可用"));
    }

    #[test]
    fn display_on_cooldown() {
        let mut s = Skill::new("紧急救治", "恢复 1 点生命值", SkillEffect::Heal(1), 4);
        s.trigger_cooldown();
        let text = format!("{s}");
        assert!(text.contains("冷却中: 4回合"));
    }
}
