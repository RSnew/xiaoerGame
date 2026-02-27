use std::io::{self, BufRead, Write};

use rand::Rng;

use crate::card::attack::create_attack_card;
use crate::card::defense::create_defense_card;
use crate::card::CardEffect;
use crate::character::Player;
use crate::enemy::Slime;
use crate::mechanics::combat::Combatant;
use crate::mechanics::turn::TurnPhase;
use crate::skill::emergency_heal::create_emergency_heal;
use crate::skill::SkillEffect;

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
        player.equip_skill(create_emergency_heal());

        let enemy = Slime::new("史莱姆", 3);

        let phase = Self::decide_first_turn(player.speed(), enemy.speed());

        Self {
            player,
            enemy,
            phase,
            round: 1,
        }
    }

    fn decide_first_turn(player_speed: i32, enemy_speed: i32) -> TurnPhase {
        match player_speed.cmp(&enemy_speed) {
            std::cmp::Ordering::Greater => TurnPhase::PlayerTurn,
            std::cmp::Ordering::Less => TurnPhase::EnemyTurn,
            std::cmp::Ordering::Equal => {
                if rand::rng().random_bool(0.5) {
                    TurnPhase::PlayerTurn
                } else {
                    TurnPhase::EnemyTurn
                }
            }
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
                self.player.tick_skill_cooldowns();
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
        let first = match self.phase {
            TurnPhase::PlayerTurn => self.player.name(),
            TurnPhase::EnemyTurn => self.enemy.name(),
        };
        println!("⚡ {} 抢得先手！", first);
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

        let card_count = self.player.hand.len();

        if !self.player.skills.is_empty() {
            println!("\n你的技能：");
            for (i, skill) in self.player.skills.iter().enumerate() {
                println!("  [{}] {}", card_count + i + 1, skill);
            }
        }

        let total = card_count + self.player.skills.len();
        let choice = self.read_action(lines, total);

        if choice < card_count {
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
        } else {
            let skill_idx = choice - card_count;
            if !self.player.skills[skill_idx].is_ready() {
                println!(
                    "\n⏳ 「{}」还在冷却中（剩余 {} 回合），请选择其他操作。",
                    self.player.skills[skill_idx].name,
                    self.player.skills[skill_idx].current_cooldown
                );
                self.player_turn(lines);
                return;
            }
            let skill = self.player.skills[skill_idx].clone();
            println!("\n▶ 你使用了技能「{}」！", skill.name);
            match skill.effect {
                SkillEffect::Heal(amount) => {
                    let healed = self.player.heal(amount);
                    if healed > 0 {
                        println!("  ❤️ 恢复了 {} 点生命值！", healed);
                    } else {
                        println!("  ❤️ 生命值已满，未恢复。");
                    }
                }
            }
            self.player.skills[skill_idx].trigger_cooldown();
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

    fn read_action(
        &self,
        lines: &mut impl Iterator<Item = io::Result<String>>,
        max: usize,
    ) -> usize {
        loop {
            print!("选择要执行的操作 (输入编号): ");
            io::stdout().flush().unwrap();

            let line = match lines.next() {
                Some(Ok(l)) => l,
                _ => return 0,
            };

            match line.trim().parse::<usize>() {
                Ok(n) if n >= 1 && n <= max => return n - 1,
                _ => println!("无效输入，请输入 1 到 {} 之间的数字。", max),
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
