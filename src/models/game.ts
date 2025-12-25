export type Game = {
  _id?: string;
  _rev?: string;
  $collection: string;
  name: string;
  platformIdList: string[];
  releaseDate?: number; // epoch timestamp
  isRetroGame: boolean;
};

