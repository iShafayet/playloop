<template>
  <q-page class="row items-center justify-center">
    <q-card class="std-card">
      <div class="q-pa-md">
        <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator"></loading-indicator>

        <!-- Aggregate Statistics -->
        <div v-if="!isLoading" class="q-mb-xl">
          <div class="text-h5 q-mb-lg text-weight-medium">Overall Statistics</div>
          <div class="row stat-cards-row">
            <div class="stat-card-col col-12 col-sm-6 col-md-3">
              <q-card class="stat-card stat-card-primary" flat>
                <q-card-section class="stat-card-content">
                  <div class="stat-icon-wrapper">
                    <q-icon name="sports_esports" size="32px" class="stat-icon" />
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Total Games</div>
                    <div class="stat-value">{{ totalGames }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="stat-card-col col-12 col-sm-6 col-md-3">
              <q-card class="stat-card stat-card-accent" flat>
                <q-card-section class="stat-card-content">
                  <div class="stat-icon-wrapper">
                    <q-icon name="schedule" size="32px" class="stat-icon" />
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Total Playtime</div>
                    <div class="stat-value">{{ formatPlaytime(totalPlaytime) }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="stat-card-col col-12 col-sm-6 col-md-3">
              <q-card class="stat-card stat-card-info" flat>
                <q-card-section class="stat-card-content">
                  <div class="stat-icon-wrapper">
                    <q-icon name="play_circle" size="32px" class="stat-icon" />
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Total Sessions</div>
                    <div class="stat-value">{{ totalSessions }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="stat-card-col col-12 col-sm-6 col-md-3">
              <q-card class="stat-card stat-card-secondary" flat>
                <q-card-section class="stat-card-content">
                  <div class="stat-icon-wrapper">
                    <q-icon name="devices" size="32px" class="stat-icon" />
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Platforms</div>
                    <div class="stat-value">{{ totalPlatforms }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <!-- Completion Stats -->
        <div v-if="!isLoading" class="q-mb-xl">
          <div class="text-h5 q-mb-lg text-weight-medium">Completion Status</div>
          <div class="row stat-cards-row">
            <div class="stat-card-col col-12 col-sm-6 col-md-3">
              <q-card class="stat-card stat-card-success" flat>
                <q-card-section class="stat-card-content">
                  <div class="stat-icon-wrapper">
                    <q-icon name="check_circle" size="32px" class="stat-icon" />
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Completed</div>
                    <div class="stat-value text-green">{{ completedGames }}</div>
                    <div v-if="totalGames > 0" class="stat-progress">
                      <q-linear-progress 
                        :value="completedGames / totalGames" 
                        color="green" 
                        size="6px" 
                        rounded
                        class="q-mt-sm"
                      />
                      <div class="stat-progress-text">{{ Math.round((completedGames / totalGames) * 100) }}%</div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="stat-card-col col-12 col-sm-6 col-md-3">
              <q-card class="stat-card stat-card-info" flat>
                <q-card-section class="stat-card-content">
                  <div class="stat-icon-wrapper">
                    <q-icon name="play_arrow" size="32px" class="stat-icon" />
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">In Progress</div>
                    <div class="stat-value text-blue">{{ inProgressGames }}</div>
                    <div v-if="totalGames > 0" class="stat-progress">
                      <q-linear-progress 
                        :value="inProgressGames / totalGames" 
                        color="blue" 
                        size="6px" 
                        rounded
                        class="q-mt-sm"
                      />
                      <div class="stat-progress-text">{{ Math.round((inProgressGames / totalGames) * 100) }}%</div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="stat-card-col col-12 col-sm-6 col-md-3">
              <q-card class="stat-card stat-card-warning" flat>
                <q-card-section class="stat-card-content">
                  <div class="stat-icon-wrapper">
                    <q-icon name="pause_circle" size="32px" class="stat-icon" />
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">On Hold</div>
                    <div class="stat-value text-orange">{{ onHoldGames }}</div>
                    <div v-if="totalGames > 0" class="stat-progress">
                      <q-linear-progress 
                        :value="onHoldGames / totalGames" 
                        color="orange" 
                        size="6px" 
                        rounded
                        class="q-mt-sm"
                      />
                      <div class="stat-progress-text">{{ Math.round((onHoldGames / totalGames) * 100) }}%</div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="stat-card-col col-12 col-sm-6 col-md-3">
              <q-card class="stat-card stat-card-danger" flat>
                <q-card-section class="stat-card-content">
                  <div class="stat-icon-wrapper">
                    <q-icon name="cancel" size="32px" class="stat-icon" />
                  </div>
                  <div class="stat-item">
                    <div class="stat-label">Dropped</div>
                    <div class="stat-value text-red">{{ droppedGames }}</div>
                    <div v-if="totalGames > 0" class="stat-progress">
                      <q-linear-progress 
                        :value="droppedGames / totalGames" 
                        color="red" 
                        size="6px" 
                        rounded
                        class="q-mt-sm"
                      />
                      <div class="stat-progress-text">{{ Math.round((droppedGames / totalGames) * 100) }}%</div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div v-if="!isLoading" class="q-mb-xl">
          <div class="text-h5 q-mb-lg text-weight-medium">Quick Stats</div>
          <div class="row stat-cards-row">
            <div class="stat-card-col col-12 col-sm-6 col-md-4">
              <q-card class="quick-stat-card" flat>
                <q-card-section>
                  <div class="row items-center q-gutter-sm q-mb-sm">
                    <q-icon name="emoji_events" size="28px" color="primary" />
                    <div class="text-subtitle1 text-weight-medium">Most Played Game</div>
                  </div>
                  <div class="text-h6 text-weight-bold q-mb-xs">
                    {{ mostPlayedGame ? mostPlayedGame.name : "N/A" }}
                  </div>
                  <div v-if="mostPlayedGame" class="text-body2 text-grey-7">
                    <q-icon name="schedule" size="16px" class="q-mr-xs" />
                    {{ formatPlaytime(mostPlayedGame.playtime) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="stat-card-col col-12 col-sm-6 col-md-4">
              <q-card class="quick-stat-card" flat>
                <q-card-section>
                  <div class="row items-center q-gutter-sm q-mb-sm">
                    <q-icon name="favorite" size="28px" color="red" />
                    <div class="text-subtitle1 text-weight-medium">Favorite Platform</div>
                  </div>
                  <div class="text-h6 text-weight-bold q-mb-xs">
                    {{ favoritePlatform ? favoritePlatform.name : "N/A" }}
                  </div>
                  <div v-if="favoritePlatform" class="text-body2 text-grey-7">
                    <q-icon name="play_circle" size="16px" class="q-mr-xs" />
                    {{ favoritePlatform.sessionCount }} {{ favoritePlatform.byGames ? "games" : "sessions" }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="stat-card-col col-12 col-sm-6 col-md-4">
              <q-card class="quick-stat-card" flat>
                <q-card-section>
                  <div class="row items-center q-gutter-sm q-mb-sm">
                    <q-icon name="history" size="28px" color="orange" />
                    <div class="text-subtitle1 text-weight-medium">Retro Games</div>
                  </div>
                  <div class="text-h4 text-weight-bold q-mb-xs">{{ retroGamesCount }}</div>
                  <div class="text-body2 text-grey-7">
                    {{ totalGames > 0 ? Math.round((retroGamesCount / totalGames) * 100) : 0 }}% of library
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div v-if="!isLoading && recentGames.length > 0" class="q-mb-xl">
          <div class="text-h5 q-mb-lg text-weight-medium">Recently Played</div>
          <div class="row stat-cards-row">
            <div 
              v-for="game in recentGames" 
              :key="game._id"
              class="stat-card-col col-12 col-sm-6 col-md-4"
            >
              <q-card 
                class="recent-game-card" 
                flat 
                bordered
                clickable
                @click="viewGame(game)"
              >
                <q-card-section>
                  <div class="row items-center q-gutter-sm q-mb-sm">
                    <q-icon name="sports_esports" color="primary" size="24px" />
                    <div class="text-subtitle1 text-weight-medium recent-game-name">{{ game.name }}</div>
                  </div>
                  <div class="text-body2 text-grey-7 q-mb-xs">
                    <q-icon name="access_time" size="14px" class="q-mr-xs" />
                    Last played: {{ game.lastPlayedDate ? new Date(game.lastPlayedDate).toLocaleDateString() : "Never" }}
                  </div>
                  <div v-if="game.isRetroGame" class="q-mt-sm">
                    <q-chip color="orange" text-color="white" size="sm" icon="history">Retro</q-chip>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && totalGames === 0" class="empty-state text-center q-pa-xl">
          <q-icon name="sports_esports" size="80px" color="grey-4" />
          <div class="text-h6 q-mt-md text-grey-6">No games yet</div>
          <div class="text-body2 text-grey-6 q-mt-xs">Start by adding your first game!</div>
          <q-btn 
            color="primary" 
            label="Add Game" 
            icon="add" 
            @click="addGameClicked" 
            class="q-mt-md"
          />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { Game } from "src/models/game";
import { GameStatusHistory } from "src/models/game-status-history";
import { Platform } from "src/models/platform";
import { PlaySession } from "src/models/play-session";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import AddGame from "src/components/AddGame.vue";
import { gameService } from "src/services/game-service";
import { platformService } from "src/services/platform-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";
import { ref, onMounted, type Ref } from "vue";
import { useRouter } from "vue-router";

const $q = useQuasar();
const router = useRouter();

const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const totalGames = ref(0);
const totalPlaytime = ref(0);
const totalSessions = ref(0);
const totalPlatforms = ref(0);
const completedGames = ref(0);
const inProgressGames = ref(0);
const onHoldGames = ref(0);
const droppedGames = ref(0);
const retroGamesCount = ref(0);
const mostPlayedGame = ref<{ name: string; playtime: number } | null>(null);
const favoritePlatform = ref<{ name: string; sessionCount: number; byGames?: boolean } | null>(null);
const recentGames = ref<Array<Game & { lastPlayedDate: number | null }>>([]);

function formatPlaytime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days < 99) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(" ") : "0m";
}

async function loadData() {
  isLoading.value = true;
  loadingIndicator.value?.startPhase({ phase: 1, weight: 30, label: "Loading games" });

  try {
    // Load games
    const games = await gameService.listGames();
    totalGames.value = games.length;
    retroGamesCount.value = games.filter((g) => g.isRetroGame).length;

    loadingIndicator.value?.startPhase({ phase: 2, weight: 40, label: "Loading sessions" });

    // Load all sessions
    const sessionsRes = await pouchdbService.listByCollection(Collection.PLAY_SESSION);
    const allSessions = sessionsRes.docs as PlaySession[];
    totalSessions.value = allSessions.length;

    // Calculate total playtime
    let totalMs = 0;
    const gamePlaytimeMap = new Map<string, number>();
    const platformSessionMap = new Map<string, number>();

    allSessions.forEach((session) => {
      if (session.gamingSession?.startTime && session.gamingSession?.endTime) {
        const duration = session.gamingSession.endTime - session.gamingSession.startTime;
        totalMs += duration;

        // Track per-game playtime
        if (session.gamingSession.gameId) {
          const current = gamePlaytimeMap.get(session.gamingSession.gameId) || 0;
          gamePlaytimeMap.set(session.gamingSession.gameId, current + duration);
        }

        // Track per-platform sessions
        if (session.gamingSession.platformId) {
          const current = platformSessionMap.get(session.gamingSession.platformId) || 0;
          platformSessionMap.set(session.gamingSession.platformId, current + 1);
        }
      }
    });

    // Include manually entered (untracked) playtime from games so total hours and
    // "most played" reflect both session tracking and manual entry
    games.forEach((game) => {
      if (!game._id) return;
      const untracked = game.untrackedPlaytime || 0;
      if (untracked > 0) {
        totalMs += untracked;
        const current = gamePlaytimeMap.get(game._id) || 0;
        gamePlaytimeMap.set(game._id, current + untracked);
      }
    });

    totalPlaytime.value = totalMs;

    // Find most played game
    let maxPlaytime = 0;
    let mostPlayedId = "";
    gamePlaytimeMap.forEach((playtime, gameId) => {
      if (playtime > maxPlaytime) {
        maxPlaytime = playtime;
        mostPlayedId = gameId;
      }
    });

    if (mostPlayedId) {
      const game = games.find((g) => g._id === mostPlayedId);
      if (game) {
        mostPlayedGame.value = {
          name: game.name,
          playtime: maxPlaytime,
        };
      }
    }

    // Find favorite platform (by session count, or by game count when no sessions)
    let maxSessions = 0;
    let favoritePlatformId = "";
    platformSessionMap.forEach((sessionCount, platformId) => {
      if (sessionCount > maxSessions) {
        maxSessions = sessionCount;
        favoritePlatformId = platformId;
      }
    });

    let favoriteByGames = false;
    if (!favoritePlatformId && games.length > 0) {
      // No sessions: use platform with most games in library
      const platformGameCount = new Map<string, number>();
      games.forEach((game) => {
        const ids = game.ownershipList?.map((o) => o.platformId) ?? game.platformIdList ?? [];
        ids.forEach((platformId) => {
          platformGameCount.set(platformId, (platformGameCount.get(platformId) ?? 0) + 1);
        });
      });
      let maxGames = 0;
      platformGameCount.forEach((count, platformId) => {
        if (count > maxGames) {
          maxGames = count;
          favoritePlatformId = platformId;
        }
      });
      if (favoritePlatformId) {
        maxSessions = maxGames;
        favoriteByGames = true;
      }
    }

    if (favoritePlatformId) {
      const platform = await platformService.getPlatform(favoritePlatformId);
      if (platform) {
        favoritePlatform.value = {
          name: platform.name,
          sessionCount: maxSessions,
          byGames: favoriteByGames,
        };
      }
    }

    loadingIndicator.value?.startPhase({ phase: 3, weight: 30, label: "Loading status history" });

    // Reset completion counters before recomputing
    completedGames.value = 0;
    inProgressGames.value = 0;
    onHoldGames.value = 0;
    droppedGames.value = 0;

    // Load status history for completion stats
    const statusRes = await pouchdbService.listByCollection(Collection.GAME_STATUS_HISTORY);
    const allStatusHistory = statusRes.docs as GameStatusHistory[];

    // Latest status per game-platform (by timestamp)
    const gameStatusMap = new Map<string, { status: string; timestamp: number }>();
    allStatusHistory.forEach((s) => {
      const key = `${s.gameId}-${s.platformId}`;
      const prev = gameStatusMap.get(key);
      if (!prev || s.timestamp > prev.timestamp) {
        gameStatusMap.set(key, { status: s.status, timestamp: s.timestamp });
      }
    });

    // Merge untracked history (from Add Game): statuses not in history
    games.forEach((game) => {
      if (!game._id || !game.untrackedHistoryList) return;
      game.untrackedHistoryList.forEach((u) => {
        const key = `${game._id}-${u.platformId}`;
        if (!gameStatusMap.has(key)) {
          gameStatusMap.set(key, { status: u.status, timestamp: 0 });
        }
      });
    });

    // Count statuses (each game-platform pair counted once)
    gameStatusMap.forEach((entry) => {
      switch (entry.status) {
        case "completed":
          completedGames.value++;
          break;
        case "in-progress":
          inProgressGames.value++;
          break;
        case "on-hold":
          onHoldGames.value++;
          break;
        case "dropped":
          droppedGames.value++;
          break;
      }
    });

    // Load platforms
    const platforms = await platformService.listPlatforms();
    totalPlatforms.value = platforms.length;

    // Get recently played games (last 10)
    const gamesWithLastPlayed = await Promise.all(
      games.map(async (game) => {
        let lastPlayedDate: number | null = null;

        // Check untracked history first
        if (game.untrackedHistoryList && game.untrackedHistoryList.length > 0) {
          const datesWithLastPlayed = game.untrackedHistoryList
            .filter((u) => u.lastPlayedDate)
            .map((u) => u.lastPlayedDate!);
          if (datesWithLastPlayed.length > 0) {
            lastPlayedDate = Math.max(...datesWithLastPlayed);
          }
        }

        // If no untracked history date, check sessions
        if (!lastPlayedDate && game._id) {
          lastPlayedDate = await gameService.getLastPlayedDate(game._id);
        }

        return {
          ...game,
          lastPlayedDate,
        };
      })
    );

    // Sort by last played date and take top 10
    recentGames.value = gamesWithLastPlayed
      .filter((g) => g.lastPlayedDate !== null)
      .sort((a, b) => (b.lastPlayedDate || 0) - (a.lastPlayedDate || 0))
      .slice(0, 10);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    await $q.dialog({
      title: "Error",
      message: "Failed to load dashboard data. Please try again.",
    });
  } finally {
    isLoading.value = false;
  }
}

function viewGame(game: Game) {
  if (game._id) {
    router.push({ name: "game", params: { gameId: game._id } });
  }
}

function addGameClicked() {
  $q.dialog({ component: AddGame }).onOk(() => {
    loadData();
  });
}

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.stat-cards-row {
  margin-left: -8px;
  margin-right: -8px;
  
  .stat-card-col {
    padding-left: 8px;
    padding-right: 8px;
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

.stat-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
  height: 100%;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}

.stat-card-content {
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.stat-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
  opacity: 0.8;
}

.stat-icon {
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1);
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.stat-progress {
  margin-top: 12px;
  position: relative;
}

.stat-progress-text {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  text-align: center;
}

// Stat card color variants
.stat-card-primary {
  background: linear-gradient(135deg, rgba(38, 50, 56, 0.05) 0%, rgba(38, 50, 56, 0.1) 100%);
  border-left: 4px solid rgb(38, 50, 56);
  
  .stat-icon {
    color: rgb(38, 50, 56);
  }
}

.stat-card-accent {
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.05) 0%, rgba(156, 39, 176, 0.1) 100%);
  border-left: 4px solid #9c27b0;
  
  .stat-icon {
    color: #9c27b0;
  }
}

.stat-card-info {
  background: linear-gradient(135deg, rgba(49, 204, 236, 0.05) 0%, rgba(49, 204, 236, 0.1) 100%);
  border-left: 4px solid #31ccec;
  
  .stat-icon {
    color: #31ccec;
  }
}

.stat-card-secondary {
  background: linear-gradient(135deg, rgba(38, 166, 154, 0.05) 0%, rgba(38, 166, 154, 0.1) 100%);
  border-left: 4px solid #26a69a;
  
  .stat-icon {
    color: #26a69a;
  }
}

.stat-card-success {
  background: linear-gradient(135deg, rgba(33, 186, 69, 0.05) 0%, rgba(33, 186, 69, 0.1) 100%);
  border-left: 4px solid #21ba45;
  
  .stat-icon {
    color: #21ba45;
  }
}

.stat-card-warning {
  background: linear-gradient(135deg, rgba(242, 192, 55, 0.05) 0%, rgba(242, 192, 55, 0.1) 100%);
  border-left: 4px solid #f2c037;
  
  .stat-icon {
    color: #f2c037;
  }
}

.stat-card-danger {
  background: linear-gradient(135deg, rgba(193, 0, 21, 0.05) 0%, rgba(193, 0, 21, 0.1) 100%);
  border-left: 4px solid #c10015;
  
  .stat-icon {
    color: #c10015;
  }
}

.quick-stat-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
  width: 100%;
  height: 100%;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
}

.recent-game-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  width: 100%;
  height: 100%;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    border-color: rgba(38, 50, 56, 0.3);
  }
}

.recent-game-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: 60px 20px;
}
</style>

