//! Memory System — McClelland et al. (1995) Complementary Learning Systems
//! Hippocampus: sparse coding + pattern separation → avoid catastrophic forgetting
//! Neocortex: slow integration + overlapping → extract regularities
//!
//! TDD: tests first for ALL features.

use crate::types::*;
use crate::utils;
use std::collections::HashMap;
use tracing::info;

// ── MemNode ──

#[derive(Clone, Debug)]
pub struct MemNode {
    pub id: String, pub timestamp: f64, pub content: String,
    pub importance: f32, pub valence: f32, pub arousal: f32,
    pub access_count: u32, pub last_accessed: f64,
    pub utility: f32, pub memory_type: String,
    /// Sparse pattern: indices of active "neurons"
    pub pattern: Vec<usize>,
}

// ── MemGraphs ──

pub struct MemGraphs {
    pub nodes: HashMap<String, MemNode>,
    pub temporal: HashMap<String, Vec<String>>,
    pub causal: HashMap<String, Vec<(String, f32)>>,
    pub entities: HashMap<String, Vec<String>>,
}

impl MemGraphs {
    pub fn new() -> Self {
        Self { nodes: HashMap::new(), temporal: HashMap::new(), causal: HashMap::new(), entities: HashMap::new() }
    }
}
impl MemGraphs {
    // ══════════════════════════════════════
    // ALL TESTS FIRST — see test module below
    // ══════════════════════════════════════

    pub fn insert(&mut self, mut node: MemNode, causal_parent: Option<&str>, entity_tags: &[String]) -> String {
        let id = node.id.clone();
        let timestamp = node.timestamp;

        // Compute sparse pattern from content hash
        node.pattern = Self::sparse_encode(&node.content, 20, 3);

        self.nodes.insert(id.clone(), node);

        // Temporal link
        let mut closest: Option<(String, f64)> = None;
        for (other_id, other) in &self.nodes {
            if *other_id != id && other.timestamp < timestamp {
                let diff = timestamp - other.timestamp;
                match closest { Some((_, d)) if diff < d => closest = Some((other_id.clone(), diff)), None => closest = Some((other_id.clone(), diff)), _ => {} }
            }
        }
        if let Some((prev_id, _)) = closest { self.temporal.entry(prev_id).or_default().push(id.clone()); }

        // Causal
        if let Some(parent) = causal_parent { self.causal.entry(parent.to_string()).or_default().push((id.clone(), 1.0)); }

        // Entities
        for tag in entity_tags { self.entities.entry(tag.clone()).or_default().push(id.clone()); }

        id
    }

    /// McClelland CLS: sparse encoding = pattern separation
    /// Similar inputs → different patterns (orthogonal = low overlap)
    fn sparse_encode(content: &str, pattern_size: usize, active_bits: usize) -> Vec<usize> {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        content.hash(&mut hasher);
        let seed = hasher.finish();

        let mut indices: Vec<usize> = (0..active_bits).map(|i| {
            ((seed.wrapping_add(i as u64 * 7919)) % pattern_size as u64) as usize
        }).collect();
        indices.sort();
        indices.dedup();
        indices
    }

    /// Pattern overlap (Jaccard) — low overlap = good pattern separation
    pub fn pattern_overlap(a: &[usize], b: &[usize]) -> f32 {
        let a_set: std::collections::HashSet<&usize> = a.iter().collect();
        let b_set: std::collections::HashSet<&usize> = b.iter().collect();
        let intersection = a_set.intersection(&b_set).count();
        let union = a_set.union(&b_set).count();
        if union == 0 { 1.0 } else { intersection as f32 / union as f32 }
    }

    /// Spreading activation (upgraded with pattern-based similarity)
    pub fn spreading_activation(&self, query: &str, max_results: usize, hormone: &HormoneState) -> Vec<MemNode> {
        let query_lower = query.to_lowercase();
        let query_pattern = Self::sparse_encode(query, 20, 3);
        let mut activation: HashMap<String, f32> = HashMap::new();

        // Phase 1: Seed from keyword match + pattern overlap
        for (id, node) in &self.nodes {
            let content_lower = node.content.to_lowercase();
            let keyword_score: f32 = if content_lower == query_lower { 1.0 }
                else if content_lower.contains(&query_lower) { 0.5 }
                else { 0.0 };
            let pattern_score: f32 = if node.pattern.len() >= 3 {
                Self::pattern_overlap(&query_pattern, &node.pattern) * 0.3
            } else { 0.0 };
            let total = keyword_score.max(pattern_score);
            if total > 0.0 {
                activation.insert(id.clone(), total);
            }
        }

        // Phase 2: Propagate through edges
        if !activation.is_empty() {
            let seeds: Vec<String> = activation.keys().cloned().collect();
            let decay = 0.5;
            for sid in &seeds {
                if let Some(children) = self.temporal.get(sid) {
                    for child in children {
                        let act = activation.entry(child.clone()).or_insert(0.0);
                        *act = act.max(decay);
                    }
                }
                if let Some(children) = self.causal.get(sid) {
                    for (child, _) in children {
                        let act = activation.entry(child.clone()).or_insert(0.0);
                        *act = act.max(decay * 0.8);
                    }
                }
                for (tag, ids) in &self.entities {
                    if ids.contains(sid) {
                        for nid in ids {
                            if nid != sid {
                                let act = activation.entry(nid.clone()).or_insert(0.0);
                                *act = act.max(decay * 0.6);
                            }
                        }
                    }
                }
            }
        }

        // Fallback
        if activation.is_empty() {
            for (id, node) in self.nodes.iter().take(5) {
                activation.insert(id.clone(), node.importance);
            }
        }

        let mut scored: Vec<(f32, &MemNode)> = activation.iter()
            .filter_map(|(id, &act)| self.nodes.get(id).map(|node| {
                let score = act * (0.5 + node.importance * 0.3 + node.arousal * 0.2 + hormone.adrenaline * 0.1);
                (score, node)
            })).collect();

        scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
        scored.into_iter().take(max_results).map(|(_, n)| n.clone()).collect()
    }

    pub fn should_store(importance: f32, novelty: f32, context_overlap: f32) -> bool {
        importance > 0.5 || (novelty > 0.6 && context_overlap < 0.7)
    }

    pub fn update_utility(&mut self, id: &str, success: bool) {
        if let Some(node) = self.nodes.get_mut(id) {
            let delta: f32 = if success { 0.1 } else { -0.05 };
            node.utility = (node.utility + delta).clamp(0.0, 1.0);
            node.access_count += 1;
        }
    }

    pub fn prune_low_utility(&mut self, threshold: f32) -> u32 {
        let to_remove: Vec<String> = self.nodes.iter()
            .filter(|(_, n)| n.utility < threshold && n.importance < 0.3)
            .map(|(k, _)| k.clone()).collect();
        let count = to_remove.len() as u32;
        for id in &to_remove {
            self.nodes.remove(id);
            self.temporal.remove(id);
            self.causal.remove(id);
            for ids in self.entities.values_mut() { ids.retain(|v| v != id); }
        }
        if count > 0 { info!("[Memory] Pruned {} low-utility memories", count); }
        count
    }

    pub fn count(&self) -> usize { self.nodes.len() }
}

// ── MemorySystem ──

pub struct MemorySystem {
    pub graphs: MemGraphs,
    pub hippocampal: Vec<MemNode>,
}

impl MemorySystem {
    pub fn new() -> Self { Self { graphs: MemGraphs::new(), hippocampal: Vec::with_capacity(20) } }

    pub fn hippocampal_count(&self) -> usize { self.hippocampal.len() }

    pub fn add_episodic_to_hippocampal(&mut self, content: &str, importance: f32, _tags: &[String], _entities: &[String], _causal_parent: Option<&str>, hormone: &HormoneState) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        let imp = hormone.modulate_memory_importance(importance);
        let node = MemNode {
            id: id.clone(), timestamp: utils::now(), content: content.to_string(),
            importance: imp, valence: 0.0, arousal: 0.0,
            access_count: 1, last_accessed: utils::now(),
            utility: imp * 0.5, memory_type: "episodic".into(),
            pattern: vec![],
        };
        self.hippocampal.push(node);
        if self.hippocampal.len() > 20 { self.hippocampal.remove(0); }
        id
    }

    pub fn sleep_consolidate(&mut self, importance_threshold: f32) -> u32 {
        let mut consolidated = 0u32;
        let mut keep: Vec<MemNode> = Vec::new();
        for node in self.hippocampal.drain(..) {
            if node.importance >= importance_threshold {
                self.graphs.insert(node, None, &[]);
                consolidated += 1;
            } else { keep.push(node); }
        }
        self.hippocampal = keep;
        self.graphs.prune_low_utility(0.05);
        consolidated
    }

    pub fn add_episodic(&mut self, content: &str, importance: f32, _tags: &[String], entities: &[String], causal_parent: Option<&str>, hormone: &HormoneState) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        let imp = hormone.modulate_memory_importance(importance);
        self.graphs.insert(MemNode {
            id: id.clone(), timestamp: utils::now(), content: content.to_string(),
            importance: imp, valence: 0.0, arousal: 0.0,
            access_count: 1, last_accessed: utils::now(),
            utility: imp * 0.5, memory_type: "episodic".into(),
            pattern: vec![],
        }, causal_parent, entities);
        id
    }

    pub fn set_emotion_tag(&mut self, id: &str, valence: f32, arousal: f32) {
        if let Some(node) = self.graphs.nodes.get_mut(id) {
            node.valence = valence;
            node.arousal = arousal;
        }
    }

    pub fn retrieve(&self, query: &str, max_results: usize, hormone: &HormoneState) -> Vec<MemNode> {
        self.graphs.spreading_activation(query, max_results, hormone)
    }

    pub fn record_outcome(&mut self, memory_id: &str, success: bool) { self.graphs.update_utility(memory_id, success); }
    pub fn consolidate(&mut self) -> u32 { self.graphs.prune_low_utility(0.1) }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── Existing tests ──

    #[test] fn test_insert_and_retrieve() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic("Found iron ore", 0.8, &["mining".into()], &["iron_ore".into()], None, &h);
        assert_eq!(mem.graphs.count(), 1);
    }

    #[test] fn test_spreading_activation() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic("Found iron ore", 0.8, &["mining".into()], &["iron_ore".into()], None, &h);
        mem.add_episodic("Killed zombie", 0.3, &["combat".into()], &["zombie".into()], None, &h);
        let r = mem.retrieve("iron", 5, &h);
        assert!(!r.is_empty());
        assert!(r[0].content.contains("iron"));
    }

    #[test] fn test_should_store() {
        assert!(MemGraphs::should_store(0.8, 0.0, 0.0));
        assert!(!MemGraphs::should_store(0.2, 0.1, 0.9));
    }

    #[test] fn test_utility() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic("test", 0.5, &[], &[], None, &h);
        let id = mem.graphs.nodes.keys().next().unwrap().clone();
        let u0 = mem.graphs.nodes[&id].utility;
        mem.record_outcome(&id, true);
        assert!(mem.graphs.nodes[&id].utility > u0);
    }

    #[test] fn test_pruning() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic("low value", 0.2, &[], &[], None, &h);
        let id = mem.graphs.nodes.keys().next().unwrap().clone();
        if let Some(n) = mem.graphs.nodes.get_mut(&id) { n.utility = 0.05; }
        assert!(mem.consolidate() > 0);
    }

    #[test] fn test_causal_linking() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic("Placed torch", 0.3, &[], &[], None, &h);
        let pid = mem.graphs.nodes.keys().next().unwrap().clone();
        mem.add_episodic("Mob didn't spawn", 0.6, &[], &[], Some(&pid), &h);
        assert!(mem.graphs.causal.contains_key(&pid));
    }

    #[test] fn test_entity_linking() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic("Found diamonds", 0.9, &[], &["diamond".into()], None, &h);
        assert!(mem.graphs.entities.contains_key("diamond"));
    }

    #[test] fn test_gated_storage() {
        assert!(MemGraphs::should_store(0.6, 0.0, 0.0));
        assert!(!MemGraphs::should_store(0.3, 0.0, 0.8));
    }

    #[test] fn test_spreading_activation_finds_relevant() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic("Found iron ore at (100,64,-200)", 0.8, &["mining".into(), "iron".into()], &["iron_ore".into()], None, &h);
        mem.add_episodic("Killed a zombie", 0.3, &["combat".into()], &["zombie".into()], None, &h);
        assert_eq!(mem.graphs.nodes.len(), 2);
        let results = mem.retrieve("iron", 5, &h);
        assert!(!results.is_empty());
        assert!(results[0].content.contains("iron"));
    }

    #[test] fn test_hippocampal_buffer_stores_recent() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic_to_hippocampal("Just saw creeper", 0.6, &["threat".into()], &["creeper".into()], None, &h);
        assert_eq!(mem.hippocampal_count(), 1);
        assert_eq!(mem.graphs.count(), 0);
    }

    #[test] fn test_sleep_consolidates_high_importance() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        mem.add_episodic_to_hippocampal("Found diamonds!", 0.9, &["mining".into()], &["diamond".into()], None, &h);
        mem.add_episodic_to_hippocampal("Picked flower", 0.1, &["misc".into()], &[], None, &h);
        let consolidated = mem.sleep_consolidate(0.5);
        assert!(consolidated >= 1);
        assert_eq!(mem.graphs.count(), 1);
    }

    #[test] fn test_hippocampal_max_size_evicts_oldest() {
        let mut mem = MemorySystem::new();
        let h = HormoneState::default();
        for i in 0..25 {
            mem.add_episodic_to_hippocampal(&format!("Event {}", i), 0.1, &[], &[], None, &h);
        }
        assert!(mem.hippocampal_count() <= 20);
    }

    // ── NEW: Pattern Separation (McClelland 1995) ──

    #[test]
    fn test_sparse_encoding_produces_pattern() {
        let pattern = MemGraphs::sparse_encode("found iron at x=100", 20, 3);
        assert!(!pattern.is_empty(), "Should produce pattern indices");
        assert!(pattern.iter().all(|&i| i < 20), "All indices should be within pattern size");
    }

    #[test]
    fn test_similar_inputs_have_low_pattern_overlap() {
        // CLS requirement: similar inputs → orthogonal patterns
        let p1 = MemGraphs::sparse_encode("found iron at x=100", 100, 5);
        let p2 = MemGraphs::sparse_encode("found iron at x=101", 100, 5);
        let overlap = MemGraphs::pattern_overlap(&p1, &p2);
        assert!(overlap < 0.8, "Pattern separation: similar inputs should have limited overlap");
    }

    #[test]
    fn test_different_inputs_have_minimal_overlap() {
        let p1 = MemGraphs::sparse_encode("found diamonds", 100, 5);
        let p2 = MemGraphs::sparse_encode("killed zombie", 100, 5);
        let overlap = MemGraphs::pattern_overlap(&p1, &p2);
        assert!(overlap < 0.6, "Different inputs should have low pattern overlap");
    }
}
