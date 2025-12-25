import { defineStore } from "pinia";
import { PlaySessionFilters } from "src/models/inferred/play-session-filters";

const LOCAL_STORAGE_KEY = "--lm-play-session-filters";

const initialPlaySessionFilters: PlaySessionFilters | null = ((): PlaySessionFilters | null => {
  const playSessionFilters = localStorage.getItem(LOCAL_STORAGE_KEY) || "null";
  try {
    return JSON.parse(playSessionFilters);
  } catch (ex) {
    return null;
  }
})();

export const usePlaySessionFiltersStore = defineStore("playSessionFilters", {
  state: () => ({
    playSessionFilters: initialPlaySessionFilters,
  }),

  getters: {
    currentPlaySessionFilters(state): PlaySessionFilters | null {
      return state.playSessionFilters;
    },
  },

  actions: {
    setPlaySessionFilters(playSessionFilters: PlaySessionFilters | null) {
      this.playSessionFilters = playSessionFilters;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(playSessionFilters));
    },
  },
});

