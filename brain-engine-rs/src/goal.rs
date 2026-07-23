//! Hierarchical Goal System — Botvinick et al. (2009) Hierarchical RL
//! Miller & Cohen (2001): PFC maintains goal representations
//! Goal gradient effect: proximity increases motivation

use crate::types::{Goal, GoalState, GoalStatus};
use crate::utils;

pub struct GoalSystem;

impl GoalSystem {
    pub fn new() -> Self { Self }

    pub fn add(state: &mut GoalState, description: &str, priority: u32, parent_id: Option<String>) {
        state.active.push(Goal { id: uuid::Uuid::new_v4().to_string(), description: description.to_string(), status: GoalStatus::Pending, priority, created: utils::now(), completed_at: None, parent_id });
    }

    pub fn activate(state: &mut GoalState, goal_id: &str) {
        if let Some(g) = state.active.iter_mut().find(|g| g.id == goal_id) {
            g.status = GoalStatus::Active;
        }
    }

    /// Complete a goal, return its parent_id for hierarchical propagation
    pub fn complete(state: &mut GoalState, goal_id: &str) -> Option<String> {
        if let Some(pos) = state.active.iter().position(|g| g.id == goal_id) {
            let g = state.active.remove(pos);
            state.completed += 1;
            let parent = g.parent_id.clone();
            state.history.push(g);
            parent
        } else { None }
    }

    /// Highest priority active goal
    pub fn highest_priority(state: &GoalState) -> Option<&Goal> {
        state.active.iter().filter(|g| g.status == GoalStatus::Active).max_by_key(|g| g.priority)
    }

    /// Goal gradient: motivation increases as goal gets closer to completion
    pub fn goal_gradient(state: &GoalState, goal_id: &str) -> f32 {
        if state.active.iter().any(|g| g.id == goal_id) {
            let total_subgoals = state.active.iter().filter(|sg| sg.parent_id.as_deref() == Some(goal_id)).count() as f32;
            let completed = state.history.iter().filter(|h| h.parent_id.as_deref() == Some(goal_id)).count() as f32;
            if total_subgoals > 0.0 {
                0.5 + (completed / total_subgoals) * 0.5 // 0.5 to 1.0 as progress increases
            } else {
                1.0 // no subgoals = always at full motivation
            }
        } else { 0.0 }
    }

    /// Hierarchical reward: subgoal completion → parent reward
    pub fn hierarchical_reward(state: &GoalState, goal_id: &str) -> f32 {
        let gradient = Self::goal_gradient(state, goal_id);
        gradient * 0.3 // subgoal progress boosts parent by up to 0.3
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state() -> GoalState { GoalState { active: vec![], completed: 0, history: vec![] } }

    #[test] fn test_add_and_complete() {
        let mut s = test_state();
        GoalSystem::add(&mut s, "Test", 1, None);
        let id = s.active[0].id.clone();
        GoalSystem::activate(&mut s, &id);
        GoalSystem::complete(&mut s, &id);
        assert!(s.active.is_empty());
        assert_eq!(s.completed, 1);
    }

    #[test] fn test_priority_ordering() {
        let mut s = test_state();
        GoalSystem::add(&mut s, "Low", 1, None);
        GoalSystem::add(&mut s, "High", 10, None);
        let ids: Vec<String> = s.active.iter().map(|g| g.id.clone()).collect();
        GoalSystem::activate(&mut s, &ids[0]);
        GoalSystem::activate(&mut s, &ids[1]);
        let top = GoalSystem::highest_priority(&s);
        assert_eq!(top.unwrap().priority, 10);
    }

    #[test] fn test_hierarchical() {
        let mut s = test_state();
        GoalSystem::add(&mut s, "Parent", 5, None);
        let pid = s.active[0].id.clone();
        GoalSystem::add(&mut s, "Sub", 3, Some(pid.clone()));
        GoalSystem::activate(&mut s, &pid);
        let ids: Vec<String> = s.active.iter().map(|g| g.id.clone()).collect();
        GoalSystem::activate(&mut s, &ids[1]);
        let parent = GoalSystem::complete(&mut s, &ids[1]);
        assert_eq!(parent, Some(pid));
    }

    #[test] fn test_goal_gradient_increases_with_progress() {
        let mut s = test_state();
        GoalSystem::add(&mut s, "Parent", 5, None);
        let pid = s.active[0].id.clone();
        GoalSystem::add(&mut s, "Sub1", 3, Some(pid.clone()));
        GoalSystem::add(&mut s, "Sub2", 3, Some(pid.clone()));
        GoalSystem::activate(&mut s, &pid);
        let ids: Vec<String> = s.active.iter().map(|g| g.id.clone()).collect();
        GoalSystem::activate(&mut s, &ids[1]);
        let gradient_before = GoalSystem::goal_gradient(&s, &pid);
        GoalSystem::complete(&mut s, &ids[1]);
        let gradient_after = GoalSystem::goal_gradient(&s, &pid);
        assert!(gradient_after > gradient_before, "Gradient should increase after subgoal completion");
    }
}
