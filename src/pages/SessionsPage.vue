<template>
  <q-page class="column items-center justify-evenly">
    <q-card class="std-card">
      <!-- Header -->
      <div class="title-row q-pa-md">
        <div class="title">Gaming Sessions</div>
        <q-btn color="primary" label="Add Session" icon="add" @click="addSessionClicked" />
      </div>

      <q-separator />

      <!-- Filter Section -->
      <div class="q-pa-md">
        <div class="row q-gutter-md items-center">
          <div class="col-12 col-sm-auto">
            <month-and-year-input v-model:month="filterMonth" v-model:year="filterYear" @selection="monthAndYearSelected()" />
          </div>
          <div class="col text-right" v-if="!isLoading && cachedInferredRecordList.length > 0">
            <q-chip color="primary" text-color="white" icon="sports_esports">
              {{ cachedInferredRecordList.length }} session{{ cachedInferredRecordList.length !== 1 ? "s" : "" }}
            </q-chip>
          </div>
        </div>
      </div>

      <q-separator />

      <!-- Content -->
      <div class="q-pa-md">
        <loading-indicator :is-loading="isLoading" :phases="4" ref="loadingIndicator"></loading-indicator>

        <!-- Empty State -->
        <div v-if="!isLoading && rows.length === 0" class="empty-state">
          <q-icon name="sports_esports" size="80px" color="grey-4" />
          <div class="text-h6 q-mt-md text-grey-6">No sessions found</div>
          <div class="text-body2 text-grey-6 q-mt-xs">Try selecting a different month or add a new session</div>
          <q-btn color="primary" label="Add Session" icon="add" @click="addSessionClicked" class="q-mt-md" />
        </div>

        <!-- Sessions List -->
        <template v-if="!isLoading && rows.length > 0">
          <div v-for="(playSession, index) in rows" :key="playSession._id">
            <!-- Date Header -->
            <div
              v-if="index === 0 || prettifyDate(rows[index].transactionEpoch) !== prettifyDate(rows[index - 1].transactionEpoch)"
              class="date-header q-mb-md q-mt-lg"
            >
              <div class="row items-center q-gutter-sm">
                <q-separator class="col" />
                <div class="text-subtitle2 text-grey-7 q-px-sm text-weight-medium">
                  {{ prettifyDate(rows[index].transactionEpoch) }}
                </div>
                <q-separator class="col" />
              </div>
            </div>

            <!-- Session Card -->
            <q-card v-if="playSession.gamingSession" flat bordered class="session-card q-mb-md">
              <q-card-section>
                <div class="row items-start q-gutter-md">
                  <!-- Main Content -->
                  <div class="col">
                    <div class="row items-center q-gutter-sm q-mb-xs">
                      <q-icon name="videogame_asset" color="primary" size="24px" />
                      <span class="text-h6 text-weight-medium">
                        {{ playSession.gamingSession.game?.name || "Unknown Game" }}
                      </span>
                    </div>

                    <div class="row items-center q-gutter-md q-mt-sm" :class="$q.screen.lt.sm ? 'q-gutter-y-xs' : ''">
                      <div class="row items-center q-gutter-xs" :class="$q.screen.lt.sm ? 'col-12' : ''">
                        <q-icon name="computer" size="16px" color="grey-6" />
                        <span class="text-body2 text-grey-7">
                          {{ playSession.gamingSession.platform?.name || "Unknown Platform" }}
                        </span>
                      </div>

                      <div class="row items-center q-gutter-xs" :class="$q.screen.lt.sm ? 'col-12' : ''">
                        <q-icon name="schedule" size="16px" color="grey-6" />
                        <span class="text-body2 text-grey-7">
                          {{ formatPlaytime(getSessionDuration(playSession)) }}
                        </span>
                      </div>

                      <div class="row items-center q-gutter-xs" :class="$q.screen.lt.sm ? 'col-12' : ''">
                        <q-icon name="access_time" size="16px" color="grey-6" />
                        <span class="text-body2 text-grey-7">
                          {{ formatTime(playSession.gamingSession.startTime || playSession.transactionEpoch) }}
                        </span>
                      </div>
                    </div>

                    <!-- Notes -->
                    <div v-if="playSession.notes" class="q-mt-sm">
                      <q-chip size="sm" color="grey-2" text-color="grey-8" icon="note">
                        {{ playSession.notes }}
                      </q-chip>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="col-auto">
                    <div class="column q-gutter-xs">
                      <q-btn flat round color="primary" icon="edit" size="sm" @click="editSessionClicked(playSession)" title="Edit session" />
                      <q-btn flat round color="negative" icon="delete" size="sm" @click="deleteClicked(playSession)" title="Delete session" />
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Pagination -->
          <div class="q-pa-lg flex flex-center">
            <q-pagination v-model="paginationCurrentPage" :max="paginationMaxPage" input :max-pages="7" direction-links />
          </div>
        </template>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import AddGamingSession from "src/components/AddGamingSession.vue";
import MonthAndYearInput from "src/components/lib/MonthAndYearInput.vue";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import { Collection } from "src/constants/constants";
import { InferredPlaySession } from "src/models/inferred/inferred-play-session";
import { PlaySession } from "src/models/play-session";
import { dialogService } from "src/services/dialog-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { playSessionService } from "src/services/play-session-service";
import { usePlaySessionPaginationSizeStore } from "src/stores/play-session-pagination";
import { normalizeEpochRange } from "src/utils/date-utils";
import { prettifyDate } from "src/utils/misc-utils";
import { Ref, onMounted, ref } from "vue";

const $q = useQuasar();

const playSessionPaginationStore = usePlaySessionPaginationSizeStore();

// ----- Refs
const isLoading = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const rows: Ref<InferredPlaySession[]> = ref([]);

const playSessionCountPerPage = playSessionPaginationStore.playSessionPaginationSize;
const paginationCurrentPage: Ref<number> = ref(1);
const paginationMaxPage: Ref<number> = ref(1);

const filterMonth: Ref<number> = ref(new Date().getMonth());
const filterYear: Ref<number> = ref(new Date().getFullYear());

let cachedInferredRecordList: InferredPlaySession[] = [];

// ----- Functions

function formatPlaytime(ms: number): string {
  if (ms === 0) return "0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTime(epoch: number): string {
  const date = new Date(epoch);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getSessionDuration(playSession: PlaySession): number {
  if (playSession.gamingSession?.startTime && playSession.gamingSession?.endTime) {
    return playSession.gamingSession.endTime - playSession.gamingSession.startTime;
  }
  return 0;
}

async function loadData(origin = "unspecified") {
  isLoading.value = true;

  if (cachedInferredRecordList.length === 0 || origin !== "pagination") {
    loadingIndicator.value?.startPhase({ phase: 1, weight: 10, label: "Updating cache" });

    loadingIndicator.value?.startPhase({ phase: 2, weight: 20, label: "Filtering sessions" });
    let playSessionList = (await pouchdbService.listByCollection(Collection.PLAY_SESSION)).docs as PlaySession[];

    // Filter by month/year
    let rangeStart = new Date(filterYear.value, filterMonth.value, 1);
    let rangeEnd = new Date(filterYear.value, filterMonth.value, 1);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    rangeEnd.setDate(rangeEnd.getDate() - 1);
    let [startEpoch, endEpoch] = normalizeEpochRange(rangeStart.getTime(), rangeEnd.getTime());
    playSessionList = playSessionList.filter((playSession) => playSession.transactionEpoch >= startEpoch && playSession.transactionEpoch <= endEpoch);

    loadingIndicator.value?.startPhase({ phase: 3, weight: 10, label: "Sorting" });
    playSessionList.sort((a, b) => (b.transactionEpoch || 0) - (a.transactionEpoch || 0));

    paginationMaxPage.value = Math.ceil(playSessionList.length / playSessionCountPerPage);
    if (paginationCurrentPage.value > paginationMaxPage.value) {
      paginationCurrentPage.value = paginationMaxPage.value;
    }

    loadingIndicator.value?.startPhase({ phase: 4, weight: 60, label: "Preparing view" });

    let inferredPlaySessionList: InferredPlaySession[];
    if (playSessionList.length > 0) {
      inferredPlaySessionList = await playSessionService.inferInBatch(playSessionList);
    } else {
      inferredPlaySessionList = [];
    }

    cachedInferredRecordList = inferredPlaySessionList;
  }

  const skip = (paginationCurrentPage.value - 1) * playSessionCountPerPage;
  const limit = playSessionCountPerPage;
  rows.value = cachedInferredRecordList.slice(skip, skip + limit);

  isLoading.value = false;
}

function monthAndYearSelected() {
  paginationCurrentPage.value = 1;
  cachedInferredRecordList = [];
  loadData();
}

async function addSessionClicked() {
  $q.dialog({ component: AddGamingSession }).onOk(() => {
    paginationCurrentPage.value = 1;
    cachedInferredRecordList = [];
    loadData();
  });
}

async function editSessionClicked(playSession: PlaySession) {
  $q.dialog({ component: AddGamingSession, componentProps: { existingPlaySessionId: playSession._id } }).onOk(() => {
    paginationCurrentPage.value = 1;
    cachedInferredRecordList = [];
    loadData();
  });
}

async function deleteClicked(playSession: PlaySession) {
  const answer = await dialogService.confirm("Delete Session", "Are you sure you want to delete this gaming session?");
  if (!answer) return;

  const res = await pouchdbService.removeDoc(playSession);
  if (!res.ok) {
    await dialogService.alert("Error", "There was an error trying to delete the session.");
    return;
  }

  paginationCurrentPage.value = 1;
  cachedInferredRecordList = [];
  loadData();
}

// Initial load
onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.session-card {
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.date-header {
  .text-subtitle2 {
    white-space: nowrap;
  }
}
</style>
