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
  untrackedPlaytime?: number; // Total playtime in milliseconds before tracking started
  howLongToBeat?: number; // How long to beat in hours
  tagIdList?: string[];
  rating?: number | null; // 0-10, step 0.5, null = not rated
  releaseDate?: number; // epoch timestamp
  isRetroGame: boolean;
};
