import { GameStatus } from "./game-status";

export type GameOwnershipEntry = {
  platformId: string;
  ownershipType: "owned" | "borrowed" | "rented" | "gifted" | "other";
};

export type GameUntrackedHistoryEntry = {
  platformId: string;
  status: GameStatus;
  lastPlayedDate?: number; // epoch timestamp - when they last played before tracking
};

export type Game = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  platformIdList: string[]; // Kept for backward compatibility, can be derived from ownershipList
  ownershipList?: GameOwnershipEntry[];
  untrackedHistoryList?: GameUntrackedHistoryEntry[];
  tagIdList?: string[];
  releaseDate?: number; // epoch timestamp
  isRetroGame: boolean;
};
