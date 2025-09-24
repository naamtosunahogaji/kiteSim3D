export interface Vector2D {
  x: number;
  y: number;
}

export type AIPersonality = 'peaceful' | 'aggressive' | 'clever';
export type SpawnState = 'spawning' | 'active';

export interface PlayerKiteInfo {
    id: number;
    pos: Vector2D;
    vel: Vector2D;
    isKicking: boolean;
    isCut: boolean;
}

export interface Kite {
  id: number;
  pos: Vector2D;
  vel: Vector2D;
  lift: Vector2D;
  drag: number;
  color: string;
  isCut: boolean;
  tail: Vector2D[];
  // AI-specific properties
  aiState: 'roaming' | 'attacking' | 'fleeing';
  targetId: number | null;
  roamTarget: Vector2D | null;
  isKicking: boolean;
  kickCooldown: number;
  // New properties for dynamic spawning
  aiPersonality: AIPersonality;
  spawnState: SpawnState;
  spawnTimer: number; // in frames
}