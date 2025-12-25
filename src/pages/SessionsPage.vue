<template>
  <q-page class="column items-center justify-evenly">
    <!-- Sessions -->
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">
          <div class="month-and-year-input-wrapper" v-if="$q.screen.gt.xs">
            <month-and-year-input v-model:month="filterMonth" v-model:year="filterYear" @selection="monthAndYearSelected()"></month-and-year-input>
          </div>
        </div>
        <q-btn color="primary" label="Add Session" @click="addSessionClicked" />
      </div>

      <div class="q-pa-md" style="padding-top: 0px; margin-top: -8px; margin-bottom: 8px">
        <div class="month-and-year-input-wrapper" v-if="$q.screen.lt.sm">
          <month-and-year-input v-model:month="filterMonth" v-model:year="filterYear" @selection="monthAndYearSelected()"></month-and-year-input>
        </div>

        <loading-indicator :is-loading="isLoading" :phases="4" ref="loadingIndicator"></loading-indicator>

        <template v-if="!isLoading">
          <div v-for="(playSession, index) in rows" class="record-row" v-bind:key="playSession._id">
            <template v-if="index === 0 || prettifyDate(rows[index].transactionEpoch) !== prettifyDate(rows[index - 1].transactionEpoch)">
              <div class="divider-line-different-day">
                <div class="divider-line-date">
                  <div class="divider-line-inner">{{ prettifyDate(rows[index].transactionEpoch) }}</div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="divider-line-same-day"></div>
            </template>

            <!-- Play Session -->
            <div class="single-amount-row row" v-if="playSession.gamingSession" :data-index="index">
              <div class="details-section">
                <div class="record-date">
                  {{ prettifyDate(playSession.gamingSession.startTime || playSession.transactionEpoch) }}
                </div>
                <div class="record-details">
                  <div class="record-main-info">
                    <span class="record-entity-name">{{ playSession.gamingSession.game?.name || "Unknown Game" }}</span>
                    <span class="record-separator">on</span>
                    <span class="record-entity-name">{{ playSession.gamingSession.platform?.name || "Unknown Platform" }}</span>
                  </div>
                  <div class="record-duration">
                    Duration: {{ formatPlaytime(getSessionDuration(playSession)) }}
                  </div>
                  <div class="record-notes" v-if="playSession.notes">{{ playSession.notes }}</div>
                </div>
              </div>
              <div class="controls">
                <q-btn class="control-button" round color="primary" icon="create" size="8px" @click="editSessionClicked(playSession)" />
                <q-btn class="control-button" round color="negative" icon="delete" size="8px" @click="deleteClicked(playSession)" />
              </div>
            </div>
          </div>

          <div class="q-pa-lg flex flex-center">
            <q-pagination v-model="paginationCurrentPage" :max="paginationMaxPage" input />
          </div>
        </template>
      </div>
    </q-card>
    <!-- End of Sessions -->
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

<style scoped lang="scss"></style>

