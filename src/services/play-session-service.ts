import { Collection } from "src/constants/constants";
import { InferredPlaySession } from "src/models/inferred/inferred-play-session";
import { PlaySessionFilters } from "src/models/inferred/play-session-filters";
import { PlaySession } from "src/models/play-session";
import { Tag } from "src/models/tag";
import { Game } from "src/models/game";
import { Platform } from "src/models/platform";
import { normalizeEpochRange } from "src/utils/date-utils";
import { deepClone, sleep } from "src/utils/misc-utils";
import { tagService } from "./tag-service";
import { gameService } from "./game-service";
import { platformService } from "./platform-service";
import { pouchdbService } from "./pouchdb-service";

class PlaySessionService {
  async inferPlaySession(playSession: PlaySession): Promise<InferredPlaySession> {
    const inferredPlaySession = deepClone(playSession) as InferredPlaySession;

    await this.inferGamingSession(inferredPlaySession);

    inferredPlaySession.tagList = await tagService.getTagList(inferredPlaySession.tagIdList);

    return inferredPlaySession;
  }

  private async inferGamingSession(inferredPlaySession: InferredPlaySession) {
    if (!inferredPlaySession.gamingSession) return false;

    if (inferredPlaySession.gamingSession.gameId) {
      const game = await gameService.getGame(inferredPlaySession.gamingSession.gameId);
      if (game) {
        inferredPlaySession.gamingSession.game = game;
      }
    }

    if (inferredPlaySession.gamingSession.platformId) {
      const platform = await platformService.getPlatform(inferredPlaySession.gamingSession.platformId);
      if (platform) {
        inferredPlaySession.gamingSession.platform = platform;
      }
    }

    return true;
  }

  public async buildEntityMap() {
    const tagList = (await pouchdbService.listByCollection(Collection.TAG)).docs as Tag[];
    const gameList = (await pouchdbService.listByCollection(Collection.GAME)).docs as Game[];
    const platformList = (await pouchdbService.listByCollection(Collection.PLATFORM)).docs as Platform[];

    const map = new Map<string, Tag | Game | Platform>();
    tagList.forEach((tag) => map.set(tag.$collection + "-" + tag._id!, tag));
    gameList.forEach((game) => map.set(game.$collection + "-" + game._id!, game));
    platformList.forEach((platform) => map.set(platform.$collection + "-" + platform._id!, platform));

    return map;
  }

  public async inferInBatch(
    playSessionList: PlaySession[],
    entityMap?: Map<string, Tag | Game | Platform>
  ): Promise<InferredPlaySession[]> {
    const inferredPlaySessionList = deepClone(playSessionList) as InferredPlaySession[];

    const map = entityMap || (await this.buildEntityMap());

    for (const [index, inferredPlaySession] of inferredPlaySessionList.entries()) {
      if (inferredPlaySession.gamingSession) {
        if (inferredPlaySession.gamingSession.gameId) {
          const game = map.get(Collection.GAME + "-" + inferredPlaySession.gamingSession.gameId) as Game | undefined;
          if (game) {
            inferredPlaySession.gamingSession.game = game;
          }
        }
        if (inferredPlaySession.gamingSession.platformId) {
          const platform = map.get(Collection.PLATFORM + "-" + inferredPlaySession.gamingSession.platformId) as Platform | undefined;
          if (platform) {
            inferredPlaySession.gamingSession.platform = platform;
          }
        }
      }

      inferredPlaySession.tagList = inferredPlaySession.tagIdList.map((tagId) => map.get(Collection.TAG + "-" + tagId) as Tag).filter(Boolean);
      if (index % 100 === 0) {
        await sleep(0);
      }
    }

    return inferredPlaySessionList;
  }

  async applyPlaySessionFilters(playSessionList: PlaySession[], playSessionFilters: PlaySessionFilters | null): Promise<PlaySession[]> {
    if (!playSessionFilters) {
      return playSessionList;
    }

    const {
      tagIdWhiteList,
      tagIdBlackList,
      searchString,
      deepSearchString,
    } = playSessionFilters;

    const [startEpoch, endEpoch] = normalizeEpochRange(playSessionFilters.startEpoch, playSessionFilters.endEpoch);

    if (tagIdWhiteList.length) {
      playSessionList = playSessionList.filter((playSession) => {
        return playSession.tagIdList.some((tagId) => tagIdWhiteList.includes(tagId));
      });
    }

    if (tagIdBlackList.length > 0) {
      playSessionList = playSessionList.filter((playSession) => {
        return !playSession.tagIdList.some((tagId) => tagIdBlackList.includes(tagId));
      });
    }

    if (searchString && searchString.length > 0) {
      playSessionList = playSessionList.filter((playSession) => playSession.notes && String(playSession.notes).toLocaleLowerCase().indexOf(searchString.toLocaleLowerCase()) > -1);
    }

    if (deepSearchString && deepSearchString.length > 0) {
      playSessionList = playSessionList.filter((playSession) => JSON.stringify(playSession).toLocaleLowerCase().indexOf(deepSearchString.toLocaleLowerCase()) > -1);
    }

    playSessionList = playSessionList.filter((playSession) => playSession.transactionEpoch >= startEpoch && playSession.transactionEpoch <= endEpoch);

    return playSessionList;
  }
}

export const playSessionService = new PlaySessionService();

