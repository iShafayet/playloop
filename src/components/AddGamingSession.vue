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
          <date-time-input filled v-model="startTime" label="Start Time" lazy-rules :rules="validators.required" />
          <div class="row duration-inputs-row">
            <div class="col">
              <q-input filled v-model.number="durationHours" type="number" label="Duration (Hours)" min="0" @update:model-value="onDurationChanged" />
            </div>
            <div class="col">
              <q-input
                filled
                v-model.number="durationMinutes"
                type="number"
                label="Duration (Minutes)"
                min="0"
                max="59"
                @update:model-value="onDurationChanged"
              />
            </div>
          </div>
          <date-time-input
            filled
            v-model="endTime"
            label="End Time"
            lazy-rules
            :rules="validators.required"
            @update:model-value="onEndTimeChanged"
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
import { ref, onMounted, Ref, watch } from "vue";
import SelectGame from "./SelectGame.vue";
import SelectPlatform from "./SelectPlatform.vue";
import DateTimeInput from "./lib/DateTimeInput.vue";

// Props
const props = defineProps<{
  existingPlaySessionId?: string | null;
  preselectedGameId?: string | null;
  preselectedPlatformId?: string | null;
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
const startTime: Ref<number | null> = ref(null);
const endTime: Ref<number | null> = ref(null);
const durationHours: Ref<number | null> = ref(0);
const durationMinutes: Ref<number | null> = ref(0);
const playSessionNotes: Ref<string | null> = ref("");

// Flag to prevent circular updates
let isUpdatingFromEndTime = false;
let isUpdatingFromDuration = false;


// Calculate duration from start and end times
function calculateDuration() {
  if (!startTime.value || !endTime.value) {
    durationHours.value = 0;
    durationMinutes.value = 0;
    return;
  }

  const durationMs = endTime.value - startTime.value;

  if (durationMs <= 0) {
    durationHours.value = 0;
    durationMinutes.value = 0;
    return;
  }

  const totalMinutes = Math.floor(durationMs / (1000 * 60));
  durationHours.value = Math.floor(totalMinutes / 60);
  durationMinutes.value = totalMinutes % 60;
}

// Update end time based on duration
function updateEndTimeFromDuration() {
  if (!startTime.value || durationHours.value === null || durationMinutes.value === null) {
    return;
  }

  const totalMinutes = (durationHours.value || 0) * 60 + (durationMinutes.value || 0);
  const durationMs = totalMinutes * 60 * 1000;
  endTime.value = startTime.value + durationMs;
}

// Handler for end time changes
function onEndTimeChanged() {
  if (isUpdatingFromDuration) {
    return;
  }
  isUpdatingFromEndTime = true;
  calculateDuration();
  isUpdatingFromEndTime = false;
}

// Handler for duration changes
function onDurationChanged() {
  if (isUpdatingFromEndTime || !startTime.value) {
    return;
  }

  // Ensure values are valid numbers
  if (durationHours.value === null || durationHours.value === undefined) {
    durationHours.value = 0;
  }
  if (durationMinutes.value === null || durationMinutes.value === undefined) {
    durationMinutes.value = 0;
  }

  // Clamp minutes to 0-59
  if (durationMinutes.value < 0) {
    durationMinutes.value = 0;
  }
  if (durationMinutes.value > 59) {
    const extraHours = Math.floor(durationMinutes.value / 60);
    durationHours.value = (durationHours.value || 0) + extraHours;
    durationMinutes.value = durationMinutes.value % 60;
  }

  isUpdatingFromDuration = true;
  updateEndTimeFromDuration();
  isUpdatingFromDuration = false;
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
        startTime.value = res.gamingSession.startTime;
      }
      if (res.gamingSession.endTime) {
        endTime.value = res.gamingSession.endTime;
      }
    }
    playSessionNotes.value = res.notes || "";
    isLoading.value = false;
    // Calculate initial duration
    calculateDuration();
  } else {
    // Preselect game (and optionally platform) when opening from single game page
    if (props.preselectedGameId) {
      playSessionGameId.value = props.preselectedGameId;
    }
    if (props.preselectedPlatformId) {
      playSessionPlatformId.value = props.preselectedPlatformId;
    }
    // Set default times to now
    startTime.value = Date.now();
    // Set default duration to 1 hour
    durationHours.value = 1;
    durationMinutes.value = 0;
    // Calculate end time from start time + duration
    updateEndTimeFromDuration();
  }
});

// Watch start time to recalculate duration
watch(startTime, () => {
  if (!isUpdatingFromDuration) {
    calculateDuration();
  }
});

async function okClicked() {
  if (!(await playSessionForm.value?.validate())) {
    return;
  }

  if (!startTime.value || !endTime.value) {
    return;
  }

  if (endTime.value <= startTime.value) {
    await dialogService.alert("Error", "End time must be after start time.");
    return;
  }

  let playSession: PlaySession = {
    $collection: Collection.PLAY_SESSION,
    notes: playSessionNotes.value || "",
    tagIdList: [],
    transactionEpoch: startTime.value, // Use start time as transaction epoch for sorting
    gamingSession: {
      gameId: playSessionGameId.value!,
      platformId: playSessionPlatformId.value!,
      startTime: startTime.value,
      endTime: endTime.value,
    },
  };

  if (initialDoc) {
    playSession = Object.assign({}, initialDoc, playSession);
  }

  await pouchdbService.upsertDoc(playSession);

  onDialogOK();
}
</script>
<style scoped lang="scss">
.duration-inputs-row {
  margin-left: 16px;
  margin-right: 0;
  gap: 16px;
  margin-bottom: 32px;

  > .col {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
