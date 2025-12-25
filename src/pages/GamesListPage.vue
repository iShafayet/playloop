<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Game" @click="addGameClicked" />
      </div>

      <div class="q-pa-md">
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
              <q-btn-dropdown size="sm" color="primary" label="Edit" split @click="editClicked(rowWrapper.row)">
                <q-list>
                  <q-item clickable v-close-popup @click="viewGameClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>View Details</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="deleteClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Delete</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
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
import { usePaginationSizeStore } from "src/stores/pagination";
import { ref, watch, type Ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import AddGame from "./../components/AddGame.vue";
import { rowsPerPageOptions } from "./../constants/constants";

const $q = useQuasar();
const router = useRouter();
const paginationSizeStore = usePaginationSizeStore();

const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);
const platformsMap = ref(new Map<string, Platform>());
const tagsMap = ref(new Map<string, Tag>());

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
    sortable: false,
  },
  {
    name: "releaseDate",
    align: "left",
    label: "Release Date",
    field: "releaseDate",
    sortable: true,
    format: (val: number) => (val ? new Date(val).toLocaleDateString() : "-"),
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

function applyOrdering(docList: Game[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  } else if (sortBy === "releaseDate") {
    docList.sort((a, b) => {
      const aDate = a.releaseDate || 0;
      const bDate = b.releaseDate || 0;
      return (bDate - aDate) * (descending ? -1 : 1);
    });
  } else if (sortBy === "isRetroGame") {
    docList.sort((a, b) => {
      return (a.isRetroGame ? 1 : 0) - (b.isRetroGame ? 1 : 0) * (descending ? -1 : 1);
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

async function dataForTableRequested(props: any) {
  let inputPagination = props?.pagination || pagination.value;

  const { page, rowsPerPage, sortBy, descending } = inputPagination;
  paginationSizeStore.setPaginationSize(rowsPerPage);

  isLoading.value = true;

  const skip = (page - 1) * rowsPerPage;
  const limit = rowsPerPage;

  let docList = await gameService.listGames();
  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.name));
  }

  applyOrdering(docList, sortBy, descending);

  let totalRowCount = docList.length;
  let currentRows = docList.slice(skip, skip + limit);
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

<style scoped lang="scss"></style>

