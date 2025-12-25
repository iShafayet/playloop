import { PlaySession } from "src/models/play-session";
import { Tag } from "../tag";
import { Game } from "../game";
import { Platform } from "../platform";

export type InferredPlaySession = PlaySession & {
  gamingSession: {
    game: Game;
    platform: Platform;
  };

  tagList: Tag[];
};

