export type PlaySession = {
  _id?: string;
  _rev?: string;
  $collection: string;
  notes: string;
  tagIdList: string[];
  transactionEpoch: number;
  gamingSession: {
    // essential
    gameId: string;
    platformId: string;
    startTime: number; // epoch timestamp
    endTime: number; // epoch timestamp
    // cache
    _gameName?: string;
    _platformName?: string;
  };
  modifiedByUsername?: string;
  modifiedEpoch?: number;
};

