export type PlaySessionFilters = {
  startEpoch: number;
  endEpoch: number;
  tagIdWhiteList: string[];
  tagIdBlackList: string[];
  searchString: string;
  deepSearchString: string;
  sortBy: "transactionEpochDesc" | "lastModifiedEpochDesc";
  highlightDuplicates?: boolean;
};

