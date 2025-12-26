<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card" style="width: 100%">
      <div class="title-row q-pa-md">
        <div class="title">Dashboard</div>
      </div>

      <q-separator />

      <div class="q-pa-md">
        <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator"></loading-indicator>

        <!-- Aggregate Statistics -->
        <div v-if="!isLoading" class="q-mb-lg">
          <div class="text-h6 q-mb-md">Overall Statistics</div>
          <div class="row q-gutter-md">
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">Total Games</div>
                    <div class="stat-value">{{ totalGames }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">Total Playtime</div>
                    <div class="stat-value">{{ formatPlaytime(totalPlaytime) }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">Total Sessions</div>
                    <div class="stat-value">{{ totalSessions }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered>
                <q-card-section>
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
        <div v-if="!isLoading" class="q-mb-lg">
          <div class="text-h6 q-mb-md">Completion Status</div>
          <div class="row q-gutter-md">
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">Completed</div>
                    <div class="stat-value text-green">{{ completedGames }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">In Progress</div>
                    <div class="stat-value text-blue">{{ inProgressGames }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">On Hold</div>
                    <div class="stat-value text-orange">{{ onHoldGames }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">Dropped</div>
                    <div class="stat-value text-red">{{ droppedGames }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div v-if="!isLoading" class="q-mb-lg">
          <div class="text-h6 q-mb-md">Quick Stats</div>
          <div class="row q-gutter-md">
            <div class="col-12 col-sm-6 col-md-4">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">Most Played Game</div>
                    <div class="stat-value text-body1">
                      {{ mostPlayedGame ? mostPlayedGame.name : "N/A" }}
                    </div>
                    <div v-if="mostPlayedGame" class="stat-sublabel">
                      {{ formatPlaytime(mostPlayedGame.playtime) }}
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-4">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">Favorite Platform</div>
                    <div class="stat-value text-body1">
                      {{ favoritePlatform ? favoritePlatform.name : "N/A" }}
                    </div>
                    <div v-if="favoritePlatform" class="stat-sublabel">
                      {{ favoritePlatform.sessionCount }} sessions
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6 col-md-4">
              <q-card flat bordered>
                <q-card-section>
                  <div class="stat-item">
                    <div class="stat-label">Retro Games</div>
                    <div class="stat-value text-body1">{{ retroGamesCount }}</div>
                    <div class="stat-sublabel">{{ totalGames > 0 ? Math.round((retroGamesCount / totalGames) * 100) : 0 }}% of library</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div v-if="!isLoading && recentGames.length > 0" class="q-mb-lg">
          <div class="text-h6 q-mb-md">Recently Played</div>
          <q-list bordered separator>
            <q-item
              v-for="game in recentGames"
              :key="game._id"
              clickable
              @click="viewGame(game)"
              class="q-py-md"
            >
              <q-item-section avatar>
                <q-icon name="sports_esports" color="primary" size="32px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ game.name }}</q-item-label>
                <q-item-label caption>
                  Last played: {{ game.lastPlayedDate ? new Date(game.lastPlayedDate).toLocaleDateString() : "Never" }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-chip v-if="game.isRetroGame" color="orange" text-color="white" size="sm">Retro</q-chip>
              </q-item-section>
            </q-item>
          </q-list>
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
const favoritePlatform = ref<{ name: string; sessionCount: number } | null>(null);
const recentGames = ref<Array<Game & { lastPlayedDate: number | null }>>([]);

function formatPlaytime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
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

    // Find favorite platform
    let maxSessions = 0;
    let favoritePlatformId = "";
    platformSessionMap.forEach((sessionCount, platformId) => {
      if (sessionCount > maxSessions) {
        maxSessions = sessionCount;
        favoritePlatformId = platformId;
      }
    });

    if (favoritePlatformId) {
      const platform = await platformService.getPlatform(favoritePlatformId);
      if (platform) {
        favoritePlatform.value = {
          name: platform.name,
          sessionCount: maxSessions,
        };
      }
    }

    loadingIndicator.value?.startPhase({ phase: 3, weight: 30, label: "Loading status history" });

    // Load status history for completion stats
    const statusRes = await pouchdbService.listByCollection(Collection.GAME_STATUS_HISTORY);
    const allStatusHistory = statusRes.docs as GameStatusHistory[];

    // Get latest status for each game-platform combination
    const gameStatusMap = new Map<string, string>();
    allStatusHistory.forEach((status) => {
      const key = `${status.gameId}-${status.platformId}`;
      const existing = gameStatusMap.get(key);
      if (!existing || status.timestamp > (allStatusHistory.find((s) => `${s.gameId}-${s.platformId}` === key && s.status === existing)?.timestamp || 0)) {
        gameStatusMap.set(key, status.status);
      }
    });

    // Count statuses
    gameStatusMap.forEach((status) => {
      switch (status) {
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
.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.stat-sublabel {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.empty-state {
  padding: 60px 20px;
}
</style>

