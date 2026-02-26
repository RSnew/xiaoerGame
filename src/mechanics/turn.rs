/// Represents whose turn it currently is.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TurnPhase {
    PlayerTurn,
    EnemyTurn,
}

impl TurnPhase {
    pub fn next(self) -> Self {
        match self {
            TurnPhase::PlayerTurn => TurnPhase::EnemyTurn,
            TurnPhase::EnemyTurn => TurnPhase::PlayerTurn,
        }
    }
}

impl std::fmt::Display for TurnPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TurnPhase::PlayerTurn => write!(f, "玩家回合"),
            TurnPhase::EnemyTurn => write!(f, "敌人回合"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn turn_alternates() {
        let t = TurnPhase::PlayerTurn;
        assert_eq!(t.next(), TurnPhase::EnemyTurn);
        assert_eq!(t.next().next(), TurnPhase::PlayerTurn);
    }

    #[test]
    fn display_chinese() {
        assert_eq!(format!("{}", TurnPhase::PlayerTurn), "玩家回合");
        assert_eq!(format!("{}", TurnPhase::EnemyTurn), "敌人回合");
    }
}
