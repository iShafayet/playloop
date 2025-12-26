import { Collection } from "src/constants/constants";
import { Game } from "src/models/game";
import { GameStatus } from "src/models/game-status";
import { GameStatusHistory } from "src/models/game-status-history";
// GameOwnership is no longer a separate entity - ownership is now stored in Game.ownershipList
import { PlaySession } from "src/models/play-session";
import { pouchdbService } from "./pouchdb-service";

class GameService {
  async listGames(): Promise<Game[]> {
    const res = await pouchdbService.listByCollection(Collection.GAME);
    return res.docs as Game[];
  }

  async getGame(gameId: string): Promise<Game | null> {
    try {
      const doc = (await pouchdbService.getDocById(gameId)) as Game;
      return doc;
    } catch (error) {
      return null;
    }
  }

  async saveGame(game: Game): Promise<Game> {
    if (!game.$collection) {
      game.$collection = Collection.GAME;
    }
    const saved = await pouchdbService.upsertDoc(game);
    return saved as Game;
  }

  async deleteGame(game: Game): Promise<void> {
    await pouchdbService.removeDoc(game);
  }

  async getGameStatusHistory(gameId: string, platformId?: string): Promise<GameStatusHistory[]> {
    const res = await pouchdbService.listByCollection(Collection.GAME_STATUS_HISTORY);
    let history = res.docs as GameStatusHistory[];
    history = history.filter((h) => h.gameId === gameId);
    if (platformId) {
      history = history.filter((h) => h.platformId === platformId);
    }
    // Sort by timestamp descending (most recent first)
    history.sort((a, b) => b.timestamp - a.timestamp);
    return history;
  }

  async getCurrentGameStatus(gameId: string, platformId: string): Promise<GameStatusHistory | null> {
    const history = await this.getGameStatusHistory(gameId, platformId);
    return history.length > 0 ? history[0] : null;
  }

  async setGameStatus(gameId: string, platformId: string, status: GameStatus, notes?: string): Promise<GameStatusHistory> {
    const statusHistory: GameStatusHistory = {
      $collection: Collection.GAME_STATUS_HISTORY,
      gameId,
      platformId,
      status,
      timestamp: Date.now(),
      notes,
    };
    const saved = await pouchdbService.upsertDoc(statusHistory);
    return saved as GameStatusHistory;
  }

  // Ownership is now stored directly in Game.ownershipList, so these methods are no longer needed

  async getGameSessions(gameId: string, platformId?: string): Promise<PlaySession[]> {
    const res = await pouchdbService.listByCollection(Collection.PLAY_SESSION);
    let playSessions = res.docs as PlaySession[];
    playSessions = playSessions.filter((r) => r.gamingSession?.gameId === gameId);
    if (platformId && playSessions.length > 0) {
      playSessions = playSessions.filter((r) => r.gamingSession?.platformId === platformId);
    }
    // Sort by transactionEpoch descending (most recent first)
    playSessions.sort((a, b) => (b.transactionEpoch || 0) - (a.transactionEpoch || 0));
    return playSessions;
  }

  async getTotalPlaytime(gameId: string, platformId?: string): Promise<number> {
    const sessions = await this.getGameSessions(gameId, platformId);
    let totalMs = 0;
    sessions.forEach((session) => {
      if (session.gamingSession?.startTime && session.gamingSession?.endTime) {
        totalMs += session.gamingSession.endTime - session.gamingSession.startTime;
      }
    });

    // Include untracked playtime from the game model (if not filtering by platform)
    // This represents playtime before tracking started or from CSV import
    if (!platformId) {
      const game = await this.getGame(gameId);
      if (game?.untrackedPlaytime) {
        totalMs += game.untrackedPlaytime;
      }
    }

    return totalMs; // Returns milliseconds
  }

  async getFirstPlayedDate(gameId: string): Promise<number | null> {
    const sessions = await this.getGameSessions(gameId);
    if (sessions.length === 0) return null;
    const dates = sessions.map((s) => s.gamingSession?.startTime || s.transactionEpoch).filter((d) => d) as number[];
    if (dates.length === 0) return null;
    return Math.min(...dates);
  }

  async getLastPlayedDate(gameId: string): Promise<number | null> {
    const sessions = await this.getGameSessions(gameId);
    if (sessions.length === 0) return null;
    const dates = sessions.map((s) => s.gamingSession?.endTime || s.transactionEpoch).filter((d) => d) as number[];
    if (dates.length === 0) return null;
    return Math.max(...dates);
  }

  async getAverageSessionDuration(gameId: string): Promise<number> {
    const sessions = await this.getGameSessions(gameId);
    if (sessions.length === 0) return 0;
    let totalMs = 0;
    let validSessions = 0;
    sessions.forEach((session) => {
      if (session.gamingSession?.startTime && session.gamingSession?.endTime) {
        totalMs += session.gamingSession.endTime - session.gamingSession.startTime;
        validSessions++;
      }
    });
    return validSessions > 0 ? totalMs / validSessions : 0; // Returns average milliseconds
  }

  async getPlatformBreakdown(gameId: string): Promise<Map<string, { playtime: number; sessionCount: number }>> {
    const sessions = await this.getGameSessions(gameId);
    const breakdown = new Map<string, { playtime: number; sessionCount: number }>();

    sessions.forEach((session) => {
      const platformId = session.gamingSession?.platformId;
      if (!platformId) return;

      if (!breakdown.has(platformId)) {
        breakdown.set(platformId, { playtime: 0, sessionCount: 0 });
      }

      const stats = breakdown.get(platformId)!;
      stats.sessionCount++;

      if (session.gamingSession?.startTime && session.gamingSession?.endTime) {
        stats.playtime += session.gamingSession.endTime - session.gamingSession.startTime;
      }
    });

    return breakdown;
  }
}

export const gameService = new GameService();

