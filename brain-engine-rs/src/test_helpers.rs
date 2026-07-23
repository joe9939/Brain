//! Shared test utilities

#![cfg(test)]

use crate::types::*;

pub fn basic_snapshot() -> WorldSnapshot {
    WorldSnapshot {
        position: Position { x: 0.0, y: 64.0, z: 0.0 },
        velocity: (0.0f64, 0.0f64, 0.0f64),
        health: 20.0, hunger: 20.0, oxygen: 20.0,
        on_fire: false, in_lava: false, falling: false,
        blocks: vec![], entities: vec![], inventory: vec![],
        time_of_day: 0.0, dimension: "overworld".into(),
        threat_trend: None, biome: None, light_level: None,
        players: vec![], effects: vec![],
    }
}

pub fn basic_state() -> MentalState {
    MentalState::default()
}
