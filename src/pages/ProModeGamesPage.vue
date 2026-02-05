<template>
  <q-page class="pro-mode-page">
    <!-- Small screen: show message with link to games list -->
    <q-card v-if="!$q.screen.gt.sm" class="pro-mode-mobile-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="table_chart" size="64px" color="primary" />
        <div class="text-h6 q-mt-md">Pro Mode</div>
        <p class="text-body2 text-grey-7 q-mt-sm">
          Bulk-edit your library on a larger screen for the best experience. Use the Games list on this device to edit one game at a time.
        </p>
        <q-btn flat color="primary" label="Go to Games" to="/games" class="q-mt-md" />
      </q-card-section>
    </q-card>

    <div v-else class="pro-mode-container">
      <q-card class="pro-mode-card">
        <!-- Toolbar -->
        <div class="pro-mode-toolbar q-pa-md row items-center q-gutter-md">
          <q-input
            v-model="searchFilter"
            outlined
            dense
            clearable
            placeholder="Search by name..."
            class="pro-mode-search"
            style="min-width: 220px"
            @update:model-value="onSearchOrPageChange"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-select
            v-model="pageSize"
            :options="pageSizeOptions"
            label="Rows"
            dense
            outlined
            emit-value
            map-options
            option-value="value"
            option-label="label"
            style="min-width: 100px"
            @update:model-value="onPageSizeChange"
          />

          <q-space />

          <q-btn flat round dense icon="refresh" color="grey-8" :disable="isLoading" @click="confirmReload">
            <q-tooltip>Reload</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="add" color="primary" @click="addNewGame">
            <q-tooltip>Add game</q-tooltip>
          </q-btn>
          <q-btn unelevated color="positive" icon="save" label="Save" :disable="!hasUnsavedChanges" :loading="isSaving" @click="confirmSave" />

          <q-chip v-if="hasUnsavedChanges" color="orange" text-color="white" size="sm" icon="edit">
            {{ changedGames.size }} changed{{ deletedGames.size > 0 ? `, ${deletedGames.size} deleted` : "" }}
          </q-chip>
        </div>

        <q-separator />

        <div class="pro-mode-table-wrap">
          <loading-indicator :is-loading="isLoading" :phases="2" ref="loadingIndicator" />

          <q-table
            v-if="!isLoading"
            flat
            bordered
            dense
            :rows="paginatedRows"
            :columns="columns"
            row-key="_id"
            :rows-per-page-options="[0]"
            hide-pagination
            class="pro-mode-table"
            :class="{ 'table-has-changes': hasUnsavedChanges }"
            :row-class="getRowClass"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props" class="status-cell">
                <q-icon v-if="isRowDeleted(props.row._id!)" name="delete_forever" color="negative" size="20px">
                  <q-tooltip>Marked for deletion</q-tooltip>
                </q-icon>
                <q-icon v-else-if="isRowChanged(props.row._id!)" name="edit" color="orange" size="20px">
                  <q-tooltip>Unsaved changes</q-tooltip>
                </q-icon>
                <span v-else class="text-grey-4">—</span>
              </q-td>
            </template>

            <template v-slot:body-cell-name="props">
              <q-td :props="props" class="name-cell">
                <q-input
                  :model-value="props.row.name"
                  dense
                  outlined
                  borderless
                  class="cell-input"
                  @update:model-value="(v: string) => updateField(props.row._id!, 'name', v)"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-platforms="props">
              <q-td :props="props" class="platforms-cell">
                <q-select
                  :model-value="props.row.platformIdList || []"
                  :options="platformOptions"
                  dense
                  outlined
                  multiple
                  use-chips
                  emit-value
                  map-options
                  option-value="_id"
                  option-label="name"
                  borderless
                  class="cell-input"
                  @update:model-value="(v: string[]) => updatePlatforms(props.row._id!, v)"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-ownership="props">
              <q-td :props="props" class="ownership-cell">
                <template v-if="getPlatformCount(props.row) === 1">
                  <q-select
                    :model-value="getOwnershipForPlatform(props.row, getFirstPlatformId(props.row))"
                    :options="ownershipTypeOptions"
                    dense
                    outlined
                    borderless
                    emit-value
                    map-options
                    option-value="value"
                    option-label="label"
                    class="cell-input"
                    @update:model-value="(v: GameOwnershipEntry['ownershipType']) => updateOwnership(props.row._id!, getFirstPlatformId(props.row)!, v)"
                  />
                </template>
                <template v-else-if="getPlatformCount(props.row) > 1">
                  <div class="cell-popup-icon">
                    <q-btn flat dense round size="sm" icon="open_in_new" color="primary" @click="openPlatformDetailsDialog(props.row)">
                      <q-tooltip>Edit ownership & status per platform</q-tooltip>
                    </q-btn>
                  </div>
                </template>
                <span v-else class="text-grey-6">—</span>
              </q-td>
            </template>

            <template v-slot:body-cell-completionStatus="props">
              <q-td :props="props" class="status-platform-cell">
                <template v-if="getPlatformCount(props.row) === 1">
                  <q-select
                    :model-value="getStatusForPlatform(props.row, getFirstPlatformId(props.row))"
                    :options="statusOptionsWithEmpty"
                    dense
                    outlined
                    borderless
                    emit-value
                    map-options
                    option-value="value"
                    option-label="label"
                    class="cell-input"
                    clearable
                    @update:model-value="(v: GameStatus | null) => updateStatus(props.row._id!, getFirstPlatformId(props.row)!, v)"
                  />
                </template>
                <template v-else-if="getPlatformCount(props.row) > 1">
                  <div class="cell-popup-icon">
                    <q-btn flat dense round size="sm" icon="open_in_new" color="primary" @click="openPlatformDetailsDialog(props.row)">
                      <q-tooltip>Edit ownership & status per platform</q-tooltip>
                    </q-btn>
                  </div>
                </template>
                <span v-else class="text-grey-6">—</span>
              </q-td>
            </template>

            <template v-slot:body-cell-releaseDate="props">
              <q-td :props="props" class="date-cell">
                <q-input
                  :model-value="formatDateForInput(props.row.releaseDate)"
                  type="date"
                  dense
                  outlined
                  borderless
                  class="cell-input"
                  @update:model-value="(v: string) => updateReleaseDate(props.row._id!, v)"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-rating="props">
              <q-td :props="props" class="rating-cell">
                <q-input
                  :model-value="props.row.rating != null ? String(props.row.rating) : ''"
                  type="number"
                  dense
                  outlined
                  borderless
                  class="cell-input rating-input"
                  min="0"
                  max="10"
                  step="0.5"
                  placeholder="—"
                  @update:model-value="(v: string) => updateRating(props.row._id!, v)"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-tags="props">
              <q-td :props="props" class="tags-cell">
                <q-select
                  :model-value="props.row.tagIdList || []"
                  :options="tagOptions"
                  dense
                  outlined
                  multiple
                  use-chips
                  emit-value
                  map-options
                  option-value="_id"
                  option-label="name"
                  borderless
                  class="cell-input"
                  @update:model-value="(v: string[]) => updateTags(props.row._id!, v)"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-howLongToBeat="props">
              <q-td :props="props" class="hltb-cell">
                <q-input
                  :model-value="props.row.howLongToBeat != null ? String(props.row.howLongToBeat) : ''"
                  type="number"
                  dense
                  outlined
                  borderless
                  class="cell-input"
                  min="0"
                  step="0.5"
                  placeholder="—"
                  @update:model-value="(v: string) => updateHowLongToBeat(props.row._id!, v)"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-untrackedPlaytimeHours="props">
              <q-td :props="props" class="untracked-cell">
                <q-input
                  :model-value="formatUntrackedHours(props.row.untrackedPlaytime)"
                  type="number"
                  dense
                  outlined
                  borderless
                  class="cell-input"
                  min="0"
                  step="0.5"
                  placeholder="—"
                  @update:model-value="(v: string) => updateUntrackedPlaytime(props.row._id!, v)"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-isRetroGame="props">
              <q-td :props="props" class="retro-cell">
                <q-checkbox :model-value="!!props.row.isRetroGame" dense @update:model-value="(v: boolean) => updateField(props.row._id!, 'isRetroGame', v)" />
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="actions-cell">
                <q-btn
                  v-if="!isRowDeleted(props.row._id!)"
                  flat
                  dense
                  size="sm"
                  icon="visibility"
                  color="primary"
                  round
                  :to="{ name: 'game', params: { gameId: props.row._id } }"
                >
                  <q-tooltip>View game</q-tooltip>
                </q-btn>
                <q-btn v-if="isRowDeleted(props.row._id!)" flat dense size="sm" icon="undo" color="primary" round @click="unmarkDeletion(props.row._id!)">
                  <q-tooltip>Undo delete</q-tooltip>
                </q-btn>
                <q-btn v-else flat dense size="sm" icon="delete" color="negative" round @click="markForDeletion(props.row._id!)">
                  <q-tooltip>Mark for deletion</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </div>

        <!-- Pagination -->
        <q-separator />
        <div class="row items-center justify-center q-pa-md q-gutter-sm">
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            :max-pages="7"
            direction-links
            boundary-links
            color="primary"
            @update:model-value="loadCurrentPage"
          />
          <span class="text-caption text-grey-7">
            {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filteredGames.length) }} of {{ filteredGames.length }}
          </span>
        </div>
      </q-card>

      <!-- Combined popup: Ownership & Status per platform (multi-platform rows) -->
      <q-dialog v-model="platformDetailsDialogOpen" position="standard" class="platform-details-dialog">
        <q-card style="min-width: 420px; max-width: 560px">
          <q-card-section>
            <div class="text-h6 q-mb-md">{{ platformDetailsGame?.name }} — Ownership &amp; Status</div>
            <div class="q-gutter-md">
              <div v-for="(row, index) in platformDetailsRows" :key="row.platformId" class="row q-col-gutter-sm items-center">
                <div class="col-12 col-sm-4 text-weight-medium">{{ row.platformName }}</div>
                <div class="col-6 col-sm-4">
                  <q-select
                    v-model="platformDetailsRows[index].ownershipType"
                    :options="ownershipTypeOptions"
                    dense
                    outlined
                    emit-value
                    map-options
                    option-value="value"
                    option-label="label"
                    label="Ownership"
                  />
                </div>
                <div class="col-6 col-sm-4">
                  <q-select
                    v-model="platformDetailsRows[index].status"
                    :options="statusOptionsWithEmpty"
                    dense
                    outlined
                    emit-value
                    map-options
                    option-value="value"
                    option-label="label"
                    label="Status"
                    clearable
                  />
                </div>
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="grey-7" @click="platformDetailsDialogOpen = false" />
            <q-btn unelevated label="Save" color="primary" @click="savePlatformDetailsDialog" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { ref, computed, onMounted, watch } from "vue";
import { QTableColumn } from "quasar";
import { Game, GameOwnershipEntry, GameUntrackedHistoryEntry } from "src/models/game";
import type { GameStatus } from "src/models/game-status";
import { Platform } from "src/models/platform";
import { Tag } from "src/models/tag";
import { gameService } from "src/services/game-service";
import { platformService } from "src/services/platform-service";
import { tagService } from "src/services/tag-service";
import { dialogService } from "src/services/dialog-service";
import { deepClone } from "src/utils/misc-utils";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import AddGame from "src/components/AddGame.vue";

const $q = useQuasar();

const isLoading = ref(false);
const isSaving = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const allGames = ref<Game[]>([]);
const originalGames = ref(new Map<string, Game>());
const changedGames = ref(new Map<string, Game>());
const deletedGames = ref(new Set<string>());

const platforms = ref<Platform[]>([]);
const tags = ref<Tag[]>([]);

const searchFilter = ref("");
const currentPage = ref(1);
const pageSize = ref(50);

// Combined popup for ownership & status when multiple platforms
const platformDetailsDialogOpen = ref(false);
const platformDetailsGame = ref<Game | null>(null);
const platformDetailsRows = ref<{ platformId: string; platformName: string; ownershipType: GameOwnershipEntry["ownershipType"]; status: GameStatus | null }[]>(
  []
);

const pageSizeOptions = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
];

const ownershipTypeOptions: { label: string; value: GameOwnershipEntry["ownershipType"] }[] = [
  { label: "Owned", value: "owned" },
  { label: "Borrowed", value: "borrowed" },
  { label: "Rented", value: "rented" },
  { label: "Gifted", value: "gifted" },
  { label: "Other", value: "other" },
];

const statusOptions: { label: string; value: GameStatus }[] = [
  { label: "Completed", value: "completed" },
  { label: "In Progress", value: "in-progress" },
  { label: "On Hold", value: "on-hold" },
  { label: "Dropped", value: "dropped" },
];

const statusOptionsWithEmpty: { label: string; value: GameStatus | null }[] = [{ label: "—", value: null }, ...statusOptions];

const columns: QTableColumn[] = [
  { name: "status", label: "", field: "_id", align: "center", style: "width: 48px" },
  { name: "name", label: "Name", field: "name", align: "left", sortable: true },
  { name: "platforms", label: "Platforms", field: "platformIdList", align: "left", style: "width: 100px" },
  { name: "ownership", label: "Ownership", field: "ownershipList", align: "left", style: "width: 120px" },
  { name: "completionStatus", label: "Status", field: "untrackedHistoryList", align: "left", style: "width: 120px" },
  { name: "untrackedPlaytimeHours", label: "Untracked (h)", field: "untrackedPlaytime", align: "center", style: "width: 80px" },
  { name: "rating", label: "Rating", field: "rating", align: "center", style: "width: 96px" },
  { name: "tags", label: "Tags", field: "tagIdList", align: "left", style: "width: 100px" },
  { name: "releaseDate", label: "Release", field: "releaseDate", align: "left" },
  { name: "howLongToBeat", label: "HLTB (h)", field: "howLongToBeat", align: "center", style: "width: 72px" },
  { name: "isRetroGame", label: "Retro", field: "isRetroGame", align: "center" },
  { name: "actions", label: "", field: "_id", align: "center", style: "width: 90px" },
];

const hasUnsavedChanges = computed(() => changedGames.value.size > 0 || deletedGames.value.size > 0);

const filteredGames = computed(() => {
  let list = allGames.value;
  const q = (searchFilter.value || "").trim().toLowerCase();
  if (q) {
    list = list.filter((g) => g.name.toLowerCase().includes(q));
  }
  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredGames.value.length / pageSize.value)));

const paginatedRows = computed(() => {
  const list = filteredGames.value;
  const start = (currentPage.value - 1) * pageSize.value;
  const page = list.slice(start, start + pageSize.value);
  return page.map((game) => {
    if (game._id && changedGames.value.has(game._id)) {
      return changedGames.value.get(game._id)!;
    }
    return game;
  });
});

const platformOptions = computed(() => platforms.value.map((p) => ({ _id: p._id!, name: p.name })));
const tagOptions = computed(() => tags.value.map((t) => ({ _id: t._id!, name: t.name })));

function formatDateForInput(epoch?: number): string {
  if (epoch == null) return "";
  const d = new Date(epoch);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function formatUntrackedHours(ms?: number): string {
  if (ms == null || ms <= 0) return "";
  return (ms / (1000 * 60 * 60)).toFixed(1);
}

function isRowChanged(gameId: string): boolean {
  return changedGames.value.has(gameId);
}

function isRowDeleted(gameId: string): boolean {
  return deletedGames.value.has(gameId);
}

function markRecordChanged(gameId: string) {
  const game = allGames.value.find((g) => g._id === gameId);
  if (!game?._id) return;
  const fromPage = paginatedRows.value.find((g) => g._id === gameId);
  const current = fromPage ? { ...fromPage } : game;
  const original = originalGames.value.get(gameId);
  if (!original) return;

  const changed =
    current.name !== original.name ||
    JSON.stringify(current.platformIdList || []) !== JSON.stringify(original.platformIdList || []) ||
    JSON.stringify(current.ownershipList || []) !== JSON.stringify(original.ownershipList || []) ||
    JSON.stringify(current.untrackedHistoryList || []) !== JSON.stringify(original.untrackedHistoryList || []) ||
    current.releaseDate !== original.releaseDate ||
    current.isRetroGame !== original.isRetroGame ||
    current.rating !== original.rating ||
    JSON.stringify(current.tagIdList || []) !== JSON.stringify(original.tagIdList || []) ||
    current.howLongToBeat !== original.howLongToBeat ||
    current.untrackedPlaytime !== original.untrackedPlaytime;

  if (changed) {
    changedGames.value.set(gameId, deepClone(current));
  } else {
    changedGames.value.delete(gameId);
  }
}

function getRow(gameId: string): Game | undefined {
  return paginatedRows.value.find((g) => g._id === gameId) ?? allGames.value.find((g) => g._id === gameId);
}

function updateField(gameId: string, field: string, value: unknown) {
  const target = getRow(gameId);
  if (!target) return;
  (target as Record<string, unknown>)[field] = value;
  markRecordChanged(gameId);
}

function updatePlatforms(gameId: string, platformIds: string[]) {
  const target = getRow(gameId);
  if (!target) return;
  target.platformIdList = platformIds;
  // Keep ownershipList in sync so Add Game and Single Game page show the same platforms
  const existingByPlatform = new Map((target.ownershipList ?? []).map((e) => [e.platformId, e.ownershipType]));
  target.ownershipList = platformIds.map(
    (platformId): GameOwnershipEntry => ({
      platformId,
      ownershipType: existingByPlatform.get(platformId) ?? "owned",
    })
  );
  // Keep untrackedHistoryList in sync: keep entries for platforms still in list
  if (target.untrackedHistoryList?.length) {
    const platformSet = new Set(platformIds);
    target.untrackedHistoryList = target.untrackedHistoryList.filter((u) => platformSet.has(u.platformId));
    if (target.untrackedHistoryList.length === 0) target.untrackedHistoryList = undefined;
  }
  markRecordChanged(gameId);
}

function getPlatformCount(row: Game): number {
  return row.platformIdList?.length ?? 0;
}

function getFirstPlatformId(row: Game): string | null {
  const list = row.platformIdList;
  return list?.length ? list[0] : null;
}

function getOwnershipForPlatform(row: Game, platformId: string | null): GameOwnershipEntry["ownershipType"] | null {
  if (!platformId) return null;
  const entry = row.ownershipList?.find((e) => e.platformId === platformId);
  return entry?.ownershipType ?? "owned";
}

function getStatusForPlatform(row: Game, platformId: string | null): GameStatus | null {
  if (!platformId) return null;
  const entry = row.untrackedHistoryList?.find((u) => u.platformId === platformId);
  return entry?.status ?? null;
}

function updateOwnership(gameId: string, platformId: string, value: GameOwnershipEntry["ownershipType"]) {
  const target = getRow(gameId);
  if (!target) return;
  const list = target.ownershipList ?? [];
  const idx = list.findIndex((e) => e.platformId === platformId);
  if (idx >= 0) {
    list[idx].ownershipType = value;
  } else {
    list.push({ platformId, ownershipType: value });
  }
  target.ownershipList = list;
  markRecordChanged(gameId);
}

function updateStatus(gameId: string, platformId: string, value: GameStatus | null) {
  const target = getRow(gameId);
  if (!target) return;
  let list = target.untrackedHistoryList ?? [];
  const idx = list.findIndex((u) => u.platformId === platformId);
  if (value != null && value !== "") {
    const entry: GameUntrackedHistoryEntry = { platformId, status: value };
    if (idx >= 0) {
      list[idx] = { ...list[idx], status: value };
    } else {
      list = [...list, entry];
    }
    target.untrackedHistoryList = list;
  } else if (idx >= 0) {
    list = list.filter((_, i) => i !== idx);
    target.untrackedHistoryList = list.length ? list : undefined;
  }
  markRecordChanged(gameId);
}

function updateReleaseDate(gameId: string, value: string) {
  const target = getRow(gameId);
  if (!target) return;
  target.releaseDate = value ? new Date(value).getTime() : undefined;
  markRecordChanged(gameId);
}

function updateRating(gameId: string, value: string) {
  const target = getRow(gameId);
  if (!target) return;
  const num = value === "" ? null : parseFloat(value);
  target.rating = num === null || isNaN(num) ? null : num;
  markRecordChanged(gameId);
}

function updateTags(gameId: string, tagIds: string[]) {
  const target = getRow(gameId);
  if (!target) return;
  target.tagIdList = tagIds.length ? tagIds : undefined;
  markRecordChanged(gameId);
}

function updateHowLongToBeat(gameId: string, value: string) {
  const target = getRow(gameId);
  if (!target) return;
  const num = value === "" ? undefined : parseFloat(value);
  target.howLongToBeat = num != null && !isNaN(num) && num > 0 ? num : undefined;
  markRecordChanged(gameId);
}

function updateUntrackedPlaytime(gameId: string, value: string) {
  const target = getRow(gameId);
  if (!target) return;
  const num = value === "" ? undefined : parseFloat(value);
  target.untrackedPlaytime = num != null && !isNaN(num) && num >= 0 ? Math.round(num * 1000 * 60 * 60) : undefined;
  markRecordChanged(gameId);
}

function markForDeletion(gameId: string) {
  deletedGames.value.add(gameId);
  changedGames.value.delete(gameId);
}

function unmarkDeletion(gameId: string) {
  deletedGames.value.delete(gameId);
}

function getRowClass(row: Game): string {
  if (!row._id) return "";
  if (isRowDeleted(row._id)) return "row-deleted";
  if (isRowChanged(row._id)) return "row-changed";
  return "";
}

function onSearchOrPageChange() {
  currentPage.value = 1;
  loadCurrentPage();
}

function onPageSizeChange() {
  currentPage.value = 1;
  loadCurrentPage();
}

async function loadData() {
  isLoading.value = true;
  try {
    loadingIndicator.value?.startPhase({ phase: 1, weight: 60, label: "Loading games" });
    const games = await gameService.listGames();
    games.sort((a, b) => a.name.localeCompare(b.name));
    allGames.value = games;

    loadingIndicator.value?.startPhase({ phase: 2, weight: 40, label: "Loading platforms & tags" });
    const [platformList, tagList] = await Promise.all([platformService.listPlatforms(), tagService.listTags()]);
    platforms.value = platformList.sort((a, b) => a.name.localeCompare(b.name));
    tags.value = tagList.sort((a, b) => a.name.localeCompare(b.name));

    games.forEach((g) => {
      if (g._id && !originalGames.value.has(g._id)) {
        originalGames.value.set(g._id, deepClone(g));
      }
    });
  } catch (e) {
    console.error(e);
    await dialogService.alert("Error", "Failed to load Pro Mode data.");
  } finally {
    isLoading.value = false;
  }
}

function loadCurrentPage() {
  currentPage.value = Math.min(currentPage.value, totalPages.value);
}

async function confirmReload() {
  if (!hasUnsavedChanges.value) {
    await loadData();
    return;
  }
  const ok = await dialogService.confirm("Discard changes?", "You have unsaved changes. Reloading will discard them.");
  if (ok) {
    changedGames.value.clear();
    deletedGames.value.clear();
    await loadData();
  }
}

async function confirmSave() {
  if (deletedGames.value.size > 0) {
    const ok = await dialogService.confirm("Save and delete?", `${deletedGames.value.size} game(s) will be permanently deleted. Continue?`);
    if (!ok) return;
  }
  await saveAllChanges();
}

async function saveAllChanges() {
  isSaving.value = true;
  try {
    for (const [, game] of changedGames.value) {
      await gameService.saveGame(game);
      if (game._id) originalGames.value.set(game._id, deepClone(game));
    }
    for (const gameId of deletedGames.value) {
      const game = allGames.value.find((g) => g._id === gameId);
      if (game) await gameService.deleteGame(game);
    }
    changedGames.value.clear();
    deletedGames.value.clear();
    await dialogService.notify("Changes saved", "positive");
    await loadData();
  } catch (e) {
    console.error(e);
    await dialogService.alert("Error", "Failed to save changes.");
  } finally {
    isSaving.value = false;
  }
}

function getPlatformNameById(platformId: string): string {
  return platforms.value.find((p) => p._id === platformId)?.name ?? platformId;
}

function openPlatformDetailsDialog(game: Game) {
  const platformIds = game.platformIdList ?? [];
  if (platformIds.length === 0) return;
  platformDetailsGame.value = getRow(game._id!) ?? game;
  platformDetailsRows.value = platformIds.map((platformId) => {
    const ownership = platformDetailsGame.value?.ownershipList?.find((e) => e.platformId === platformId);
    const untracked = platformDetailsGame.value?.untrackedHistoryList?.find((u) => u.platformId === platformId);
    return {
      platformId,
      platformName: getPlatformNameById(platformId),
      ownershipType: ownership?.ownershipType ?? "owned",
      status: untracked?.status ?? null,
    };
  });
  platformDetailsDialogOpen.value = true;
}

function savePlatformDetailsDialog() {
  const game = platformDetailsGame.value;
  if (!game?._id) return;
  const target = getRow(game._id);
  if (!target) return;
  target.ownershipList = platformDetailsRows.value.map((r) => ({
    platformId: r.platformId,
    ownershipType: r.ownershipType,
  }));
  target.untrackedHistoryList = platformDetailsRows.value
    .filter((r) => r.status != null && r.status !== "")
    .map((r) => ({
      platformId: r.platformId,
      status: r.status!,
      lastPlayedDate: target.untrackedHistoryList?.find((u) => u.platformId === r.platformId)?.lastPlayedDate,
    }));
  if (target.untrackedHistoryList.length === 0) target.untrackedHistoryList = undefined;
  markRecordChanged(game._id);
  platformDetailsDialogOpen.value = false;
  platformDetailsGame.value = null;
}

function addNewGame() {
  $q.dialog({ component: AddGame }).onOk(() => loadData());
}

watch(currentPage, () => loadCurrentPage());

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.pro-mode-page {
  min-height: 100%;
  padding: 16px;
}

.pro-mode-mobile-card {
  max-width: 480px;
  margin: 0 auto;
}

.pro-mode-container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

.pro-mode-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.pro-mode-toolbar {
  background: rgba(0, 0, 0, 0.02);
}

.pro-mode-search {
  max-width: 280px;
}

.pro-mode-table-wrap {
  position: relative;
  min-height: 200px;
  overflow-x: auto;
}

.pro-mode-table {
  font-size: 13px;

  :deep(thead th) {
    font-weight: 600;
    background: rgba(0, 0, 0, 0.04);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  :deep(tbody tr) {
    transition: background-color 0.15s ease;
  }

  :deep(tbody tr.row-changed) {
    background: rgba(255, 152, 0, 0.08);
  }

  :deep(tbody tr.row-deleted) {
    background: rgba(244, 67, 54, 0.08);
    opacity: 0.85;
  }
}

.table-has-changes :deep(tbody tr:hover) {
  background: rgba(0, 0, 0, 0.02);
}

.cell-input {
  font-size: 13px;

  :deep(.q-field__control) {
    min-height: 32px;
  }

  :deep(.q-field__control::before) {
    border-width: 1px;
  }
}

.rating-input {
  max-width: 88px;
}

.cell-popup-icon {
  display: flex;
  justify-content: center;
  align-items: center;
}

.status-cell {
  vertical-align: middle;
}

.actions-cell {
  white-space: nowrap;
}
</style>
