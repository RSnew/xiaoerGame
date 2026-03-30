/// Buff / Debuff system.
/// Known buff identifiers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum BuffId {
    /// 滋润 — each stack +5% heal effectiveness.
    Nourish,
    /// 脆弱 — each stack +5% incoming damage.
    Fragile,
}

impl BuffId {
    pub fn name(&self) -> &'static str {
        match self {
            BuffId::Nourish => "滋润",
            BuffId::Fragile => "脆弱",
        }
    }

    pub fn icon(&self) -> &'static str {
        match self {
            BuffId::Nourish => "💧",
            BuffId::Fragile => "🔻",
        }
    }

    pub fn max_stacks(&self) -> u32 {
        match self {
            BuffId::Nourish => 20,
            BuffId::Fragile => 20,
        }
    }
}

/// A buff/debuff instance on a combatant.
#[derive(Debug, Clone)]
pub struct Buff {
    pub id: BuffId,
    pub stacks: u32,
    pub duration: u32, // 0 = permanent
}

impl Buff {
    pub fn new(id: BuffId, stacks: u32, duration: u32) -> Self {
        let max = id.max_stacks();
        Self {
            id,
            stacks: stacks.min(max),
            duration,
        }
    }

    pub fn add_stacks(&mut self, n: u32) {
        let max = self.id.max_stacks();
        self.stacks = (self.stacks + n).min(max);
    }

    /// Tick duration. Returns true if expired.
    pub fn tick(&mut self) -> bool {
        if self.duration == 0 {
            return false;
        }
        self.duration = self.duration.saturating_sub(1);
        self.duration == 0
    }
}

/// Manages buffs on a combatant.
#[derive(Debug, Clone, Default)]
pub struct BuffManager {
    pub buffs: Vec<Buff>,
}

impl BuffManager {
    pub fn new() -> Self {
        Self { buffs: Vec::new() }
    }

    pub fn apply(&mut self, id: BuffId, stacks: u32, duration: u32) {
        if let Some(existing) = self.buffs.iter_mut().find(|b| b.id == id) {
            existing.add_stacks(stacks);
            if duration > 0 && duration > existing.duration {
                existing.duration = duration;
            }
        } else {
            self.buffs.push(Buff::new(id, stacks, duration));
        }
    }

    pub fn remove(&mut self, id: BuffId) {
        self.buffs.retain(|b| b.id != id);
    }

    pub fn stacks(&self, id: BuffId) -> u32 {
        self.buffs
            .iter()
            .find(|b| b.id == id)
            .map_or(0, |b| b.stacks)
    }

    /// Tick all buffs and remove expired ones. Returns expired ids.
    pub fn tick(&mut self) -> Vec<BuffId> {
        let mut expired = Vec::new();
        self.buffs.retain_mut(|b| {
            if b.tick() {
                expired.push(b.id);
                false
            } else {
                true
            }
        });
        expired
    }

    pub fn clear(&mut self) {
        self.buffs.clear();
    }

    /// Calculate heal multiplier from nourish buff (1.0 + stacks * 0.05).
    pub fn nourish_heal_multiplier(&self) -> f64 {
        let stacks = self.stacks(BuffId::Nourish);
        1.0 + stacks as f64 * 0.05
    }

    /// Calculate incoming damage multiplier from fragile debuff (1.0 + stacks * 0.05).
    pub fn fragile_damage_multiplier(&self) -> f64 {
        let stacks = self.stacks(BuffId::Fragile);
        1.0 + stacks as f64 * 0.05
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nourish_heal_bonus() {
        let mut mgr = BuffManager::new();
        assert!((mgr.nourish_heal_multiplier() - 1.0).abs() < f64::EPSILON);

        mgr.apply(BuffId::Nourish, 2, 0);
        assert!((mgr.nourish_heal_multiplier() - 1.10).abs() < f64::EPSILON);

        mgr.apply(BuffId::Nourish, 3, 0);
        assert_eq!(mgr.stacks(BuffId::Nourish), 5);
        assert!((mgr.nourish_heal_multiplier() - 1.25).abs() < f64::EPSILON);
    }

    #[test]
    fn max_stacks_capped() {
        let mut mgr = BuffManager::new();
        mgr.apply(BuffId::Nourish, 100, 0);
        assert_eq!(mgr.stacks(BuffId::Nourish), 20);
    }

    #[test]
    fn fragile_damage_bonus() {
        let mut mgr = BuffManager::new();
        assert!((mgr.fragile_damage_multiplier() - 1.0).abs() < f64::EPSILON);

        mgr.apply(BuffId::Fragile, 3, 0);
        assert!((mgr.fragile_damage_multiplier() - 1.15).abs() < f64::EPSILON);

        mgr.apply(BuffId::Fragile, 2, 0);
        assert_eq!(mgr.stacks(BuffId::Fragile), 5);
        assert!((mgr.fragile_damage_multiplier() - 1.25).abs() < f64::EPSILON);
    }

    #[test]
    fn fragile_max_stacks_capped() {
        let mut mgr = BuffManager::new();
        mgr.apply(BuffId::Fragile, 100, 0);
        assert_eq!(mgr.stacks(BuffId::Fragile), 20);
    }

    #[test]
    fn duration_tick_expires() {
        let mut mgr = BuffManager::new();
        mgr.apply(BuffId::Nourish, 3, 2);
        assert_eq!(mgr.stacks(BuffId::Nourish), 3);

        let expired = mgr.tick();
        assert!(expired.is_empty());
        assert_eq!(mgr.stacks(BuffId::Nourish), 3);

        let expired = mgr.tick();
        assert_eq!(expired, vec![BuffId::Nourish]);
        assert_eq!(mgr.stacks(BuffId::Nourish), 0);
    }
}
