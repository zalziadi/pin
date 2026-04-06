export interface Pin {
  id: string;
  text: string;
  created_at: string;
  thread_id?: string | null;
  is_highlighted?: boolean;
}

export interface Thread {
  id: string;
  label: string;
  pin_ids: string[];
  is_primary: boolean;
  created_at: string;
}

export interface RevealResult {
  thread: string;
  insight: string;
  question: string;
  connected_pin_ids: string[];
}
