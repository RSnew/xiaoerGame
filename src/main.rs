mod card;
mod character;
mod enemy;
mod game;
mod mechanics;
mod skill;

use game::engine::GameEngine;

fn main() {
    let mut engine = GameEngine::new();
    engine.run();
}
