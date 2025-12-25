<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingGameId ? "Editing a Game" : "Adding a Game" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="gameForm">
          <q-input filled v-model="gameName" label="Name of the Game" lazy-rules :rules="validators.name" />
          
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Platforms & Ownership</div>
            <div v-for="(pair, index) in platformOwnershipPairs" :key="index" class="row q-gutter-sm q-mb-sm">
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
          <q-toggle v-model="isRetroGame" label="Is Retro Game" color="green" left-label />
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
import { Game, GameOwnershipEntry } from "src/models/game";
import { Platform } from "src/models/platform";
import { gameService } from "src/services/game-service";
import { platformService } from "src/services/platform-service";

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
};

// State
let initialDoc: Game | null = null;

const isLoading = ref(false);
const isLoadingPlatforms = ref(false);

const gameForm: Ref<QForm | null> = ref(null);

const gameName: Ref<string | null> = ref(null);
const releaseDate: Ref<string | null> = ref(null);
const isRetroGame = ref(false);

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

// Get available platforms (exclude already selected ones, except the current one)
function getAvailablePlatforms(currentPlatformId: string | null): Platform[] {
  const selectedIds = platformOwnershipPairs.value
    .map((p) => p.platformId)
    .filter((id) => id && id !== currentPlatformId);
  return platformOptions.value.filter((p) => !selectedIds.includes(p._id));
}

function addPlatformPair() {
  platformOwnershipPairs.value.push({ platformId: null, ownershipType: null });
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
      isRetroGame.value = res.isRetroGame || false;

      // Load existing ownership from game.ownershipList
      if (res.ownershipList && res.ownershipList.length > 0) {
        platformOwnershipPairs.value = res.ownershipList.map((entry) => ({
          platformId: entry.platformId,
          ownershipType: entry.ownershipType,
        }));
      } else if (res.platformIdList && res.platformIdList.length > 0) {
        // Fallback: if no ownershipList but platformIdList exists, create pairs with "owned" as default
        platformOwnershipPairs.value = res.platformIdList.map((platformId) => ({
          platformId,
          ownershipType: "owned" as GameOwnershipEntry["ownershipType"],
        }));
      }
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

  // Build ownershipList from pairs (only unique platforms, using the first occurrence)
  const ownershipList: GameOwnershipEntry[] = [];
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
    }
  }

  let game: Game = {
    $collection: Collection.GAME,
    name: gameName.value!,
    platformIdList: selectedPlatformIds, // Keep for backward compatibility
    ownershipList: ownershipList,
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

