export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'working';
export type RelationType = 'calls' | 'depends_on' | 'implements' | 'related_to' | 'causes' | 'prevents';
export interface MemoryEntry { id: string; content: string; type: MemoryType; tags: string[]; access_count: number; last_accessed: string; active: number; created_at: string; }
export interface RetrievalResult extends MemoryEntry { score: number; _fusion?: { fragment_count: number; total_fragments: number; contributing_fragments: number[]; fragment_coverage: number; }; }
export interface SummaryResult { goal: string; key_decisions: Array<{decision:string;rationale:string;outcome:string}>; errors: Array<{error:string;root_cause:string;fix:string}>; lessons: string[]; }