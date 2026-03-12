use std::io::{self, BufRead};
use std::sync::mpsc::{self, Receiver};
use std::thread;
use std::time::{Duration, Instant};

use rand::Rng;

use crate::card::attack::create_attack_card;
use crate::card::critical_strike::create_critical_strike_card;
use crate::card::defense::create_defense_card;
use crate::card::heal::create_heal_card;
use crate::card::{Card, CardEffect};
use crate::character::player::PassiveSkill;
use crate::character::Player;
use crate::enemy::{Dragon, ForestWolf, GoblinRogue, SkeletonMage, Slime};
use crate::mechanics::combat::Combatant;
use crate::skill::emergency_heal::create_emergency_heal;
use crate::skill::fast_cycle::create_fast_cycle;
use crate::skill::vampiric_touch::create_vampiric_touch;
use crate::skill::war_cry::create_war_cry;
use crate::skill::SkillEffect;

const ROUND_DURATION: Duration = Duration::from_secs(5);
const LOOP_TICK: Duration = Duration::from_millis(100);
const PLAYER_INITIAL_CARD_COOLDOWN_MS: u64 = 1_000;
const ENEMY_INITIAL_CARD_COOLDOWN_MS: u64 = 2_000;
const STAGES_BEFORE_BOSS: u32 = 3;

/// Drives the main game loop: multiple stages of battle, shop between stages, boss at the end.
pub struct GameEngine {
    player: Player,
    enemy: Box<dyn Combatant>,
    round: u32,
    stage: u32,
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
        player.set_passive(PassiveSkill::Prepared);
        player.add_card(create_attack_card());
        player.add_card(create_defense_card());
        player.equip_skill(create_emergency_heal());
        player.equip_skill(create_fast_cycle());
        for card in &mut player.hand {
            card.set_initial_cooldown_ms(PLAYER_INITIAL_CARD_COOLDOWN_MS);
        }

        let enemy = Self::random_normal_enemy();
        let mut enemy_card = create_attack_card();
        enemy_card.set_initial_cooldown_ms(ENEMY_INITIAL_CARD_COOLDOWN_MS);

        Self {
            player,
            enemy,
            round: 1,
            stage: 1,
            enemy_card,
        }
    }

    fn random_normal_enemy() -> Box<dyn Combatant> {
        match rand::thread_rng().gen_range(0..4u32) {
            0 => Box::new(Slime::new("史莱姆", 3)),
            1 => Box::new(GoblinRogue::new("哥布林刺客", 4)),
            2 => Box::new(SkeletonMage::new("骷髅法师", 5)),
            _ => Box::new(ForestWolf::new("森林狼", 3)),
        }
    }

    fn create_boss() -> Box<dyn Combatant> {
        Box::new(Dragon::new("巨龙", 8))
    }

    fn create_boss_card() -> Card {
        // Boss deals 2 damage per attack
        Card::new("龙息", "造成 2 点伤害", CardEffect::Damage(2), 4_000)
    }

    pub fn run(&mut self) {
        let input_rx = Self::spawn_input_reader();

        println!("╔══════════════════════════════════╗");
        println!("║     小二的回合制卡牌游戏          ║");
        println!("╚══════════════════════════════════╝");
        println!();
        println!(
            "📜 冒险开始！击败 {} 个敌人后将迎战 Boss！",
            STAGES_BEFORE_BOSS
        );
        println!();

        loop {
            let is_boss = self.stage > STAGES_BEFORE_BOSS;

            if is_boss {
                println!("╔══════════════════════════════════╗");
                println!("║        Boss 战！                 ║");
                println!("╚══════════════════════════════════╝");
            }

            self.print_welcome();

            // Battle loop
            while self.player.is_alive() && self.enemy.is_alive() {
                self.play_round(&input_rx);
                if !self.player.is_alive() || !self.enemy.is_alive() {
                    break;
                }
                self.finish_round();
            }

            if !self.player.is_alive() {
                self.print_defeat();
                return;
            }

            // Victory
            self.print_victory();

            if is_boss {
                println!("\n🏆 恭喜通关！你击败了所有敌人！");
                println!("🪙 最终金币：{}", self.player.gold());
                return;
            }

            // Shop between stages
            self.run_shop(&input_rx);

            // Prepare next stage
            self.stage += 1;
            self.round = 1;

            if self.stage > STAGES_BEFORE_BOSS {
                // Boss stage
                self.enemy = Self::create_boss();
                let mut boss_card = Self::create_boss_card();
                boss_card.set_initial_cooldown_ms(ENEMY_INITIAL_CARD_COOLDOWN_MS);
                self.enemy_card = boss_card;
            } else {
                self.enemy = Self::random_normal_enemy();
                let mut enemy_card = create_attack_card();
                enemy_card.set_initial_cooldown_ms(ENEMY_INITIAL_CARD_COOLDOWN_MS);
                self.enemy_card = enemy_card;
            }

            self.player.reset_for_battle();
            for card in &mut self.player.hand {
                card.set_initial_cooldown_ms(PLAYER_INITIAL_CARD_COOLDOWN_MS);
            }
        }
    }

    fn run_shop(&mut self, input_rx: &Receiver<String>) {
        println!("\n╔══════════════════════════════════╗");
        println!("║           商  店                 ║");
        println!("╚══════════════════════════════════╝");
        println!("🪙 当前金币：{}\n", self.player.gold());

        // Build shop items
        let mut items: Vec<(&str, i32, ShopItem)> = Vec::new();

        // Only offer cards/skills the player doesn't already have
        if !self.player.hand.iter().any(|c| c.name == "暴击") {
            items.push((
                "暴击卡 - 造成 2 点伤害（5秒冷却）",
                4,
                ShopItem::CriticalStrike,
            ));
        }
        if !self.player.hand.iter().any(|c| c.name == "治愈") {
            items.push(("治愈卡 - 恢复 1 点生命值（4秒冷却）", 3, ShopItem::HealCard));
        }
        if !self.player.skills.iter().any(|s| s.name == "吸血之触") {
            items.push((
                "吸血之触技能 - 对敌方造成1伤害并恢复1血（18秒冷却）",
                5,
                ShopItem::VampiricTouch,
            ));
        }
        if !self.player.skills.iter().any(|s| s.name == "战吼") {
            items.push(("战吼技能 - 获得 2 点护盾（12秒冷却）", 4, ShopItem::WarCry));
        }

        if items.is_empty() {
            println!("  商店已售罄！你拥有了所有物品。");
            println!("  按回车继续...");
            self.wait_for_input(input_rx);
            return;
        }

        for (i, (desc, price, _)) in items.iter().enumerate() {
            println!("  [{}] {} （💰{}金币）", i + 1, desc, price);
        }
        println!("  [0] 不购买，继续冒险\n");

        loop {
            println!("请输入选择（0-{}）：", items.len());

            let line = self.wait_for_input(input_rx);
            let choice: usize = match line.trim().parse() {
                Ok(n) if n <= items.len() => n,
                _ => {
                    println!("无效输入。");
                    continue;
                }
            };

            if choice == 0 {
                println!("继续冒险！\n");
                break;
            }

            let (_desc, price, item) = &items[choice - 1];
            let price = *price;

            if !self.player.spend_gold(price) {
                println!(
                    "❌ 金币不足！需要 {} 金币，当前 {} 金币。",
                    price,
                    self.player.gold()
                );
                continue;
            }

            match item {
                ShopItem::CriticalStrike => {
                    self.player.add_card(create_critical_strike_card());
                    println!("✅ 购买了「暴击」卡！");
                }
                ShopItem::HealCard => {
                    self.player.add_card(create_heal_card());
                    println!("✅ 购买了「治愈」卡！");
                }
                ShopItem::VampiricTouch => {
                    if self.player.equip_skill(create_vampiric_touch()) {
                        println!("✅ 装备了「吸血之触」技能！");
                    } else {
                        // Refund
                        self.player.add_gold(price);
                        println!("❌ 技能栏已满（最多3个），无法装备。金币已退还。");
                        continue;
                    }
                }
                ShopItem::WarCry => {
                    if self.player.equip_skill(create_war_cry()) {
                        println!("✅ 装备了「战吼」技能！");
                    } else {
                        self.player.add_gold(price);
                        println!("❌ 技能栏已满（最多3个），无法装备。金币已退还。");
                        continue;
                    }
                }
            }

            println!("🪙 剩余金币：{}\n", self.player.gold());

            // Remove purchased item and continue shopping
            items.remove(choice - 1);
            if items.is_empty() {
                println!("  商店已售罄！\n");
                break;
            }

            println!("还要继续购买吗？");
            for (i, (desc, price, _)) in items.iter().enumerate() {
                println!("  [{}] {} （💰{}金币）", i + 1, desc, price);
            }
            println!("  [0] 不购买，继续冒险\n");
        }
    }

    fn wait_for_input(&self, input_rx: &Receiver<String>) -> String {
        loop {
            if let Ok(line) = input_rx.recv_timeout(Duration::from_millis(100)) {
                return line;
            }
            // For piped input, check if channel is disconnected
            thread::sleep(Duration::from_millis(50));
        }
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
        let is_boss = self.stage > STAGES_BEFORE_BOSS;
        if is_boss {
            println!(
                "⚔️ Boss 战！ {} vs {}",
                self.player.name(),
                self.enemy.name()
            );
        } else {
            println!(
                "⚔️ 第 {} 关！ {} vs {}",
                self.stage,
                self.player.name(),
                self.enemy.name()
            );
        }
        println!(
            "⚙️ 速度：{}={}，{}={}",
            self.player.name(),
            self.player.speed(),
            self.enemy.name(),
            self.enemy.speed()
        );
        let dodge = self.enemy.dodge_chance();
        if dodge > 0.0 {
            println!(
                "🌀 敌方被动：每次受击有 {}% 概率完全闪避伤害！",
                (dodge * 100.0).round() as u32
            );
        }
        if self.enemy.shield() > 0 {
            println!("🛡️ 敌方被动：初始拥有 {} 点护盾！", self.enemy.shield());
        }
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
                CardEffect::Heal(amount) => {
                    let healed = self.player.heal(amount);
                    if healed > 0 {
                        println!("  ❤️ 恢复了 {} 点生命值！", healed);
                    } else {
                        println!("  ❤️ 生命值已满，未恢复。");
                    }
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
            SkillEffect::DamageAndHeal { damage, heal } => {
                self.log_damage(damage, "enemy");
                let healed = self.player.heal(heal);
                if healed > 0 {
                    println!("  ❤️ 同时恢复了 {} 点生命值！", healed);
                }
            }
            SkillEffect::GainShield(amount) => {
                self.player.add_shield(amount);
                println!("  🛡️ 获得了 {} 点护盾！", amount);
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
            CardEffect::Heal(amount) => {
                let healed = self.enemy.heal(amount);
                if healed > 0 {
                    println!("  ❤️ {} 恢复了 {} 点生命值！", self.enemy.name(), healed);
                }
            }
        }
        println!();
    }

    /// Applies damage to the specified target side, printing shield / damage info.
    fn log_damage(&mut self, amount: i32, target_side: &str) {
        // Dodge check: only enemy can dodge
        if target_side == "enemy" {
            let dodge = self.enemy.dodge_chance();
            if dodge > 0.0 && rand::thread_rng().gen_bool(dodge) {
                println!("  💨 {} 闪避了攻击！", self.enemy.name());
                return;
            }
        }

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

    fn print_victory(&mut self) {
        println!("╔══════════════════════════════════╗");
        println!("║          你胜利了！              ║");
        println!("╚══════════════════════════════════╝");

        let is_boss = self.stage > STAGES_BEFORE_BOSS;
        let base_reward = if is_boss {
            rand::thread_rng().gen_range(5..=8)
        } else {
            rand::thread_rng().gen_range(1..=3)
        };
        let bonus = self.player.victory_bonus_gold();
        let total = base_reward + bonus;
        self.player.add_gold(total);

        if bonus > 0 {
            let passive_name = self.player.passive().map(|p| p.name()).unwrap_or("被动");
            println!(
                "\n💰 获得了 {} 金币！（基础 {} + {} +{}）",
                total, base_reward, passive_name, bonus
            );
        } else {
            println!("\n💰 获得了 {} 金币！", total);
        }
        println!("🪙 当前金币：{}", self.player.gold());

        println!("\n最终状态：");
        println!("  {}", self.player.display_status());
        println!("  {}", self.enemy.display_status());
    }

    fn print_defeat(&self) {
        println!("╔══════════════════════════════════╗");
        println!("║          你被击败了…             ║");
        println!("╚══════════════════════════════════╝");
        println!("\n💀 在第 {} 关倒下了…", self.stage);
        println!("\n最终状态：");
        println!("  {}", self.player.display_status());
        println!("  {}", self.enemy.display_status());
    }
}

#[derive(Debug, Clone)]
enum ShopItem {
    CriticalStrike,
    HealCard,
    VampiricTouch,
    WarCry,
}

#[cfg(test)]
impl GameEngine {
    /// Test-only constructor: use a specific enemy, all cards/skills ready (cooldown 0).
    fn new_with_enemy(enemy: Box<dyn Combatant>) -> Self {
        let mut player = Player::new("勇者", 3);
        player.set_passive(PassiveSkill::Prepared);
        player.add_card(create_attack_card());
        player.add_card(create_defense_card());
        player.equip_skill(create_emergency_heal());
        player.equip_skill(create_fast_cycle());

        let mut enemy_card = create_attack_card();
        enemy_card.set_initial_cooldown_ms(0);

        Self {
            player,
            enemy,
            round: 1,
            stage: 1,
            enemy_card,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::enemy::{Dragon, ForestWolf, GoblinRogue, SkeletonMage, Slime};

    fn prepare_ready_actions(engine: &mut GameEngine) {
        for card in &mut engine.player.hand {
            card.set_initial_cooldown_ms(0);
        }
        for skill in &mut engine.player.skills {
            skill.remaining_cooldown_ms = 0;
        }
    }

    // ── Battle simulation tests ─────────────────────────────────────────────

    #[test]
    fn sim_attack_card_damages_enemy() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 3)));
        let hp_before = engine.enemy.hp();
        engine.try_execute_player_action("1", false);
        assert!(engine.enemy.hp() < hp_before, "攻击牌应减少敌方 HP");
    }

    #[test]
    fn sim_defense_card_shields_player() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 3)));
        assert_eq!(engine.player.shield(), 0);
        engine.try_execute_player_action("2", false);
        assert!(engine.player.shield() > 0, "防御牌应给予玩家护盾");
    }

    #[test]
    fn sim_enemy_action_damages_player() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 3)));
        let hp_before = engine.player.hp();
        engine.execute_enemy_action();
        assert!(engine.player.hp() < hp_before, "敌方攻击牌应减少玩家 HP");
    }

    #[test]
    fn sim_shield_fully_absorbs_enemy_hit() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 3)));
        engine.try_execute_player_action("2", false);
        let hp_before = engine.player.hp();
        engine.execute_enemy_action();
        assert_eq!(engine.player.hp(), hp_before, "护盾应完全吸收 1 点伤害");
        assert_eq!(engine.player.shield(), 0, "护盾耗尽后应归零");
    }

    #[test]
    fn sim_player_kills_slime_in_two_hits() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 2)));
        engine.player.hand[0].set_initial_cooldown_ms(0);
        engine.try_execute_player_action("1", false);
        assert!(engine.enemy.is_alive(), "第一击后史莱姆仍存活");
        engine.player.hand[0].set_initial_cooldown_ms(0);
        engine.try_execute_player_action("1", false);
        assert!(!engine.enemy.is_alive(), "第二击后史莱姆应被击败");
    }

    #[test]
    fn sim_emergency_heal_recovers_hp() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 3)));
        engine.player.take_damage(2);
        assert_eq!(engine.player.hp(), 1);
        let skill_choice = (engine.player.hand.len() + 1).to_string();
        engine.try_execute_player_action(&skill_choice, false);
        assert!(engine.player.hp() > 1, "急救技能应恢复 HP");
    }

    #[test]
    fn sim_fast_cycle_reduces_card_cooldowns() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 3)));
        for card in &mut engine.player.hand {
            card.trigger_cooldown();
        }
        assert!(!engine.player.hand[0].is_ready());
        for skill in &mut engine.player.skills {
            skill.remaining_cooldown_ms = 0;
        }
        let skill_choice = (engine.player.hand.len() + 2).to_string();
        engine.try_execute_player_action(&skill_choice, false);
        assert!(engine.player.hand[0].remaining_cooldown_ms() < 3000);
    }

    #[test]
    fn sim_goblin_rogue_dodge_is_probabilistic() {
        let mut engine = GameEngine::new_with_enemy(Box::new(GoblinRogue::new("哥布林刺客", 1000)));
        const TRIALS: usize = 200;
        let mut dodge_count = 0;

        for _ in 0..TRIALS {
            let hp_before = engine.enemy.hp();
            engine.player.hand[0].set_initial_cooldown_ms(0);
            engine.try_execute_player_action("1", false);
            if engine.enemy.hp() == hp_before {
                dodge_count += 1;
            }
        }

        let dodge_rate = dodge_count as f64 / TRIALS as f64;
        assert!(
            dodge_rate < 0.25,
            "闪避率 {:.1}% 过高（期望 ~10%）",
            dodge_rate * 100.0
        );
        assert!(
            dodge_rate > 0.02,
            "闪避率 {:.1}% 过低（期望 ~10%）",
            dodge_rate * 100.0
        );
    }

    #[test]
    fn sim_slime_never_dodges() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 1000)));
        for _ in 0..100 {
            let hp_before = engine.enemy.hp();
            engine.player.hand[0].set_initial_cooldown_ms(0);
            engine.try_execute_player_action("1", false);
            assert_eq!(engine.enemy.hp(), hp_before - 1, "史莱姆不应闪避任何攻击");
        }
    }

    #[test]
    fn card_then_skills_are_allowed_but_not_second_card() {
        let mut engine = GameEngine::new();
        prepare_ready_actions(&mut engine);

        let first_skill_choice = (engine.player.hand.len() + 1).to_string();
        let second_skill_choice = (engine.player.hand.len() + 2).to_string();

        assert_eq!(
            engine.try_execute_player_action("1", false),
            PlayerActionResult::CardUsed
        );
        assert_eq!(
            engine.try_execute_player_action("1", true),
            PlayerActionResult::None
        );
        assert_eq!(
            engine.try_execute_player_action(&first_skill_choice, true),
            PlayerActionResult::SkillUsed
        );
        assert_eq!(
            engine.try_execute_player_action(&second_skill_choice, true),
            PlayerActionResult::SkillUsed
        );
    }

    #[test]
    fn skills_then_card_is_allowed_but_not_second_card() {
        let mut engine = GameEngine::new();
        prepare_ready_actions(&mut engine);

        let first_skill_choice = (engine.player.hand.len() + 1).to_string();
        let second_skill_choice = (engine.player.hand.len() + 2).to_string();

        assert_eq!(
            engine.try_execute_player_action(&first_skill_choice, false),
            PlayerActionResult::SkillUsed
        );
        assert_eq!(
            engine.try_execute_player_action(&second_skill_choice, false),
            PlayerActionResult::SkillUsed
        );
        assert_eq!(
            engine.try_execute_player_action("1", false),
            PlayerActionResult::CardUsed
        );
        assert_eq!(
            engine.try_execute_player_action("2", true),
            PlayerActionResult::None
        );
    }

    // ── New feature tests ───────────────────────────────────────────────────

    #[test]
    fn sim_heal_card_recovers_hp() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 3)));
        engine.player.add_card(create_heal_card());
        engine.player.take_damage(2);
        assert_eq!(engine.player.hp(), 1);
        // Heal card is index 3 (attack=1, defense=2, heal=3)
        engine.try_execute_player_action("3", false);
        assert_eq!(engine.player.hp(), 2, "治愈卡应恢复 1 HP");
    }

    #[test]
    fn sim_critical_strike_deals_two_damage() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 5)));
        engine.player.add_card(create_critical_strike_card());
        let hp_before = engine.enemy.hp();
        // Critical strike is index 3
        engine.try_execute_player_action("3", false);
        assert_eq!(engine.enemy.hp(), hp_before - 2, "暴击卡应造成 2 点伤害");
    }

    #[test]
    fn sim_vampiric_touch_damages_and_heals() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 5)));
        engine.player.equip_skill(create_vampiric_touch());
        engine.player.take_damage(1); // HP: 2
        let enemy_hp_before = engine.enemy.hp();
        // Vampiric touch is skill 3 => index = cards(2) + skill(3) = 5
        let choice = (engine.player.hand.len() + 3).to_string();
        engine.try_execute_player_action(&choice, false);
        assert!(engine.enemy.hp() < enemy_hp_before, "吸血之触应造成伤害");
        assert_eq!(engine.player.hp(), 3, "吸血之触应恢复 HP");
    }

    #[test]
    fn sim_war_cry_gives_shield() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Slime::new("史莱姆", 3)));
        engine.player.equip_skill(create_war_cry());
        assert_eq!(engine.player.shield(), 0);
        let choice = (engine.player.hand.len() + 3).to_string();
        engine.try_execute_player_action(&choice, false);
        assert_eq!(engine.player.shield(), 2, "战吼应给予 2 点护盾");
    }

    #[test]
    fn sim_skeleton_mage_starts_with_shield() {
        let engine = GameEngine::new_with_enemy(Box::new(SkeletonMage::new("骷髅法师", 5)));
        assert_eq!(engine.enemy.shield(), 1, "骷髅法师应初始拥有 1 点护盾");
    }

    #[test]
    fn sim_forest_wolf_has_dodge() {
        let engine = GameEngine::new_with_enemy(Box::new(ForestWolf::new("森林狼", 3)));
        assert!(
            (engine.enemy.dodge_chance() - 0.15).abs() < f64::EPSILON,
            "森林狼应有 15% 闪避率"
        );
    }

    #[test]
    fn sim_dragon_boss_high_hp() {
        let engine = GameEngine::new_with_enemy(Box::new(Dragon::new("巨龙", 8)));
        assert_eq!(engine.enemy.hp(), 8);
        assert_eq!(engine.enemy.max_hp(), 8);
    }

    #[test]
    fn sim_boss_card_deals_two_damage() {
        let mut engine = GameEngine::new_with_enemy(Box::new(Dragon::new("巨龙", 8)));
        let mut boss_card = GameEngine::create_boss_card();
        boss_card.set_initial_cooldown_ms(0);
        engine.enemy_card = boss_card;
        let hp_before = engine.player.hp();
        engine.execute_enemy_action();
        assert_eq!(
            engine.player.hp(),
            hp_before - 2,
            "Boss 龙息应造成 2 点伤害"
        );
    }

    #[test]
    fn player_spend_gold() {
        let mut engine = GameEngine::new();
        engine.player.add_gold(10);
        assert!(engine.player.spend_gold(5));
        assert_eq!(engine.player.gold(), 5);
        assert!(!engine.player.spend_gold(10));
        assert_eq!(engine.player.gold(), 5);
    }

    #[test]
    fn player_reset_for_battle() {
        let mut engine = GameEngine::new();
        engine.player.take_damage(2);
        engine.player.add_shield(3);
        for card in &mut engine.player.hand {
            card.trigger_cooldown();
        }
        engine.player.reset_for_battle();
        assert_eq!(engine.player.hp(), engine.player.max_hp());
        assert_eq!(engine.player.shield(), 0);
        for card in &engine.player.hand {
            assert!(card.is_ready());
        }
    }
}
