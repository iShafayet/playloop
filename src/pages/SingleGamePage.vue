<template>
  <q-page class="column items-center justify-center">
    <q-card class="std-card" v-if="!isLoading && game">
      <div v-if="$q.screen.lt.sm" class="q-pa-md q-gutter-sm row justify-end" style="margin-bottom: 0px; padding-bottom: 0px">
        <q-btn color="primary" label="Edit Game" @click="editGameClicked" />
        <q-btn color="primary" label="Add Session" @click="addSessionClicked" />
      </div>

      <div class="title-row q-pa-md">
        <q-btn icon="arrow_back" flat round @click="goBack" />
        <div class="title">{{ game.name }}</div>
        <div v-if="$q.screen.gt.xs" class="spacer"></div>
        <q-btn v-if="$q.screen.gt.xs" color="primary" label="Edit Game" @click="editGameClicked" />
      </div>

      <q-separator />

      <div class="q-pa-md">
        <!-- Game Info -->
        <div class="q-mb-lg">
          <div class="row q-gutter-md">
            <div class="col-12 col-sm-6">
              <div><strong>Release Date:</strong> {{ releaseDateFormatted }}</div>
              <div><strong>Retro Game:</strong> {{ game.isRetroGame ? "Yes" : "No" }}</div>
              <div v-if="game.howLongToBeat"><strong>How Long to Beat:</strong> {{ formatHowLongToBeat(game.howLongToBeat) }}</div>
            </div>
            <div class="col-12 col-sm-6">
              <div><strong>Platforms:</strong></div>
              <q-chip v-for="platformId in game.platformIdList" :key="platformId" :label="getPlatformName(platformId)" size="sm" class="q-mr-xs q-mt-xs" />
              <span v-if="!game.platformIdList || game.platformIdList.length === 0">None</span>
            </div>
            <div class="col-12 col-sm-6" v-if="game.rating !== null && game.rating !== undefined">
              <div><strong>Rating:</strong></div>
              <div class="row items-center q-gutter-sm q-mt-xs">
                <q-rating :model-value="game.rating" max="10" size="24px" color="primary" readonly />
                <span class="text-h6">{{ game.rating.toFixed(1) }}/10</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="q-mb-lg" v-if="game?.tagIdList && game.tagIdList.length > 0">
          <div class="text-h6 q-mb-md">Tags</div>
          <q-card flat bordered>
            <q-card-section>
              <q-chip
                v-for="tagId in game.tagIdList"
                :key="tagId"
                :label="getTagName(tagId)"
                :style="{ backgroundColor: getTagColor(tagId), color: getTagContrastColor(tagId) }"
                size="md"
                class="q-mr-sm q-mb-sm"
              />
            </q-card-section>
          </q-card>
        </div>

        <!-- Review -->
        <div class="q-mb-lg">
          <div class="row items-center q-mb-md">
            <div class="text-h6">Review</div>
            <div class="spacer"></div>
            <q-btn color="primary" :label="review ? 'Edit Review' : 'Add Review'" icon="rate_review" @click="reviewClicked" />
          </div>
          <q-card v-if="review" flat bordered>
            <q-card-section>
              <!-- Review Text -->
              <div v-if="review.reviewText" class="q-mb-md">
                <div class="text-subtitle2 q-mb-sm">Review Text</div>
                <div class="text-body1" style="white-space: pre-wrap">{{ review.reviewText }}</div>
              </div>

              <!-- Aspect Ratings -->
              <div v-if="review.aspectRatings" class="q-mb-md">
                <div class="text-subtitle2 q-mb-sm">Aspect Ratings</div>
                <div class="row q-gutter-md">
                  <template v-for="aspect in aspectList" :key="aspect.key">
                    <div v-if="review.aspectRatings?.[aspect.key] !== null && review.aspectRatings?.[aspect.key] !== undefined" class="col-12 col-sm-6">
                      <div class="row items-center q-gutter-sm">
                        <div class="text-body2" style="min-width: 100px">{{ aspect.label }}:</div>
                        <q-rating :model-value="review.aspectRatings![aspect.key]" :max="10" size="20px" color="primary" readonly />
                        <span class="text-body2">{{ review.aspectRatings![aspect.key] }}/10</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Metrics -->
              <div v-if="review.metrics" class="q-mb-md">
                <div class="text-subtitle2 q-mb-sm">Metrics</div>
                <div class="row q-gutter-md">
                  <template v-for="metric in metricList" :key="metric.key">
                    <div v-if="review.metrics?.[metric.key] !== null && review.metrics?.[metric.key] !== undefined" class="col-12 col-sm-6">
                      <div class="row items-center q-gutter-sm">
                        <div class="text-body2" style="min-width: 100px">{{ metric.label }}:</div>
                        <span class="text-body2 text-weight-medium">{{ review.metrics![metric.key] }}/10</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Overall Rating -->
              <div v-if="getReviewAverageRating(review) !== null" class="q-mt-md">
                <div class="text-subtitle2 q-mb-sm">Overall Rating</div>
                <div class="row items-center q-gutter-sm">
                  <q-rating :model-value="getReviewAverageRating(review)" :max="10" size="28px" color="primary" readonly />
                  <span class="text-h6">{{ getReviewAverageRating(review)!.toFixed(1) }}/10</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
          <div v-else class="text-center q-pa-md text-grey-6">
            <q-icon name="rate_review" size="48px" color="grey-4" />
            <div class="text-body2 q-mt-sm">No review yet</div>
          </div>
        </div>

        <!-- Untracked History -->
        <div class="q-mb-lg" v-if="game?.untrackedHistoryList && game.untrackedHistoryList.length > 0">
          <div class="text-h6 q-mb-md">Untracked History</div>
          <q-card flat bordered>
            <q-card-section>
              <div v-for="untracked in game.untrackedHistoryList" :key="untracked.platformId" class="q-mb-md">
                <div class="row items-center q-gutter-md">
                  <div class="col-12 col-sm-3">
                    <strong>{{ getPlatformName(untracked.platformId) }}</strong>
                  </div>
                  <div class="col-12 col-sm-3">
                    <q-chip :label="formatStatusLabel(untracked.status)" :color="getStatusColorByStatus(untracked.status)" text-color="white" size="sm" />
                  </div>
                  <div class="col-12 col-sm-6" v-if="untracked.lastPlayedDate">
                    <div class="text-body2">
                      <q-icon name="access_time" size="16px" color="grey-6" class="q-mr-xs" />
                      Last played: {{ formatDate(untracked.lastPlayedDate) }}
                    </div>
                  </div>
                </div>
                <q-separator v-if="untracked !== game.untrackedHistoryList[game.untrackedHistoryList.length - 1]" class="q-mt-md" />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Overall Statistics -->
        <div class="q-mb-lg">
          <div class="text-h6 q-mb-md">Overall Statistics</div>
          <q-card flat bordered>
            <q-card-section>
              <div class="row q-gutter-md">
                <div class="col-12 col-sm-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-label">Total Playtime</div>
                    <div class="stat-value">{{ formatPlaytime(totalPlaytime) }}</div>
                  </div>
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-label">Total Sessions</div>
                    <div class="stat-value">{{ totalSessions }}</div>
                  </div>
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-label">Average Session</div>
                    <div class="stat-value">{{ formatPlaytime(averageSessionDuration) }}</div>
                  </div>
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-label">First Played</div>
                    <div class="stat-value">{{ firstPlayedFormatted }}</div>
                  </div>
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-label">Last Played</div>
                    <div class="stat-value">{{ lastPlayedFormatted }}</div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Platform Breakdown -->
        <div class="q-mb-lg" v-if="platformBreakdown.size > 0">
          <div class="text-h6 q-mb-md">Platform Breakdown</div>

          <!-- Desktop Table View -->
          <q-card v-if="$q.screen.gt.sm" flat bordered>
            <q-card-section>
              <table class="overview-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Playtime</th>
                    <th>Sessions</th>
                    <th>Status</th>
                    <th>Ownership</th>
                    <th>Untracked History</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="[platformId, stats] in platformBreakdown" :key="platformId">
                    <td>{{ getPlatformName(platformId) }}</td>
                    <td>{{ formatPlaytime(stats.playtime) }}</td>
                    <td>{{ stats.sessionCount }}</td>
                    <td>
                      <q-chip :label="getStatusLabel(platformId)" :color="getStatusColor(platformId)" text-color="white" size="sm" />
                    </td>
                    <td>{{ getOwnershipLabel(platformId) }}</td>
                    <td>
                      <div v-if="getUntrackedHistory(platformId)">
                        <q-chip
                          :label="getUntrackedHistoryLabel(platformId)"
                          :color="getStatusColorByStatus(getUntrackedHistory(platformId)?.status || '')"
                          text-color="white"
                          size="sm"
                          class="q-mb-xs"
                        />
                        <div v-if="getUntrackedHistory(platformId)?.lastPlayedDate" class="text-caption text-grey-7">
                          Last played: {{ formatDate(getUntrackedHistory(platformId)!.lastPlayedDate!) }}
                        </div>
                      </div>
                      <span v-else class="text-grey-6">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </q-card-section>
          </q-card>

          <!-- Mobile Card View -->
          <div v-else class="row q-gutter-md">
            <div v-for="[platformId, stats] in platformBreakdown" :key="platformId" class="col-12">
              <q-card class="platform-breakdown-card" flat bordered>
                <q-card-section>
                  <div class="row items-center q-gutter-sm q-mb-md">
                    <q-icon name="devices" size="24px" color="primary" />
                    <div class="text-h6 text-weight-medium">{{ getPlatformName(platformId) }}</div>
                  </div>

                  <div class="row q-gutter-md">
                    <div class="col-6">
                      <div class="text-caption text-grey-7 q-mb-xs">Playtime</div>
                      <div class="text-body1 text-weight-medium">{{ formatPlaytime(stats.playtime) }}</div>
                    </div>
                    <div class="col-6">
                      <div class="text-caption text-grey-7 q-mb-xs">Sessions</div>
                      <div class="text-body1 text-weight-medium">{{ stats.sessionCount }}</div>
                    </div>
                    <div class="col-6">
                      <div class="text-caption text-grey-7 q-mb-xs">Status</div>
                      <q-chip :label="getStatusLabel(platformId)" :color="getStatusColor(platformId)" text-color="white" size="sm" />
                    </div>
                    <div class="col-6">
                      <div class="text-caption text-grey-7 q-mb-xs">Ownership</div>
                      <div class="text-body2">{{ getOwnershipLabel(platformId) }}</div>
                    </div>
                    <div class="col-12" v-if="getUntrackedHistory(platformId)">
                      <div class="text-caption text-grey-7 q-mb-xs">Untracked History</div>
                      <q-chip
                        :label="getUntrackedHistoryLabel(platformId)"
                        :color="getStatusColorByStatus(getUntrackedHistory(platformId)?.status || '')"
                        text-color="white"
                        size="sm"
                        class="q-mb-xs"
                      />
                      <div v-if="getUntrackedHistory(platformId)?.lastPlayedDate" class="text-caption text-grey-7">
                        Last played: {{ formatDate(getUntrackedHistory(platformId)!.lastPlayedDate!) }}
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <!-- Status History -->
        <div class="q-mb-lg" v-if="statusHistory.length > 0">
          <div class="text-h6 q-mb-md">Status History</div>
          <q-card flat bordered>
            <q-card-section>
              <!-- Desktop View -->
              <div v-if="$q.screen.gt.sm">
                <div v-for="status in statusHistory" :key="status._id" class="q-mb-sm">
                  <div class="row q-gutter-md">
                    <div class="col-12 col-sm-3">
                      <strong>{{ getPlatformName(status.platformId) }}</strong>
                    </div>
                    <div class="col-12 col-sm-2">
                      <q-chip :label="formatStatusLabel(status.status)" :color="getStatusColorByStatus(status.status)" text-color="white" size="sm" />
                    </div>
                    <div class="col-12 col-sm-4">
                      {{ formatDate(status.timestamp) }}
                    </div>
                    <div class="col-12 col-sm-3" v-if="status.notes">
                      <em>{{ status.notes }}</em>
                    </div>
                  </div>
                  <q-separator v-if="status !== statusHistory[statusHistory.length - 1]" class="q-mt-sm" />
                </div>
              </div>

              <!-- Mobile Card View -->
              <div v-else class="row q-gutter-md">
                <div v-for="status in statusHistory" :key="status._id" class="col-12">
                  <q-card class="status-history-card" flat bordered>
                    <q-card-section>
                      <div class="row items-center q-gutter-sm q-mb-sm">
                        <q-icon name="devices" size="20px" color="primary" />
                        <div class="text-subtitle1 text-weight-medium">{{ getPlatformName(status.platformId) }}</div>
                      </div>
                      <div class="q-mb-sm">
                        <q-chip :label="formatStatusLabel(status.status)" :color="getStatusColorByStatus(status.status)" text-color="white" size="sm" />
                      </div>
                      <div class="text-body2 text-grey-7 q-mb-xs">
                        <q-icon name="access_time" size="14px" class="q-mr-xs" />
                        {{ formatDate(status.timestamp) }}
                      </div>
                      <div v-if="status.notes" class="text-body2 text-grey-8 q-mt-sm">
                        <q-icon name="note" size="14px" class="q-mr-xs" />
                        {{ status.notes }}
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Session History -->
        <div class="q-mb-lg" v-if="sessions.length > 0">
          <div class="text-h6 q-mb-md">Session History</div>
          <q-card flat bordered>
            <q-card-section>
              <!-- Desktop View -->
              <div v-if="$q.screen.gt.sm">
                <div v-for="session in sessions" :key="session._id" class="q-mb-sm">
                  <div class="row q-gutter-md">
                    <div class="col-12 col-sm-3">
                      <strong>{{ getPlatformName(session.gamingSession?.platformId || "") }}</strong>
                    </div>
                    <div class="col-12 col-sm-3">
                      {{ formatDate(session.gamingSession?.startTime || session.transactionEpoch) }}
                    </div>
                    <div class="col-12 col-sm-3">Duration: {{ formatPlaytime(getSessionDuration(session)) }}</div>
                    <div class="col-12 col-sm-3">
                      <q-btn size="sm" label="Edit" @click="editSessionClicked(session)" />
                    </div>
                  </div>
                  <div v-if="session.notes" class="q-mt-xs text-grey-7">
                    {{ session.notes }}
                  </div>
                  <q-separator v-if="session !== sessions[sessions.length - 1]" class="q-mt-sm" />
                </div>
              </div>

              <!-- Mobile Card View -->
              <div v-else class="row q-gutter-md">
                <div v-for="session in sessions" :key="session._id" class="col-12">
                  <q-card class="session-history-card" flat bordered>
                    <q-card-section>
                      <div class="row items-center q-gutter-sm q-mb-sm">
                        <q-icon name="play_circle" size="20px" color="primary" />
                        <div class="text-subtitle1 text-weight-medium">{{ getPlatformName(session.gamingSession?.platformId || "") }}</div>
                      </div>
                      <div class="row q-gutter-md q-mb-sm">
                        <div class="col-6">
                          <div class="text-caption text-grey-7 q-mb-xs">Date</div>
                          <div class="text-body2">{{ formatDate(session.gamingSession?.startTime || session.transactionEpoch) }}</div>
                        </div>
                        <div class="col-6">
                          <div class="text-caption text-grey-7 q-mb-xs">Duration</div>
                          <div class="text-body2 text-weight-medium">{{ formatPlaytime(getSessionDuration(session)) }}</div>
                        </div>
                      </div>
                      <div v-if="session.notes" class="text-body2 text-grey-8 q-mt-sm">
                        <q-icon name="note" size="14px" class="q-mr-xs" />
                        {{ session.notes }}
                      </div>
                    </q-card-section>
                    <q-card-actions align="right">
                      <q-btn flat color="primary" label="Edit" icon="edit" size="sm" @click="editSessionClicked(session)" />
                    </q-card-actions>
                  </q-card>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- No Sessions Message -->
        <div v-if="sessions.length === 0" class="text-center q-pa-lg">
          <q-icon name="sports_esports" size="64px" color="grey-5" />
          <p class="text-grey-6 q-mt-md">No gaming sessions recorded yet</p>
          <q-btn color="primary" label="Add Session" @click="addSessionClicked" class="q-mt-md" />
        </div>
      </div>
    </q-card>

    <loading-indicator :is-loading="isLoading" :phases="3" ref="loadingIndicator"></loading-indicator>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { ref, onMounted, computed, Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Game } from "src/models/game";
import { Platform } from "src/models/platform";
import { PlaySession } from "src/models/play-session";
import { GameStatusHistory } from "src/models/game-status-history";
import { GameOwnershipEntry, GameUntrackedHistoryEntry } from "src/models/game";
import { Tag } from "src/models/tag";
import { Review } from "src/models/review";
import { gameService } from "src/services/game-service";
import { platformService } from "src/services/platform-service";
import { tagService } from "src/services/tag-service";
import { reviewService } from "src/services/review-service";
import { pouchdbService } from "src/services/pouchdb-service";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import AddGame from "src/components/AddGame.vue";
import AddGamingSession from "src/components/AddGamingSession.vue";
import AddReview from "src/components/AddReview.vue";
import { prettifyDate } from "src/utils/misc-utils";

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const game: Ref<Game | null> = ref(null);
const platformsMap = ref(new Map<string, Platform>());
const tagsMap = ref(new Map<string, Tag>());
const totalPlaytime = ref(0);
const totalSessions = ref(0);
const averageSessionDuration = ref(0);
const firstPlayedDate = ref<number | null>(null);
const lastPlayedDate = ref<number | null>(null);
const platformBreakdown = ref(new Map<string, { playtime: number; sessionCount: number }>());
const statusHistory = ref<GameStatusHistory[]>([]);
// Ownership is now stored in game.ownershipList, no need for separate ref
const sessions = ref<PlaySession[]>([]);
const review = ref<Review | null>(null);

const releaseDateFormatted = computed(() => {
  if (!game.value?.releaseDate) return "Not set";
  return new Date(game.value.releaseDate).toLocaleDateString();
});

const firstPlayedFormatted = computed(() => {
  if (!firstPlayedDate.value) return "Never";
  return prettifyDate(firstPlayedDate.value);
});

const lastPlayedFormatted = computed(() => {
  if (!lastPlayedDate.value) return "Never";
  return prettifyDate(lastPlayedDate.value);
});

function formatPlaytime(ms: number): string {
  if (ms === 0) return "0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatHowLongToBeat(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours > 0 && minutes > 0) {
    return `${wholeHours}h ${minutes}m`;
  } else if (wholeHours > 0) {
    return `${wholeHours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  }
  return "0h";
}

function formatDate(epoch: number): string {
  return prettifyDate(epoch);
}

function formatStatusLabel(status: string): string {
  if (!status) return "Not set";
  // Replace hyphens with spaces and capitalize each word
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getPlatformName(platformId: string): string {
  return platformsMap.value.get(platformId)?.name || platformId;
}

function getTagName(tagId: string): string {
  return tagsMap.value.get(tagId)?.name || tagId;
}

function getTagColor(tagId: string): string {
  return tagsMap.value.get(tagId)?.color || "#444444";
}

function getTagContrastColor(tagId: string): string {
  const color = getTagColor(tagId);
  // Convert hex to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function getSessionDuration(session: PlaySession): number {
  if (session.gamingSession?.startTime && session.gamingSession?.endTime) {
    return session.gamingSession.endTime - session.gamingSession.startTime;
  }
  return 0;
}

function getStatusLabel(platformId: string): string {
  const status = statusHistory.value.find((s) => s.platformId === platformId);
  if (!status) return "Not set";
  return formatStatusLabel(status.status);
}

function getStatusColor(platformId: string): string {
  const status = statusHistory.value.find((s) => s.platformId === platformId);
  return getStatusColorByStatus(status?.status || "");
}

function getStatusColorByStatus(status: string): string {
  switch (status) {
    case "completed":
      return "green";
    case "in-progress":
      return "blue";
    case "on-hold":
      return "orange";
    case "dropped":
      return "red";
    default:
      return "grey";
  }
}

function getOwnershipLabel(platformId: string): string {
  const ownership = game.value?.ownershipList?.find((o) => o.platformId === platformId);
  if (!ownership) return "Not set";
  return ownership.ownershipType;
}

function getUntrackedHistory(platformId: string): GameUntrackedHistoryEntry | undefined {
  return game.value?.untrackedHistoryList?.find((u) => u.platformId === platformId);
}

function getUntrackedHistoryLabel(platformId: string): string {
  const untracked = getUntrackedHistory(platformId);
  if (!untracked) return "None";
  return formatStatusLabel(untracked.status);
}

async function loadData() {
  isLoading.value = true;
  const gameId = route.params.gameId as string;

  try {
    loadingIndicator.value?.startPhase({ phase: 1, weight: 30, label: "Loading game data" });

    // Load game and platforms
    game.value = await gameService.getGame(gameId);
    if (!game.value) {
      await $q.dialog({ title: "Error", message: "Game not found" });
      router.push({ name: "games" });
      return;
    }

    const platforms = await platformService.listPlatforms();
    platforms.forEach((p) => {
      if (p._id) {
        platformsMap.value.set(p._id, p);
      }
    });

    const tags = await tagService.listTags();
    tags.forEach((t) => {
      if (t._id) {
        tagsMap.value.set(t._id, t);
      }
    });

    loadingIndicator.value?.startPhase({ phase: 2, weight: 40, label: "Loading statistics" });

    // Load statistics
    totalPlaytime.value = await gameService.getTotalPlaytime(gameId);
    sessions.value = await gameService.getGameSessions(gameId);
    totalSessions.value = sessions.value.length;
    averageSessionDuration.value = await gameService.getAverageSessionDuration(gameId);

    // First/last played consolidate sessions and manual (untracked) history
    firstPlayedDate.value = await gameService.getFirstPlayedDate(gameId);
    lastPlayedDate.value = await gameService.getLastPlayedDate(gameId);

    platformBreakdown.value = await gameService.getPlatformBreakdown(gameId);

    loadingIndicator.value?.startPhase({ phase: 3, weight: 30, label: "Loading history" });

    // Load status history (ownership is now in game.ownershipList)
    statusHistory.value = await gameService.getGameStatusHistory(gameId);

    // Load review
    review.value = await reviewService.getReviewByGameId(gameId);
  } catch (error) {
    console.error("Error loading game data:", error);
    await $q.dialog({ title: "Error", message: "Failed to load game data" });
  } finally {
    isLoading.value = false;
  }
}

function goBack() {
  router.push({ name: "games" });
}

async function editGameClicked() {
  if (!game.value) return;
  $q.dialog({ component: AddGame, componentProps: { existingGameId: game.value._id } }).onOk(() => {
    loadData();
  });
}

async function addSessionClicked() {
  if (!game.value) return;
  const platformId =
    game.value.ownershipList?.[0]?.platformId ?? game.value.platformIdList?.[0] ?? null;
  $q.dialog({
    component: AddGamingSession,
    componentProps: {
      preselectedGameId: game.value._id,
      preselectedPlatformId: platformId,
    },
  }).onOk(() => {
    loadData();
  });
}

async function editSessionClicked(session: PlaySession) {
  $q.dialog({ component: AddGamingSession, componentProps: { existingPlaySessionId: session._id } }).onOk(() => {
    loadData();
  });
}

const aspectList = [
  { key: "story" as const, label: "Story" },
  { key: "gameplay" as const, label: "Gameplay" },
  { key: "novelty" as const, label: "Novelty" },
  { key: "music" as const, label: "Music" },
  { key: "artDesign" as const, label: "Art Design" },
  { key: "graphics" as const, label: "Graphics" },
  { key: "performance" as const, label: "Performance" },
  { key: "characters" as const, label: "Characters" },
];

const metricList = [
  { key: "difficulty" as const, label: "Difficulty" },
  { key: "nostalgia" as const, label: "Nostalgia" },
];

function getReviewAverageRating(review: Review | null): number | null {
  if (!review || !review.aspectRatings) return null;
  return reviewService.calculateAverageRating(review.aspectRatings);
}

async function reviewClicked() {
  if (!game.value || !game.value._id) return;
  $q.dialog({
    component: AddReview,
    componentProps: {
      gameId: game.value._id,
      existingReviewId: review.value?._id || null,
    },
  }).onOk(() => {
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
  .stat-label {
    font-size: 0.9em;
    color: #666;
    margin-bottom: 4px;
  }
  .stat-value {
    font-size: 1.5em;
    font-weight: bold;
  }
}

.overview-table {
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  th {
    font-weight: bold;
    background-color: #f5f5f5;
  }
}

.platform-breakdown-card,
.status-history-card,
.session-history-card {
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
}
</style>
