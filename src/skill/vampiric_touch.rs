use super::{Skill, SkillEffect};

/// Creates the "吸血之触" skill: deal 1 damage to enemy and heal 1 HP. Cooldown 18s.
pub fn create_vampiric_touch() -> Skill {
    Skill::new(
        "吸血之触",
        "对敌方造成 1 点伤害，同时恢复 1 点生命值",
        SkillEffect::DamageAndHeal { damage: 1, heal: 1 },
        18_000,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vampiric_touch_properties() {
        let s = create_vampiric_touch();
        assert_eq!(s.name, "吸血之触");
        assert_eq!(s.cooldown_ms, 18_000);
        assert!(s.is_ready());
        assert!(matches!(
            s.effect,
            SkillEffect::DamageAndHeal { damage: 1, heal: 1 }
        ));
    }
}
