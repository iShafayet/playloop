<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingGameId ? "Editing a Game" : "Adding a Game" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="gameForm">
          <q-input filled v-model="gameName" label="Name of the Game" lazy-rules :rules="validators.name" />
          
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Platforms & Ownership</div>
            <div v-for="(pair, index) in platformOwnershipPairs" :key="index" class="q-mb-md">
              <q-card flat bordered class="q-pa-sm">
                <div class="row q-gutter-sm q-mb-sm">
                  <q-select
                    filled
                    v-model="pair.platformId"
                    :options="getAvailablePlatforms(pair.platformId)"
                    label="Platform"
                    emit-value
                    map-options
                    option-value="_id"
                    option-label="name"
                    :loading="isLoadingPlatforms"
                    class="col"
                    :rules="[(val) => !!val || 'Platform is required']"
                  />
                  <q-select
                    filled
                    v-model="pair.ownershipType"
                    :options="ownershipTypeOptions"
                    label="Ownership"
                    emit-value
                    map-options
                    class="col"
                    :rules="[(val) => !!val || 'Ownership is required']"
                  />
                  <q-btn
                    v-if="platformOwnershipPairs.length > 1"
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="removePlatformPair(index)"
                    class="q-mt-sm"
                  />
                </div>
              </q-card>
            </div>
            <q-btn
              flat
              dense
              label="Add another platform"
              icon="add"
              color="primary"
              @click="addPlatformPair"
              class="q-mt-sm"
            />
          </div>

          <q-input filled v-model="releaseDate" type="date" label="Release Date" />
          <q-input
            filled
            v-model="howLongToBeat"
            type="number"
            label="How Long to Beat (hours)"
            :min="0"
            :step="0.5"
            hint="Average time to complete the game"
          />
          <select-tag v-model="selectedTagIds" label="Tags" />
          
          <div>
            <div class="text-subtitle2 q-mb-sm">Rating</div>
            <div class="row items-center q-gutter-sm">
              <q-slider
                v-model="rating"
                :min="0"
                :max="10"
                :step="0.5"
                label
                :label-value="rating !== null ? rating.toFixed(1) : 'Not rated'"
                label-always
                color="primary"
                class="col"
              />
              <q-btn
                flat
                dense
                size="sm"
                label="clear"
                @click="rating = null"
                v-if="rating !== null"
                class="col-auto"
              />
            </div>
          </div>
          
          <q-toggle v-model="isRetroGame" label="Is Retro Game" color="green" left-label />
          
          <q-separator class="q-my-md" />
          
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Untracked Playtime</div>
            <div class="text-body2 text-grey-7 q-mb-sm">
              Total playtime (in hours) before you started tracking sessions. This will be added to your tracked playtime for accurate totals.
            </div>
            <q-input
              filled
              v-model="untrackedPlaytimeHours"
              type="number"
              label="Untracked Playtime (hours)"
              :min="0"
              :step="0.5"
              hint="Enter total hours played before tracking"
            />
          </div>
          
          <q-toggle 
            v-model="hasUntrackedHistory" 
            label="Had untracked history before starting to track" 
            color="primary" 
            left-label
          />
          
          <!-- Untracked History Section -->
          <div v-if="hasUntrackedHistory" class="q-mt-md">
            <div class="text-subtitle2 q-mb-sm">Untracked History</div>
            <div v-for="(pair, index) in platformOwnershipPairs" :key="`untracked-${index}`" class="q-mb-sm">
              <q-card v-if="pair.platformId" flat bordered class="q-pa-sm">
                <div class="text-body2 q-mb-sm text-weight-medium">
                  {{ getPlatformName(pair.platformId) }}
                </div>
                <div class="row q-gutter-sm">
                  <q-select
                    filled
                    v-model="pair.untrackedStatus"
                    :options="statusOptions"
                    label="Status"
                    emit-value
                    map-options
                    class="col"
                  />
                  <q-input
                    filled
                    v-model="pair.untrackedLastPlayedDate"
                    type="date"
                    label="Last Played Date"
                    class="col"
                  />
                </div>
              </q-card>
            </div>
            <div v-if="platformOwnershipPairs.filter(p => p.platformId).length === 0" class="text-body2 text-grey-6 q-pa-sm">
              Add at least one platform above to set untracked history
            </div>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-end">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <q-btn color="primary" label="OK" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { ref, onMounted, Ref } from "vue";
import { validators } from "src/utils/validators";
import { Collection } from "src/constants/constants";
import { Game, GameOwnershipEntry, GameUntrackedHistoryEntry } from "src/models/game";
import { GameStatus } from "src/models/game-status";
import { Platform } from "src/models/platform";
import { gameService } from "src/services/game-service";
import { platformService } from "src/services/platform-service";
import SelectTag from "./SelectTag.vue";

// Props
const props = defineProps<{
  existingGameId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// Types
type PlatformOwnershipPair = {
  platformId: string | null;
  ownershipType: GameOwnershipEntry["ownershipType"] | null;
  untrackedStatus?: GameStatus | null;
  untrackedLastPlayedDate?: string | null;
};

// State
let initialDoc: Game | null = null;

const isLoading = ref(false);
const isLoadingPlatforms = ref(false);

const gameForm: Ref<QForm | null> = ref(null);

const gameName: Ref<string | null> = ref(null);
const releaseDate: Ref<string | null> = ref(null);
const howLongToBeat: Ref<number | null> = ref(null);
const selectedTagIds: Ref<string[]> = ref([]);
const rating: Ref<number | null> = ref(null);
const isRetroGame = ref(false);
const untrackedPlaytimeHours: Ref<number | null> = ref(null);
const hasUntrackedHistory = ref(false);

const platformOptions: Ref<Platform[]> = ref([]);
const platformOwnershipPairs: Ref<PlatformOwnershipPair[]> = ref([
  { platformId: null, ownershipType: null }
]);

const ownershipTypeOptions = [
  { label: "Owned", value: "owned" },
  { label: "Borrowed", value: "borrowed" },
  { label: "Rented", value: "rented" },
  { label: "Gifted", value: "gifted" },
  { label: "Other", value: "other" },
];

const statusOptions = [
  { label: "Completed", value: "completed" },
  { label: "In Progress", value: "in-progress" },
  { label: "On Hold", value: "on-hold" },
  { label: "Dropped", value: "dropped" },
];

// Get available platforms (exclude already selected ones, except the current one)
function getAvailablePlatforms(currentPlatformId: string | null): Platform[] {
  const selectedIds = platformOwnershipPairs.value
    .map((p) => p.platformId)
    .filter((id) => id && id !== currentPlatformId);
  return platformOptions.value.filter((p) => p._id && !selectedIds.includes(p._id));
}

function addPlatformPair() {
  platformOwnershipPairs.value.push({ 
    platformId: null, 
    ownershipType: null,
    untrackedStatus: null,
    untrackedLastPlayedDate: null,
  });
}

function getPlatformName(platformId: string): string {
  const platform = platformOptions.value.find((p) => p._id === platformId);
  return platform?.name || platformId;
}

function removePlatformPair(index: number) {
  platformOwnershipPairs.value.splice(index, 1);
}

// Load existing game if editing
onMounted(async () => {
  isLoadingPlatforms.value = true;
  platformOptions.value = await platformService.listPlatforms();
  platformOptions.value.sort((a, b) => a.name.localeCompare(b.name));
  isLoadingPlatforms.value = false;

  if (props.existingGameId) {
    isLoading.value = true;
    const res = await gameService.getGame(props.existingGameId);
    if (res) {
      initialDoc = res;
      gameName.value = res.name;
      if (res.releaseDate) {
        const date = new Date(res.releaseDate);
        releaseDate.value = date.toISOString().split("T")[0];
      }
      selectedTagIds.value = res.tagIdList || [];
      rating.value = res.rating !== undefined ? res.rating : null;
      isRetroGame.value = res.isRetroGame || false;
      howLongToBeat.value = res.howLongToBeat !== undefined ? res.howLongToBeat : null;
      untrackedPlaytimeHours.value = res.untrackedPlaytime
        ? res.untrackedPlaytime / (1000 * 60 * 60) // Convert milliseconds to hours
        : null;

      // Load existing ownership from game.ownershipList
      if (res.ownershipList && res.ownershipList.length > 0) {
        platformOwnershipPairs.value = res.ownershipList.map((entry) => {
          const untracked = res.untrackedHistoryList?.find((u) => u.platformId === entry.platformId);
          return {
            platformId: entry.platformId,
            ownershipType: entry.ownershipType,
            untrackedStatus: untracked?.status || null,
            untrackedLastPlayedDate: untracked?.lastPlayedDate 
              ? new Date(untracked.lastPlayedDate).toISOString().split("T")[0]
              : null,
          };
        });
      } else if (res.platformIdList && res.platformIdList.length > 0) {
        // Fallback: if no ownershipList but platformIdList exists, create pairs with "owned" as default
        platformOwnershipPairs.value = res.platformIdList.map((platformId) => {
          const untracked = res.untrackedHistoryList?.find((u) => u.platformId === platformId);
          return {
            platformId,
            ownershipType: "owned" as GameOwnershipEntry["ownershipType"],
            untrackedStatus: untracked?.status || null,
            untrackedLastPlayedDate: untracked?.lastPlayedDate 
              ? new Date(untracked.lastPlayedDate).toISOString().split("T")[0]
              : null,
          };
        });
      }
      
      // Set the top-level toggle based on whether any untracked history exists
      hasUntrackedHistory.value = !!(res.untrackedHistoryList && res.untrackedHistoryList.length > 0);
    }
    isLoading.value = false;
  }
});

async function okClicked() {
  if (!(await gameForm.value?.validate())) {
    return;
  }

  // Validate that all pairs have both platform and ownership
  const invalidPairs = platformOwnershipPairs.value.filter(
    (p) => !p.platformId || !p.ownershipType
  );
  if (invalidPairs.length > 0) {
    return;
  }

  // Build ownershipList and untrackedHistoryList from pairs (only unique platforms, using the first occurrence)
  const ownershipList: GameOwnershipEntry[] = [];
  const untrackedHistoryList: GameUntrackedHistoryEntry[] = [];
  const seenPlatformIds = new Set<string>();
  const selectedPlatformIds: string[] = [];
  
  for (const pair of platformOwnershipPairs.value) {
    if (pair.platformId && pair.ownershipType && !seenPlatformIds.has(pair.platformId)) {
      ownershipList.push({
        platformId: pair.platformId,
        ownershipType: pair.ownershipType,
      });
      selectedPlatformIds.push(pair.platformId);
      seenPlatformIds.add(pair.platformId);

      // Add untracked history if toggle is enabled and status is set
      if (hasUntrackedHistory.value && pair.untrackedStatus) {
        untrackedHistoryList.push({
          platformId: pair.platformId,
          status: pair.untrackedStatus,
          lastPlayedDate: pair.untrackedLastPlayedDate 
            ? new Date(pair.untrackedLastPlayedDate).getTime()
            : undefined,
        });
      }
    }
  }

  let game: Game = {
    $collection: Collection.GAME,
    name: gameName.value!,
    platformIdList: selectedPlatformIds, // Keep for backward compatibility
    ownershipList: ownershipList,
    untrackedHistoryList: untrackedHistoryList.length > 0 ? untrackedHistoryList : undefined,
    untrackedPlaytime: untrackedPlaytimeHours.value !== null && untrackedPlaytimeHours.value > 0
      ? untrackedPlaytimeHours.value * 1000 * 60 * 60 // Convert hours to milliseconds
      : undefined,
    howLongToBeat: howLongToBeat.value !== null && howLongToBeat.value > 0 ? howLongToBeat.value : undefined,
    tagIdList: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
    rating: rating.value !== null ? rating.value : undefined,
    isRetroGame: isRetroGame.value,
  };

  if (releaseDate.value) {
    game.releaseDate = new Date(releaseDate.value).getTime();
  }

  if (initialDoc) {
    game = Object.assign({}, initialDoc, game);
  }

  await gameService.saveGame(game);

  onDialogOK();
}

const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>

