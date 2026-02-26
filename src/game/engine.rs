use std::io::{self, BufRead, Write};

use crate::card::attack::create_attack_card;
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
        let card = &self.player.hand[choice];

        println!("\n▶ 你使用了「{}」！", card.name);

        match card.effect {
            CardEffect::Damage(amount) => {
                self.enemy.take_damage(amount);
                println!("  对 {} 造成了 {} 点伤害！", self.enemy.name(), amount);
            }
        }
        println!();
    }

    fn enemy_turn(&mut self) {
        let attack = create_attack_card();
        println!("\n▶ {} 使用了「{}」！", self.enemy.name(), attack.name);

        match attack.effect {
            CardEffect::Damage(amount) => {
                self.player.take_damage(amount);
                println!("  对 {} 造成了 {} 点伤害！", self.player.name(), amount);
            }
        }
        println!();
    }

    fn read_choice(&self, lines: &mut impl Iterator<Item = io::Result<String>>) -> usize {
        loop {
            print!("选择要使用的卡牌 (输入编号): ");
            io::stdout().flush().unwrap();

            let line = match lines.next() {
                Some(Ok(l)) => l,
                _ => return 0, // EOF → default to first card
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
