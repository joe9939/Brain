export interface FileInfo { path: string; symbols: string[]; imports: string[]; exports: string[]; risk_score: number; change_count_24h: number; }
export interface DependencyNode { file: string; dependencies: string[]; dependents: string[]; }
export interface PredictionResult { directly_affected: string[]; indirectly_affected: string[]; tests_to_run: string[]; risk_score: number; recommendation: string; }
export interface DiffResult { added_symbols: string[]; removed_symbols: string[]; changed_symbols: string[]; impacted_callers: string[]; breaking_changes: string[]; }