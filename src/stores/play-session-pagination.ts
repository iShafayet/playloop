import { defineStore } from "pinia";

const LOCAL_STORAGE_KEY = "--lm-play-session-pagination-size";

const initialPlaySessionPaginationSize: number = ((): number => {
  const playSessionPaginationSize = localStorage.getItem(LOCAL_STORAGE_KEY) || "10";
  try {
    return JSON.parse(playSessionPaginationSize);
  } catch (ex) {
    return 10;
  }
})();

export const usePlaySessionPaginationSizeStore = defineStore("playSessionPaginationSize", {
  state: () => ({
    playSessionPaginationSize: initialPlaySessionPaginationSize,
  }),

  getters: {},

  actions: {
    setPlaySessionPaginationSize(playSessionPaginationSize: number) {
      playSessionPaginationSize = parseInt(String(playSessionPaginationSize));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(playSessionPaginationSize));
      this.playSessionPaginationSize = playSessionPaginationSize;
    },
  },
});

