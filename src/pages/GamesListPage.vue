<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <q-btn color="secondary" icon="filter_list" flat round @click="setFiltersClicked" />
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Game" @click="addGameClicked" />
      </div>

      <q-separator />

      <div class="q-pa-md" style="padding-top: 0px; margin-top: -8px; margin-bottom: 8px">
        <div class="filters-activated-area" v-if="gameFilters">
          <div style="flex: 1">
            <span>These results are filtered.</span>
          </div>
          <q-btn size="sm" color="secondary" outline rounded label="Clear" @click="clearFiltersClicked" />
        </div>

        <!-- @vue-expect-error -->
        <q-table
          :loading="isLoading"
          title="Games"
          :rows="rows"
          :columns="columns"
          row-key="_id"
          flat
          bordered
          :rows-per-page-options="rowsPerPageOptions"
          binary-state-sort
          v-model:pagination="pagination"
          @request="dataForTableRequested"
          class="std-table-non-morphing"
        >
          <template v-slot:top-right>
            <q-input outlined rounded dense clearable debounce="1" v-model="searchFilter" label="Search by name" placeholder="Search" class="search-field">
              <template v-slot:prepend>
                <q-btn icon="search" flat round @click="dataForTableRequested" />
              </template>
            </q-input>
          </template>

          <template v-slot:body-cell-platforms="rowWrapper">
            <q-td :props="rowWrapper">
              <q-chip
                v-for="platformId in rowWrapper.row.platformIdList"
                :key="platformId"
                :label="getPlatformName(platformId)"
                size="sm"
                class="q-mr-xs"
              />
              <span v-if="!rowWrapper.row.platformIdList || rowWrapper.row.platformIdList.length === 0">-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-lastPlayed="rowWrapper">
            <q-td :props="rowWrapper">
              {{ rowWrapper.row.lastPlayedDate ? new Date(rowWrapper.row.lastPlayedDate).toLocaleDateString() : "Never" }}
            </q-td>
          </template>

          <template v-slot:body-cell-tags="rowWrapper">
            <q-td :props="rowWrapper">
              <q-chip
                v-for="tagId in rowWrapper.row.tagIdList || []"
                :key="tagId"
                :label="getTagName(tagId)"
                :style="{ backgroundColor: getTagColor(tagId), color: getTagContrastColor(tagId) }"
                size="sm"
                class="q-mr-xs"
              />
              <span v-if="!rowWrapper.row.tagIdList || rowWrapper.row.tagIdList.length === 0">-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="rowWrapper">
            <q-td :props="rowWrapper">
              <div class="row q-gutter-xs">
                <q-btn 
                  size="sm" 
                  color="primary" 
                  label="View" 
                  @click="viewGameClicked(rowWrapper.row)"
                />
                <q-btn-dropdown size="sm" color="primary" label="Edit" split @click="editClicked(rowWrapper.row)">
                  <q-list>
                    <q-item clickable v-close-popup @click="deleteClicked(rowWrapper.row)">
                      <q-item-section>
                        <q-item-label>Delete</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
              </div>
            </q-td>
          </template>
        </q-table>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { Game } from "src/models/game";
import { Platform } from "src/models/platform";
import { Tag } from "src/models/tag";
import { dialogService } from "src/services/dialog-service";
import { gameService } from "src/services/game-service";
import { platformService } from "src/services/platform-service";
import { tagService } from "src/services/tag-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";
import { usePaginationSizeStore } from "src/stores/pagination";
import { ref, watch, type Ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import AddGame from "./../components/AddGame.vue";
import FilterGamesDialog, { type GameFilters } from "./../components/FilterGamesDialog.vue";
import { rowsPerPageOptions } from "./../constants/constants";

const $q = useQuasar();
const router = useRouter();
const paginationSizeStore = usePaginationSizeStore();

const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);
const platformsMap = ref(new Map<string, Platform>());
const tagsMap = ref(new Map<string, Tag>());

// Filter state
const gameFilters: Ref<GameFilters | null> = ref(null);

const columns = [
  {
    name: "name",
    required: true,
    label: "Name",
    align: "left",
    field: "name",
    sortable: true,
  },
  {
    name: "platforms",
    align: "left",
    label: "Platforms",
    field: "platformIdList",
    sortable: true,
  },
  {
    name: "lastPlayed",
    align: "left",
    label: "Last Played",
    field: "lastPlayedDate",
    sortable: true,
    format: (val: number | null) => (val ? new Date(val).toLocaleDateString() : "Never"),
  },
  {
    name: "isRetroGame",
    align: "center",
    label: "Retro",
    field: "isRetroGame",
    sortable: true,
    format: (val: boolean) => (val ? "Yes" : "No"),
  },
  {
    name: "rating",
    align: "center",
    label: "Rating",
    field: "rating",
    sortable: true,
    format: (val: number | null) => (val !== null && val !== undefined ? val.toFixed(1) : "-"),
  },
  {
    name: "tags",
    align: "left",
    label: "Tags",
    field: "tagIdList",
    sortable: false,
  },
  {
    name: "actions",
    label: "Actions",
  },
];

const rows: Ref<any[]> = ref([]);

const pagination = ref({
  sortBy: "name",
  descending: false,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

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

function getFirstPlatformName(game: Game): string {
  if (!game.platformIdList || game.platformIdList.length === 0) {
    return "";
  }
  const firstPlatformId = game.platformIdList[0];
  return getPlatformName(firstPlatformId);
}

function applyOrdering(docList: any[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  } else if (sortBy === "platforms") {
    docList.sort((a, b) => {
      const aPlatform = getFirstPlatformName(a);
      const bPlatform = getFirstPlatformName(b);
      return aPlatform.localeCompare(bPlatform) * (descending ? -1 : 1);
    });
  } else if (sortBy === "lastPlayed") {
    docList.sort((a, b) => {
      const aDate = a.lastPlayedDate ?? 0;
      const bDate = b.lastPlayedDate ?? 0;
      return (bDate - aDate) * (descending ? -1 : 1);
    });
  } else if (sortBy === "isRetroGame") {
    docList.sort((a, b) => {
      const aRetro = a.isRetroGame ? 1 : 0;
      const bRetro = b.isRetroGame ? 1 : 0;
      const result = aRetro - bRetro;
      return result * (descending ? -1 : 1);
    });
  } else if (sortBy === "rating") {
    docList.sort((a, b) => {
      const aRating = a.rating ?? -1; // Treat null as -1 for sorting (will appear last)
      const bRating = b.rating ?? -1;
      return (bRating - aRating) * (descending ? -1 : 1);
    });
  }
}

async function loadPlatforms() {
  const platforms = await platformService.listPlatforms();
  platforms.forEach((p) => {
    if (p._id) {
      platformsMap.value.set(p._id, p);
    }
  });
}

async function loadTags() {
  const tags = await tagService.listTags();
  tags.forEach((t) => {
    if (t._id) {
      tagsMap.value.set(t._id, t);
    }
  });
}

function setFiltersClicked() {
  $q.dialog({
    component: FilterGamesDialog,
    componentProps: {
      inputFilters: gameFilters.value,
    },
  }).onOk((filters: GameFilters) => {
    gameFilters.value = filters;
    dataForTableRequested(null);
  });
}

function clearFiltersClicked() {
  gameFilters.value = null;
  dataForTableRequested(null);
}

async function dataForTableRequested(props: any) {
  let inputPagination = props?.pagination || pagination.value;

  const { page, rowsPerPage, sortBy, descending } = inputPagination;
  paginationSizeStore.setPaginationSize(rowsPerPage);

  isLoading.value = true;

  const skip = (page - 1) * rowsPerPage;
  const limit = rowsPerPage;

  let docList = await gameService.listGames();

  // Apply search filter
  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.name));
  }

  // Apply filters if they exist
  if (gameFilters.value) {
    // Apply platform filter
    if (gameFilters.value.selectedPlatforms.length > 0) {
      docList = docList.filter((game) => {
        return game.platformIdList?.some((platformId) => gameFilters.value!.selectedPlatforms.includes(platformId));
      });
    }

    // Apply tag filter
    if (gameFilters.value.selectedTags.length > 0) {
      docList = docList.filter((game) => {
        return game.tagIdList?.some((tagId) => gameFilters.value!.selectedTags.includes(tagId));
      });
    }

    // Apply retro filter
    if (gameFilters.value.retroFilter !== null) {
      const isRetro = gameFilters.value.retroFilter === "yes";
      docList = docList.filter((game) => game.isRetroGame === isRetro);
    }

    // Apply rating filter
    if (gameFilters.value.ratingFilter !== null) {
      docList = docList.filter((game) => {
        return game.rating !== null && game.rating !== undefined && game.rating >= gameFilters.value!.ratingFilter!;
      });
    }

    // Apply completion status filter (need to load status history)
    if (gameFilters.value.completionFilter !== null) {
      const statusRes = await pouchdbService.listByCollection(Collection.GAME_STATUS_HISTORY);
      const allStatusHistory = statusRes.docs as any[];
      
      // Get latest status for each game
      const gameStatusMap = new Map<string, string>();
      allStatusHistory.forEach((status) => {
        const key = status.gameId;
        const existing = gameStatusMap.get(key);
        if (!existing || status.timestamp > (allStatusHistory.find((s) => s.gameId === key && s.status === existing)?.timestamp || 0)) {
          gameStatusMap.set(key, status.status);
        }
      });

      docList = docList.filter((game) => {
        if (!game._id) return false;
        const status = gameStatusMap.get(game._id);
        return status === gameFilters.value!.completionFilter;
      });
    }
  }

  // Calculate last played date for each game
  const gamesWithLastPlayed = await Promise.all(
    docList.map(async (game) => {
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

  applyOrdering(gamesWithLastPlayed, sortBy, descending);

  let totalRowCount = gamesWithLastPlayed.length;
  let currentRows = gamesWithLastPlayed.slice(skip, skip + limit);
  rows.value = currentRows;

  pagination.value.rowsNumber = totalRowCount;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  pagination.value.sortBy = sortBy;
  pagination.value.descending = descending;

  isLoading.value = false;
}

async function addGameClicked() {
  $q.dialog({ component: AddGame }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  await loadPlatforms();
  await loadTags();
  dataForTableRequested(null);
}

async function editClicked(game: Game) {
  $q.dialog({ component: AddGame, componentProps: { existingGameId: game._id } }).onOk(() => {
    loadData();
  });
}

async function viewGameClicked(game: Game) {
  router.push({ name: "game", params: { gameId: game._id } });
}

async function deleteClicked(game: Game) {
  let answer = await dialogService.confirm("Remove game", `Are you sure you want to remove the game "${game.name}"?`);
  if (!answer) return;

  try {
    await gameService.deleteGame(game);
    loadData();
  } catch (error) {
    await dialogService.alert("Error", "There was an error trying to remove the game.");
  }
}

// Initial data load
onMounted(() => {
  loadData();
});

// Watch for search filter changes
watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss">
.filters-activated-area {
  display: flex;
  align-items: center;
  font-size: 12px;
  margin-bottom: 12px;
  color: #3d3d3d;
  background-color: #f3f3f3;
  padding: 8px;
  border-radius: 4px;
}
</style>

