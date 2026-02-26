mod card;
mod character;
mod enemy;
mod game;
mod mechanics;

use game::engine::GameEngine;

fn main() {
    let mut engine = GameEngine::new();
    engine.run();
}
