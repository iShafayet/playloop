export type GameOwnership = {
  _id?: string;
  _rev?: string;
  $collection: string;
  gameId: string;
  platformId: string;
  ownershipType: "owned" | "borrowed" | "rented" | "gifted" | "other";
  timestamp: number; // epoch timestamp
  notes?: string;
};

