export type GameStatusHistory = {
  _id?: string;
  _rev?: string;
  $collection: string;
  gameId: string;
  platformId: string;
  status: "completed" | "in-progress" | "on-hold" | "dropped";
  timestamp: number; // epoch timestamp
  notes?: string;
};

