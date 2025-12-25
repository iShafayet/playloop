export const rowsPerPageOptions = [10, 20, 50, 100];

export const sortByTypeList = [
  { value: "transactionEpochDesc", label: "Transaction Time (Latest on Top)" },
  { value: "lastModifiedEpochDesc", label: "Modification Time (Latest on Top)" },
];

export const defaultViewOptionList = [
  { value: "games", label: "Games" },
  { value: "sessions", label: "Sessions" },
  { value: "platforms", label: "Platforms" },
];

export const Collection = {
  TAG: "tag",
  RECORD: "record",
  MEMO: "memo",
  // Gaming collections
  GAME: "game",
  PLATFORM: "platform",
  GAME_STATUS_HISTORY: "game-status-history",
  GAME_OWNERSHIP: "game-ownership",
};

export const RecordType = {
  // Gaming record types
  GAMING_SESSION: "gaming-session",
};

export const defaultTagColor = "#444444";

export const dateRangePresetList = [
  { value: "current-year", label: "Current Year" },
  { value: "previous-year", label: "Previous Year" },
  { value: "current-month", label: "Current Month" },
  { value: "previous-month", label: "Previous Month" },
  { value: "current-and-previous-month", label: "Current and Previous Month" },
  { value: "all-time", label: "All time" },
  { value: "custom", label: "Custom" },
];

