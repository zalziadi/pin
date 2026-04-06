export interface Pin {
  id: string;
  text: string;
  created_at: string;
  thread_id?: string | null;
  session_id?: string | null;
  is_highlighted?: boolean;
}

export interface Thread {
  id: string;
  label: string;
  pin_ids: string[];
  is_primary: boolean;
  insight?: string;
  question?: string;
  action?: string;
  action_type?: ActionType;
  created_at: string;
}

export type ActionType = "task" | "goal" | "reflection";

export interface RevealResult {
  thread: string;
  insight: string;
  question: string;
  action: string;
  action_type: ActionType;
  connected_pin_ids: string[];
  depth_score?: number;
  // Memory context used for this reveal
  memory_context?: {
    similar_pins: number;
    past_insights: number;
    profile_injected: boolean;
  };
}

export interface UserProfile {
  id: string;
  recurring_themes: string[];
  emotional_patterns: string[];
  active_goals: string[];
  total_pins: number;
  total_reveals: number;
  depth_level: number;
  cognitive_signature: string | null;
  last_active: string;
}

export interface PinAction {
  id: string;
  text: string;
  action_type: ActionType;
  status: "pending" | "done" | "skipped";
  insight_id?: string;
  thread_id?: string;
  created_at: string;
  completed_at?: string;
}
