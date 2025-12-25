<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingGameId ? "Editing a Game" : "Adding a Game" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="gameForm">
          <q-input filled v-model="gameName" label="Name of the Game" lazy-rules :rules="validators.name" />
          <q-select
            filled
            v-model="selectedPlatformIds"
            :options="platformOptions"
            label="Platforms"
            multiple
            emit-value
            map-options
            option-value="_id"
            option-label="name"
            :loading="isLoadingPlatforms"
          />
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
import { Game } from "src/models/game";
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

// State
let initialDoc: Game | null = null;

const isLoading = ref(false);
const isLoadingPlatforms = ref(false);

const gameForm: Ref<QForm | null> = ref(null);

const gameName: Ref<string | null> = ref(null);
const selectedPlatformIds: Ref<string[]> = ref([]);
const releaseDate: Ref<string | null> = ref(null);
const isRetroGame = ref(false);

const platformOptions: Ref<Platform[]> = ref([]);

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
      selectedPlatformIds.value = res.platformIdList || [];
      if (res.releaseDate) {
        const date = new Date(res.releaseDate);
        releaseDate.value = date.toISOString().split("T")[0];
      }
      isRetroGame.value = res.isRetroGame || false;
    }
    isLoading.value = false;
  }
});

async function okClicked() {
  if (!(await gameForm.value?.validate())) {
    return;
  }

  let game: Game = {
    $collection: Collection.GAME,
    name: gameName.value!,
    platformIdList: selectedPlatformIds.value || [],
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

