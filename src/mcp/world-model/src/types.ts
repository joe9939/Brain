export interface DependencyNode { file: string; dependencies: string[]; dependents: string[]; symbols?: SymbolInfo[]; }
export interface PredictionResult { directly_affected: string[]; indirectly_affected: string[]; tests_to_run: string[]; risk_score: number; recommendation: string; }
export interface SymbolInfo { name: string; kind: "function" | "class" | "interface" | "type" | "variable" | "struct" | "enum" | "trait" | "impl"; lang: string; line: number; }
