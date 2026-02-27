use std::io::{self, BufRead};
use std::sync::mpsc::{self, Receiver};
use std::thread;
use std::time::{Duration, Instant};

use rand::Rng;

use crate::card::attack::create_attack_card;
use crate::card::defense::create_defense_card;
use crate::card::{Card, CardEffect};
use crate::character::Player;
use crate::enemy::Slime;
use crate::mechanics::combat::Combatant;
use crate::skill::emergency_heal::create_emergency_heal;
use crate::skill::fast_cycle::create_fast_cycle;
use crate::skill::SkillEffect;

const ROUND_DURATION: Duration = Duration::from_secs(5);
const LOOP_TICK: Duration = Duration::from_millis(100);
const PLAYER_INITIAL_CARD_COOLDOWN_MS: u64 = 1_000;
const ENEMY_INITIAL_CARD_COOLDOWN_MS: u64 = 2_000;

/// Drives the main game loop: each round lasts 5 seconds, both sides can act once per round.
pub struct GameEngine {
    player: Player,
    enemy: Slime,
    round: u32,
    enemy_card: Card,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PlayerActionResult {
    None,
    CardUsed,
    SkillUsed,
}

impl GameEngine {
    pub fn new() -> Self {
        let mut player = Player::new("勇者", 3);
        player.add_card(create_attack_card());
        player.add_card(create_defense_card());
        player.equip_skill(create_emergency_heal());
        player.equip_skill(create_fast_cycle());
        for card in &mut player.hand {
            card.set_initial_cooldown_ms(PLAYER_INITIAL_CARD_COOLDOWN_MS);
        }

        let enemy = Slime::new("史莱姆", 3);
        let mut enemy_card = create_attack_card();
        enemy_card.set_initial_cooldown_ms(ENEMY_INITIAL_CARD_COOLDOWN_MS);

        Self {
            player,
            enemy,
            round: 1,
            enemy_card,
        }
    }

    pub fn run(&mut self) {
        let input_rx = Self::spawn_input_reader();
        self.print_welcome();

        while self.player.is_alive() && self.enemy.is_alive() {
            self.play_round(&input_rx);
            if !self.player.is_alive() || !self.enemy.is_alive() {
                break;
            }
            self.finish_round();
        }

        self.print_result();
    }

    fn spawn_input_reader() -> Receiver<String> {
        let (tx, rx) = mpsc::channel();
        thread::spawn(move || {
            let stdin = io::stdin();
            for line in stdin.lock().lines().map_while(Result::ok) {
                if tx.send(line).is_err() {
                    break;
                }
            }
        });
        rx
    }

    fn play_round(&mut self, input_rx: &Receiver<String>) {
        self.print_status();
        self.print_actions();
        println!("⏱️ 本回合持续 5 秒：卡牌每回合仅能使用一次；技能不受回合次数限制，可与卡牌同回合使用。");

        let round_start = Instant::now();
        let round_end = round_start + ROUND_DURATION;
        let mut last_tick = round_start;
        let enemy_action_at = self.plan_enemy_action_time(round_start, round_end);

        let mut player_used_card = false;
        let mut player_did_any_action = false;
        let mut enemy_acted = false;

        while Instant::now() < round_end && self.player.is_alive() && self.enemy.is_alive() {
            let now = Instant::now();
            let elapsed = now.saturating_duration_since(last_tick);
            if elapsed > Duration::ZERO {
                self.tick_cooldowns(elapsed);
                last_tick = now;
            }

            while let Ok(line) = input_rx.try_recv() {
                match self.try_execute_player_action(&line, player_used_card) {
                    PlayerActionResult::None => {}
                    PlayerActionResult::CardUsed => {
                        player_used_card = true;
                        player_did_any_action = true;
                    }
                    PlayerActionResult::SkillUsed => {
                        player_did_any_action = true;
                    }
                }
            }

            if !enemy_acted
                && self.enemy.is_alive()
                && enemy_action_at.is_some_and(|planned| now >= planned)
                && self.enemy_card.is_ready()
            {
                self.execute_enemy_action();
                enemy_acted = true;
            }

            if !self.player.is_alive() || !self.enemy.is_alive() {
                break;
            }

            let now_after = Instant::now();
            if now_after >= round_end {
                break;
            }
            let remaining = round_end.duration_since(now_after);
            thread::sleep(remaining.min(LOOP_TICK));
        }

        let now = Instant::now();
        let elapsed = now.saturating_duration_since(last_tick);
        if elapsed > Duration::ZERO {
            self.tick_cooldowns(elapsed);
        }

        if self.player.is_alive() && !player_did_any_action {
            println!("⌛ 你在本回合未行动。");
        }
        if self.enemy.is_alive() && !enemy_acted {
            println!("⌛ {} 在本回合未行动。", self.enemy.name());
        }
        println!();
    }

    fn finish_round(&mut self) {
        self.player.clear_shield();
        self.enemy.clear_shield();
        self.round += 1;
    }

    fn plan_enemy_action_time(&self, round_start: Instant, round_end: Instant) -> Option<Instant> {
        let earliest = round_start + Duration::from_millis(self.enemy_card.remaining_cooldown_ms());
        if earliest >= round_end {
            return None;
        }

        let latest = round_end - Duration::from_millis(300);
        if earliest >= latest {
            return Some(earliest);
        }

        let window_ms = latest.duration_since(earliest).as_millis() as u64;
        let random_delay_ms = rand::thread_rng().gen_range(0..=window_ms);
        Some(earliest + Duration::from_millis(random_delay_ms))
    }

    fn tick_cooldowns(&mut self, elapsed: Duration) {
        let elapsed_ms = elapsed.as_millis() as u64;
        if elapsed_ms == 0 {
            return;
        }
        for card in &mut self.player.hand {
            card.tick_cooldown_ms(elapsed_ms);
        }
        self.enemy_card.tick_cooldown_ms(elapsed_ms);
        self.player.tick_skill_cooldowns_ms(elapsed_ms);
    }

    fn print_welcome(&self) {
        println!("╔══════════════════════════════════╗");
        println!("║     小二的回合制卡牌游戏          ║");
        println!("╚══════════════════════════════════╝");
        println!();
        println!("战斗开始！ {} vs {}", self.player.name(), self.enemy.name());
        println!(
            "⚙️ 速度：{}={}，{}={}",
            self.player.name(),
            self.player.speed(),
            self.enemy.name(),
            self.enemy.speed()
        );
        println!("📌 新机制：每回合 5 秒；卡牌每回合最多使用一次，技能不受回合次数限制。");
        println!("📌 卡牌冷却：每张牌 3 秒；开局玩家牌 1 秒冷却，敌方牌 2 秒冷却。");
        println!();
    }

    fn print_status(&self) {
        println!("┌─── 第 {} 回合（5 秒） ───┐", self.round);
        println!("│  {}", self.player.display_status());
        println!("│  {}", self.enemy.display_status());
        println!("└──────────────────────────┘");
    }

    fn print_actions(&self) {
        println!("\n你的手牌：");
        for (i, card) in self.player.hand.iter().enumerate() {
            let status = if card.is_ready() {
                "可用".to_string()
            } else {
                format!("冷却 {} 秒", card.remaining_cooldown_secs())
            };
            println!("  [{}] {} [{}]", i + 1, card, status);
        }

        if !self.player.skills.is_empty() {
            println!("\n你的技能：");
            let offset = self.player.hand.len();
            for (i, skill) in self.player.skills.iter().enumerate() {
                println!("  [{}] {}", offset + i + 1, skill);
            }
        }
        println!();
    }

    fn try_execute_player_action(
        &mut self,
        line: &str,
        player_used_card: bool,
    ) -> PlayerActionResult {
        let total_actions = self.player.hand.len() + self.player.skills.len();
        if total_actions == 0 {
            return PlayerActionResult::None;
        }

        let choice = match line.trim().parse::<usize>() {
            Ok(n) if n >= 1 && n <= total_actions => n - 1,
            _ => {
                println!("无效输入，请输入 1 到 {} 之间的数字。", total_actions);
                return PlayerActionResult::None;
            }
        };

        let card_count = self.player.hand.len();
        if choice < card_count {
            if player_used_card {
                println!("\n⛔ 本回合已使用过卡牌，但仍可使用技能。");
                return PlayerActionResult::None;
            }
            let (card_name, effect) = {
                let card = &mut self.player.hand[choice];
                if !card.is_ready() {
                    println!(
                        "\n⏳ 「{}」仍在冷却中（剩余 {} 秒）。",
                        card.name,
                        card.remaining_cooldown_secs()
                    );
                    return PlayerActionResult::None;
                }
                card.trigger_cooldown();
                (card.name.clone(), card.effect.clone())
            };

            println!("\n▶ 你使用了「{}」！", card_name);
            match effect {
                CardEffect::Damage(amount) => self.log_damage(amount, "enemy"),
                CardEffect::Shield(amount) => {
                    self.player.add_shield(amount);
                    println!("  🛡️ 获得了 {} 点护盾！", amount);
                }
            }
            println!();
            return PlayerActionResult::CardUsed;
        }

        let skill_idx = choice - card_count;
        if !self.player.skills[skill_idx].is_ready() {
            println!(
                "\n⏳ 「{}」仍在冷却中（剩余 {} 秒）。",
                self.player.skills[skill_idx].name,
                self.player.skills[skill_idx].remaining_cooldown_secs()
            );
            return PlayerActionResult::None;
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
            SkillEffect::ReduceAllCardCooldownMs(amount_ms) => {
                for card in &mut self.player.hand {
                    card.reduce_cooldown_ms(amount_ms);
                }
                println!("  🌀 当前所有卡牌冷却减少了 1 秒！");
            }
        }
        self.player.skills[skill_idx].trigger_cooldown();
        println!();
        PlayerActionResult::SkillUsed
    }

    fn execute_enemy_action(&mut self) {
        if !self.enemy_card.is_ready() {
            return;
        }

        let card_name = self.enemy_card.name.clone();
        let effect = self.enemy_card.effect.clone();
        self.enemy_card.trigger_cooldown();

        println!("\n▶ {} 使用了「{}」！", self.enemy.name(), card_name);
        match effect {
            CardEffect::Damage(amount) => self.log_damage(amount, "player"),
            CardEffect::Shield(amount) => {
                self.enemy.add_shield(amount);
                println!("  🛡️ {} 获得了 {} 点护盾！", self.enemy.name(), amount);
            }
        }
        println!();
    }

    /// Applies damage to the specified target side, printing shield / damage info.
    fn log_damage(&mut self, amount: i32, target_side: &str) {
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
