use std::io::{self, BufRead, Write};

use crate::card::attack::create_attack_card;
use crate::card::defense::create_defense_card;
use crate::card::CardEffect;
use crate::character::Player;
use crate::enemy::Slime;
use crate::mechanics::combat::Combatant;
use crate::mechanics::turn::TurnPhase;

/// Drives the main game loop: alternating player / enemy turns until one side falls.
pub struct GameEngine {
    player: Player,
    enemy: Slime,
    phase: TurnPhase,
    round: u32,
}

impl GameEngine {
    pub fn new() -> Self {
        let mut player = Player::new("勇者", 3);
        player.add_card(create_attack_card());
        player.add_card(create_defense_card());

        let enemy = Slime::new("史莱姆", 3);

        Self {
            player,
            enemy,
            phase: TurnPhase::PlayerTurn,
            round: 1,
        }
    }

    pub fn run(&mut self) {
        let stdin = io::stdin();
        let mut lines = stdin.lock().lines();

        self.print_welcome();

        while self.player.is_alive() && self.enemy.is_alive() {
            self.print_status();

            match self.phase {
                TurnPhase::PlayerTurn => self.player_turn(&mut lines),
                TurnPhase::EnemyTurn => self.enemy_turn(),
            }

            self.phase = self.phase.next();
            if self.phase == TurnPhase::PlayerTurn {
                self.round += 1;
                self.player.clear_shield();
                self.enemy.clear_shield();
            }
        }

        self.print_result();
    }

    fn print_welcome(&self) {
        println!("╔══════════════════════════════════╗");
        println!("║     小二的回合制卡牌游戏          ║");
        println!("╚══════════════════════════════════╝");
        println!();
        println!("战斗开始！ {} vs {}", self.player.name(), self.enemy.name());
        println!();
    }

    fn print_status(&self) {
        println!("┌─── 第 {} 回合 ─── {} ───┐", self.round, self.phase);
        println!("│  {}", self.player.display_status());
        println!("│  {}", self.enemy.display_status());
        println!("└──────────────────────────────────┘");
    }

    fn player_turn(&mut self, lines: &mut impl Iterator<Item = io::Result<String>>) {
        println!("\n你的手牌：");
        for (i, card) in self.player.hand.iter().enumerate() {
            println!("  [{}] {}", i + 1, card);
        }

        let choice = self.read_choice(lines);
        let card = self.player.hand[choice].clone();

        println!("\n▶ 你使用了「{}」！", card.name);

        match card.effect {
            CardEffect::Damage(amount) => {
                self.log_damage(&card, amount, "enemy");
            }
            CardEffect::Shield(amount) => {
                self.player.add_shield(amount);
                println!("  🛡️ 获得了 {} 点护盾！", amount);
            }
        }
        println!();
    }

    fn enemy_turn(&mut self) {
        let attack = create_attack_card();
        println!("\n▶ {} 使用了「{}」！", self.enemy.name(), attack.name);

        match attack.effect {
            CardEffect::Damage(amount) => {
                self.log_damage(&attack, amount, "player");
            }
            CardEffect::Shield(_) => {}
        }
        println!();
    }

    /// Applies damage from `card` to the specified target side, printing shield / damage info.
    fn log_damage(&mut self, _card: &crate::card::Card, amount: i32, target_side: &str) {
        let (target_name, shield_before) = match target_side {
            "enemy" => (self.enemy.name().to_string(), self.enemy.shield()),
            _ => (self.player.name().to_string(), self.player.shield()),
        };

        match target_side {
            "enemy" => self.enemy.take_damage(amount),
            _ => self.player.take_damage(amount),
        }

        let shield_after = match target_side {
            "enemy" => self.enemy.shield(),
            _ => self.player.shield(),
        };

        let absorbed = shield_before - shield_after;
        let actual = amount - absorbed;

        if absorbed > 0 {
            println!("  🛡️ {}的护盾抵消了 {} 点伤害！", target_name, absorbed);
        }
        if actual > 0 {
            println!("  对 {} 造成了 {} 点伤害！", target_name, actual);
        } else {
            println!("  攻击被完全抵挡！");
        }
    }

    fn read_choice(&self, lines: &mut impl Iterator<Item = io::Result<String>>) -> usize {
        loop {
            print!("选择要使用的卡牌 (输入编号): ");
            io::stdout().flush().unwrap();

            let line = match lines.next() {
                Some(Ok(l)) => l,
                _ => return 0,
            };

            match line.trim().parse::<usize>() {
                Ok(n) if n >= 1 && n <= self.player.hand.len() => return n - 1,
                _ => println!(
                    "无效输入，请输入 1 到 {} 之间的数字。",
                    self.player.hand.len()
                ),
            }
        }
    }

    fn print_result(&self) {
        println!("╔══════════════════════════════════╗");
        if self.player.is_alive() {
            println!("║          你胜利了！              ║");
        } else {
            println!("║          你被击败了…             ║");
        }
        println!("╚══════════════════════════════════╝");
        println!("\n最终状态：");
        println!("  {}", self.player.display_status());
        println!("  {}", self.enemy.display_status());
    }
}
