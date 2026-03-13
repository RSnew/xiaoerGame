use super::{Skill, SkillEffect};

/// Creates the "战吼" skill: gain 2 shield. Cooldown 12s.
pub fn create_war_cry() -> Skill {
    Skill::new("战吼", "获得 2 点护盾", SkillEffect::GainShield(2), 12_000)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn war_cry_properties() {
        let s = create_war_cry();
        assert_eq!(s.name, "战吼");
        assert_eq!(s.cooldown_ms, 12_000);
        assert!(s.is_ready());
        assert!(matches!(s.effect, SkillEffect::GainShield(2)));
    }
}
