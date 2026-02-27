use super::{Skill, SkillEffect};

/// Creates the "快速循环" skill:
/// - Cooldown: 20 秒（4 回合）
/// - Initial lockout: 开局 5 秒后可用（1 回合）
/// - Effect: Reduce all current cards' remaining cooldown by 1 秒（1000ms）
pub fn create_fast_cycle() -> Skill {
    Skill::new(
        "快速循环",
        "开局 5 秒后可用；使当前所有卡牌冷却减少 1 秒",
        SkillEffect::ReduceAllCardCooldownMs(1_000),
        4,
    )
    .with_initial_cooldown(1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fast_cycle_properties() {
        let s = create_fast_cycle();
        assert_eq!(s.name, "快速循环");
        assert_eq!(s.cooldown, 4);
        assert!(!s.is_ready());
        assert_eq!(s.current_cooldown, 1);
        assert!(matches!(
            s.effect,
            SkillEffect::ReduceAllCardCooldownMs(1_000)
        ));
    }
}
