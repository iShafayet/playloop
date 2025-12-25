<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">{{ existingPlatformId ? "Editing a Platform" : "Adding a Platform" }}</div>
        <q-form class="q-gutter-md q-pa-md" ref="platformForm">
          <q-input filled v-model="platformName" label="Name of the Platform" lazy-rules :rules="validators.name" />
          <q-input filled v-model="platformNotes" label="Notes" type="textarea" />
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
import { Platform } from "src/models/platform";
import { platformService } from "src/services/platform-service";

// Props
const props = defineProps<{
  existingPlatformId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// State
let initialDoc: Platform | null = null;

const isLoading = ref(false);

const platformForm: Ref<QForm | null> = ref(null);

const platformName: Ref<string | null> = ref(null);
const platformNotes: Ref<string | null> = ref(null);

// Load existing platform if editing
onMounted(async () => {
  if (props.existingPlatformId) {
    isLoading.value = true;
    const res = await platformService.getPlatform(props.existingPlatformId);
    if (res) {
      initialDoc = res;
      platformName.value = res.name;
      platformNotes.value = res.notes || null;
    }
    isLoading.value = false;
  }
});

async function okClicked() {
  if (!(await platformForm.value?.validate())) {
    return;
  }

  let platform: Platform = {
    $collection: Collection.PLATFORM,
    name: platformName.value!,
  };

  if (platformNotes.value) {
    platform.notes = platformNotes.value;
  }

  if (initialDoc) {
    platform = Object.assign({}, initialDoc, platform);
  }

  await platformService.savePlatform(platform);

  onDialogOK();
}

const cancelClicked = onDialogCancel;
</script>
<style scoped lang="scss"></style>

