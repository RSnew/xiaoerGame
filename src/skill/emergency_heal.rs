use super::{Skill, SkillEffect};

/// Creates the "紧急救治" skill: cooldown 20 seconds, heals 1 HP, available at start.
pub fn create_emergency_heal() -> Skill {
    Skill::new("紧急救治", "恢复 1 点生命值", SkillEffect::Heal(1), 20_000)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn emergency_heal_properties() {
        let s = create_emergency_heal();
        assert_eq!(s.name, "紧急救治");
        assert_eq!(s.cooldown_ms, 20_000);
        assert!(s.is_ready());
        assert!(matches!(s.effect, SkillEffect::Heal(1)));
    }
}
