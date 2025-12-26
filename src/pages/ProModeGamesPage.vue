<template>
  <q-page class="column items-center justify-evenly" style="padding: 0px">
    <!-- Desktop Only Notice -->
    <q-card class="std-card desktop-only-notice" v-if="!$q.screen.gt.sm">
      <div class="q-pa-lg text-center">
        <q-icon name="desktop_windows" size="64px" color="orange" />
        <div class="text-h6 q-mt-md">Desktop Only Feature</div>
        <div class="q-mt-sm text-grey-7">
          Pro Mode is designed for desktop use and requires a larger screen. Please switch to a desktop or tablet device to access this feature.
        </div>
      </div>
    </q-card>

    <!-- Pro Mode Content -->
    <div v-else class="pro-mode-container">
      <!-- Spreadsheet -->
      <q-card class="std-card pro-mode-table-card">
        <!-- Header - Start -->
        <div class="title-row q-pa-md q-gutter-sm">
          <q-select
            v-model="pageSize"
            :options="[25, 50, 100, 200]"
            label="Rows per page"
            dense
            outlined
            style="min-width: 200px"
            @update:model-value="handlePageSizeChange"
          />
          <div class="spacer"></div>
          <q-btn color="secondary" icon="refresh" :label="hasUnsavedChanges ? 'Discard Changes' : 'Reload'" @click="loadData" :disable="isLoading" />
          <q-btn color="secondary" icon="add" label="Add New Game" @click="addNewGame" />
          <q-btn color="positive" icon="save" label="Save Changes" @click="saveAllChanges" :disable="!hasUnsavedChanges" :loading="isSaving" />

          <q-chip v-if="hasUnsavedChanges" color="orange" text-color="white" icon="edit">
            {{ changedGames.size }} edit{{ changedGames.size !== 1 ? "s" : ""
            }}{{ deletedGames.size > 0 ? ", " + deletedGames.size + " deletion" + (deletedGames.size !== 1 ? "s" : "") : "" }}
          </q-chip>
        </div>
        <!-- Header - End -->

        <div class="q-pa-md">
          <loading-indicator :is-loading="isLoading" :phases="2" ref="loadingIndicator"></loading-indicator>

          <div v-if="!isLoading" class="pro-mode-table-container">
            <table class="pro-mode-table">
              <thead>
                <tr>
                  <th class="row-status-col">Status</th>
                  <th class="name-col">Name</th>
                  <th class="platforms-col">Platforms</th>
                  <th class="release-date-col">Release Date</th>
                  <th class="retro-col">Retro</th>
                  <th class="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(game, index) in games"
                  :key="game._id"
                  :class="{
                    'row-changed': isRowChanged(game._id!),
                    'row-deleted': isRowDeleted(game._id!),
                    'row-even': index % 2 === 0,
                    'row-odd': index % 2 === 1,
                  }"
                >
                  <!-- Status Column -->
                  <td class="row-status-col">
                    <q-icon v-if="isRowDeleted(game._id!)" name="delete" color="red" size="16px" title="Row marked for deletion" />
                    <q-icon v-else-if="isRowChanged(game._id!)" name="edit" color="orange" size="16px" title="Row has unsaved changes" />
                  </td>

                  <!-- Name Column -->
                  <td class="name-col">
                    <input
                      type="text"
                      :value="game.name"
                      @input="updateField(game._id!, 'name', ($event.target as HTMLInputElement).value)"
                      class="cell-input text-input"
                    />
                  </td>

                  <!-- Platforms Column -->
                  <td class="platforms-col">
                    <select
                      multiple
                      :value="game.platformIdList || []"
                      @change="updatePlatforms(game._id!, Array.from(($event.target as HTMLSelectElement).selectedOptions).map((opt) => opt.value))"
                      class="cell-input select-input"
                      style="min-height: 60px"
                    >
                      <option v-for="platform in platforms" :key="platform._id" :value="platform._id">{{ platform.name }}</option>
                    </select>
                  </td>

                  <!-- Release Date Column -->
                  <td class="release-date-col">
                    <input
                      type="date"
                      :value="formatDateForInput(game.releaseDate)"
                      @input="updateReleaseDate(game._id!, ($event.target as HTMLInputElement).value)"
                      class="cell-input date-input"
                    />
                  </td>

                  <!-- Retro Column -->
                  <td class="retro-col">
                    <input
                      type="checkbox"
                      :checked="game.isRetroGame"
                      @change="updateField(game._id!, 'isRetroGame', ($event.target as HTMLInputElement).checked)"
                      class="cell-input checkbox-input"
                    />
                  </td>

                  <!-- Actions Column -->
                  <td class="actions-col">
                    <q-btn
                      size="sm"
                      color="negative"
                      icon="delete"
                      round
                      @click="markForDeletion(game._id!)"
                      :disable="isRowDeleted(game._id!)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination -->
            <div class="q-pa-md flex flex-center">
              <q-pagination v-model="currentPage" :max="totalPages" input />
            </div>
          </div>
        </div>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { ref, computed, onMounted, Ref } from "vue";
import { Game } from "src/models/game";
import { Platform } from "src/models/platform";
import { gameService } from "src/services/game-service";
import { platformService } from "src/services/platform-service";
import { dialogService } from "src/services/dialog-service";
import { deepClone } from "src/utils/misc-utils";
import LoadingIndicator from "src/components/LoadingIndicator.vue";
import AddGame from "src/components/AddGame.vue";

const $q = useQuasar();

// ----- Refs
const isLoading = ref(false);
const isSaving = ref(false);
const loadingIndicator = ref<InstanceType<typeof LoadingIndicator>>();

const games: Ref<Game[]> = ref([]);
const originalGames: Ref<Map<string, Game>> = ref(new Map());
const changedGames: Ref<Map<string, Game>> = ref(new Map());
const deletedGames: Ref<Set<string>> = ref(new Set<string>());

const platforms: Ref<Platform[]> = ref([]);

// Pagination
const currentPage = ref(1);
const pageSize = ref(50);
const totalGames = ref(0);
const totalPages = computed(() => Math.ceil(totalGames.value / pageSize.value));

// ----- Computed
const hasUnsavedChanges = computed(() => changedGames.value.size > 0 || deletedGames.value.size > 0);

// ----- Functions
function formatDateForInput(epoch?: number): string {
  if (!epoch) return "";
  const date = new Date(epoch);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function loadData() {
  isLoading.value = true;

  try {
    loadingIndicator.value?.startPhase({ phase: 1, weight: 50, label: "Loading games" });

    const allGames = await gameService.listGames();
    allGames.sort((a, b) => a.name.localeCompare(b.name));

    totalGames.value = allGames.length;

    // Load platforms
    platforms.value = await platformService.listPlatforms();
    platforms.value.sort((a, b) => a.name.localeCompare(b.name));

    loadingIndicator.value?.startPhase({ phase: 2, weight: 50, label: "Preparing view" });

    // Calculate pagination
    const startIndex = (currentPage.value - 1) * pageSize.value;
    const endIndex = Math.min(startIndex + pageSize.value, allGames.length);
    const pageGames = allGames.slice(startIndex, endIndex);

    // Preserve changes: replace fresh games with modified versions if they exist
    const finalGames = pageGames.map((game) => {
      if (game._id && changedGames.value.has(game._id)) {
        return changedGames.value.get(game._id)!;
      }
      return game;
    });

    games.value = finalGames;

    // Store original copies for change tracking (only for games we haven't seen before)
    pageGames.forEach((game) => {
      if (game._id && !originalGames.value.has(game._id)) {
        originalGames.value.set(game._id, deepClone(game));
      }
    });
  } catch (error) {
    console.error("Error loading data:", error);
    await dialogService.alert("Error", "Failed to load data for Pro Mode.");
  } finally {
    isLoading.value = false;
  }
}

async function loadCurrentPage() {
  await loadData();
}

function handlePageSizeChange() {
  currentPage.value = 1;
  loadCurrentPage();
}

function isRowChanged(gameId: string): boolean {
  return changedGames.value.has(gameId);
}

function isRowDeleted(gameId: string): boolean {
  return deletedGames.value.has(gameId);
}

function markRecordChanged(gameId: string) {
  const game = games.value.find((g) => g._id === gameId);
  if (!game || !game._id) return;

  const original = originalGames.value.get(game._id);
  if (!original) return;

  // Check if game has actually changed
  const hasChanged =
    game.name !== original.name ||
    JSON.stringify(game.platformIdList || []) !== JSON.stringify(original.platformIdList || []) ||
    game.releaseDate !== original.releaseDate ||
    game.isRetroGame !== original.isRetroGame;

  if (hasChanged) {
    changedGames.value.set(game._id, deepClone(game));
  } else {
    changedGames.value.delete(game._id);
  }
}

function updateField(gameId: string, field: string, value: any) {
  const game = games.value.find((g) => g._id === gameId);
  if (!game) return;

  (game as any)[field] = value;
  markRecordChanged(gameId);
}

function updatePlatforms(gameId: string, platformIds: string[]) {
  const game = games.value.find((g) => g._id === gameId);
  if (!game) return;

  game.platformIdList = platformIds;
  markRecordChanged(gameId);
}

function updateReleaseDate(gameId: string, value: string) {
  const game = games.value.find((g) => g._id === gameId);
  if (!game) return;

  if (value) {
    game.releaseDate = new Date(value).getTime();
  } else {
    game.releaseDate = undefined;
  }
  markRecordChanged(gameId);
}

function markForDeletion(gameId: string) {
  deletedGames.value.add(gameId);
  changedGames.value.delete(gameId);
}

async function saveAllChanges() {
  isSaving.value = true;

  try {
    // Save changed games
    for (const [gameId, game] of changedGames.value.entries()) {
      await gameService.saveGame(game);
      originalGames.value.set(gameId, deepClone(game));
    }

    // Delete games
    for (const gameId of deletedGames.value) {
      const game = games.value.find((g) => g._id === gameId);
      if (game) {
        await gameService.deleteGame(game);
      }
    }

    // Clear tracking
    changedGames.value.clear();
    deletedGames.value.clear();

    await dialogService.notify("Changes saved successfully", "positive");
    await loadData();
  } catch (error) {
    console.error("Error saving changes:", error);
    await dialogService.alert("Error", "Failed to save changes.");
  } finally {
    isSaving.value = false;
  }
}

async function addNewGame() {
  $q.dialog({ component: AddGame }).onOk(() => {
    loadData();
  });
}

// Watch pagination
watch(currentPage, () => {
  loadCurrentPage();
});

// Initial load
onMounted(() => {
  loadData();
});
</script>

<script lang="ts">
import { watch } from "vue";
</script>

<style scoped lang="scss">
.pro-mode-container {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

.pro-mode-table-card {
  width: 100%;
}

.pro-mode-table-container {
  overflow-x: auto;
  width: 100%;
}

.pro-mode-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 4px;
    border: 1px solid #ddd;
    text-align: left;
  }

  th {
    background-color: #f5f5f5;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .row-status-col {
    width: 50px;
  }

  .name-col {
    min-width: 200px;
  }

  .platforms-col {
    min-width: 150px;
  }

  .release-date-col {
    width: 120px;
  }

  .retro-col {
    width: 60px;
    text-align: center;
  }

  .actions-col {
    width: 80px;
  }

  .row-changed {
    background-color: #fff3cd;
  }

  .row-deleted {
    background-color: #f8d7da;
    opacity: 0.6;
  }

  .row-even {
    background-color: #ffffff;
  }

  .row-odd {
    background-color: #f9f9f9;
  }
}

.cell-input {
  width: 100%;
  padding: 4px;
  border: 1px solid #ccc;
  border-radius: 2px;
  font-size: 12px;

  &:focus {
    outline: 2px solid #1976d2;
    border-color: #1976d2;
  }
}

.text-input {
  min-width: 150px;
}

.date-input {
  width: 100%;
}

.select-input {
  width: 100%;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}
</style>

