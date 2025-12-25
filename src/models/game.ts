export type GameOwnershipEntry = {
  platformId: string;
  ownershipType: "owned" | "borrowed" | "rented" | "gifted" | "other";
};

export type Game = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  platformIdList: string[]; // Kept for backward compatibility, can be derived from ownershipList
  ownershipList?: GameOwnershipEntry[];
  releaseDate?: number; // epoch timestamp
  isRetroGame: boolean;
};

