import { GameStatus } from "./game-status";

export type GameStatusHistory = {
  _id?: string;
  _rev?: string;
  $collection: string;
  gameId: string;
  platformId: string;
  status: GameStatus;
  timestamp: number; // epoch timestamp
  notes?: string;
};
