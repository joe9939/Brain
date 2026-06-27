export interface DependencyNode { file: string; dependencies: string[]; dependents: string[]; symbols?: SymbolInfo[]; }
export interface PredictionResult { directly_affected: string[]; indirectly_affected: string[]; tests_to_run: string[]; risk_score: number; recommendation: string; }
export interface SymbolInfo { name: string; kind: "function" | "class" | "interface" | "type" | "variable" | "struct" | "enum" | "trait" | "impl"; lang: string; line: number; }

export interface PredictedFile {
  path: string;
  change_probability: number;
  type: "high" | "medium" | "low";
}

export interface PredictionResultV2 {
  predicted_files: PredictedFile[];
  risk_level: "low" | "medium" | "high";
  confidence: number;
  estimated_effort: string;
}

export interface DiffResult {
  accuracy: number;
  precision: number;
  recall: number;
  missed: string[];
  false_positives: string[];
  correct: string[];
  trend: "improving" | "stable" | "declining";
}
