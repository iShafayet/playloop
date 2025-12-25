<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingPlaySessionId ? "Editing a Gaming Session" : "Adding a Gaming Session" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="playSessionForm">
          <select-game v-model="playSessionGameId"></select-game>
          <select-platform v-model="playSessionPlatformId"></select-platform>
          <q-input
            filled
            v-model="startTime"
            type="datetime-local"
            label="Start Time"
            lazy-rules
            :rules="validators.required"
          />
          <q-input
            filled
            v-model="endTime"
            type="datetime-local"
            label="End Time"
            lazy-rules
            :rules="validators.required"
          />
          <q-input type="textarea" filled v-model="playSessionNotes" label="Notes" lazy-rules :rules="validators.notes" />
        </q-form>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row">
        <q-btn color="blue-grey" label="Cancel" @click="onDialogCancel" />
        <div class="spacer"></div>
        <q-btn color="primary" label="Save" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { QForm, useDialogPluginComponent } from "quasar";
import { Collection } from "src/constants/constants";
import { PlaySession } from "src/models/play-session";
import { pouchdbService } from "src/services/pouchdb-service";
import { dialogService } from "src/services/dialog-service";
import { validators } from "src/utils/validators";
import { ref, onMounted, Ref } from "vue";
import SelectGame from "./SelectGame.vue";
import SelectPlatform from "./SelectPlatform.vue";

// Props
const props = defineProps<{
  existingPlaySessionId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
let initialDoc: PlaySession | null = null;

const isLoading = ref(false);

const playSessionForm: Ref<QForm | null> = ref(null);

const playSessionGameId: Ref<string | null> = ref(null);
const playSessionPlatformId: Ref<string | null> = ref(null);
const startTime: Ref<string | null> = ref(null);
const endTime: Ref<string | null> = ref(null);
const playSessionNotes: Ref<string | null> = ref("");

// Helper function to format datetime-local input
function formatDateTimeLocal(epoch: number): string {
  const date = new Date(epoch);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper function to parse datetime-local input to epoch
function parseDateTimeLocal(dateTimeString: string): number {
  return new Date(dateTimeString).getTime();
}

// Load existing play session if editing
onMounted(async () => {
  if (props.existingPlaySessionId) {
    isLoading.value = true;
    const res = (await pouchdbService.getDocById(props.existingPlaySessionId)) as PlaySession;
    initialDoc = res;
    if (res.gamingSession) {
      playSessionGameId.value = res.gamingSession.gameId;
      playSessionPlatformId.value = res.gamingSession.platformId;
      if (res.gamingSession.startTime) {
        startTime.value = formatDateTimeLocal(res.gamingSession.startTime);
      }
      if (res.gamingSession.endTime) {
        endTime.value = formatDateTimeLocal(res.gamingSession.endTime);
      }
    }
    playSessionNotes.value = res.notes || "";
    isLoading.value = false;
  } else {
    // Set default times to now
    const now = new Date();
    startTime.value = formatDateTimeLocal(now.getTime());
    endTime.value = formatDateTimeLocal(now.getTime());
  }
});

async function okClicked() {
  if (!(await playSessionForm.value?.validate())) {
    return;
  }

  if (!startTime.value || !endTime.value) {
    return;
  }

  const startEpoch = parseDateTimeLocal(startTime.value);
  const endEpoch = parseDateTimeLocal(endTime.value);

  if (endEpoch <= startEpoch) {
    await dialogService.alert("Error", "End time must be after start time.");
    return;
  }

  let playSession: PlaySession = {
    $collection: Collection.PLAY_SESSION,
    notes: playSessionNotes.value || "",
    tagIdList: [],
    transactionEpoch: startEpoch, // Use start time as transaction epoch for sorting
    gamingSession: {
      gameId: playSessionGameId.value!,
      platformId: playSessionPlatformId.value!,
      startTime: startEpoch,
      endTime: endEpoch,
    },
  };

  if (initialDoc) {
    playSession = Object.assign({}, initialDoc, playSession);
  }

  await pouchdbService.upsertDoc(playSession);

  onDialogOK();
}
</script>
<style scoped lang="scss"></style>

