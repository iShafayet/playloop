<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="std-dialog-title" style="padding-bottom: 8px">Filters</div>
        
        <div style="margin-top: 8px">
          <q-select
            filled
            v-model="filters.selectedPlatforms"
            :options="platformOptions"
            option-label="name"
            option-value="_id"
            emit-value
            map-options
            multiple
            use-chips
            label="Platforms"
            clearable
            :loading="isLoadingPlatforms"
          />
        </div>
        
        <div style="margin-top: 8px">
          <q-select
            filled
            v-model="filters.selectedTags"
            :options="tagOptions"
            option-label="name"
            option-value="_id"
            emit-value
            map-options
            multiple
            use-chips
            label="Tags"
            clearable
            :loading="isLoadingTags"
          />
        </div>
        
        <div style="margin-top: 8px">
          <q-select
            filled
            v-model="filters.retroFilter"
            :options="retroOptions"
            label="Retro"
            clearable
            emit-value
            map-options
          />
        </div>
        
        <div style="margin-top: 8px">
          <q-select
            filled
            v-model="filters.ratingFilter"
            :options="ratingOptions"
            label="Minimum Rating"
            clearable
            emit-value
            map-options
          />
        </div>
        
        <div style="margin-top: 8px">
          <q-select
            filled
            v-model="filters.completionFilter"
            :options="completionOptions"
            label="Completion Status"
            clearable
            emit-value
            map-options
          />
        </div>
      </q-card-section>

      <q-card-actions class="row justify-start std-bottom-action-row-alt">
        <q-btn color="blue-grey" label="Cancel" @click="cancelClicked" />
        <div class="spacer"></div>
        <q-btn color="primary" label="Apply Filters" @click="okClicked" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar";
import { Platform } from "src/models/platform";
import { Tag } from "src/models/tag";
import { platformService } from "src/services/platform-service";
import { tagService } from "src/services/tag-service";
import { Ref, ref, onMounted } from "vue";

export type GameFilters = {
  selectedPlatforms: string[];
  selectedTags: string[];
  retroFilter: string | null;
  ratingFilter: number | null;
  completionFilter: string | null;
};

// Props
const props = defineProps<{
  inputFilters?: GameFilters | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const retroOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const ratingOptions = [
  { label: "1.0+", value: 1 },
  { label: "2.0+", value: 2 },
  { label: "3.0+", value: 3 },
  { label: "4.0+", value: 4 },
  { label: "5.0+", value: 5 },
  { label: "6.0+", value: 6 },
  { label: "7.0+", value: 7 },
  { label: "8.0+", value: 8 },
  { label: "9.0+", value: 9 },
];

const completionOptions = [
  { label: "Completed", value: "completed" },
  { label: "In Progress", value: "in-progress" },
  { label: "On Hold", value: "on-hold" },
  { label: "Dropped", value: "dropped" },
];

const filters: Ref<GameFilters> = ref(
  props.inputFilters || {
    selectedPlatforms: [],
    selectedTags: [],
    retroFilter: null,
    ratingFilter: null,
    completionFilter: null,
  }
);

const isLoadingPlatforms = ref(false);
const isLoadingTags = ref(false);
const platformOptions = ref<Platform[]>([]);
const tagOptions = ref<Tag[]>([]);

async function loadPlatforms() {
  isLoadingPlatforms.value = true;
  try {
    const platforms = await platformService.listPlatforms();
    platforms.sort((a, b) => a.name.localeCompare(b.name));
    platformOptions.value = platforms;
  } finally {
    isLoadingPlatforms.value = false;
  }
}

async function loadTags() {
  isLoadingTags.value = true;
  try {
    const tags = await tagService.listTags();
    tags.sort((a, b) => a.name.localeCompare(b.name));
    tagOptions.value = tags;
  } finally {
    isLoadingTags.value = false;
  }
}

function okClicked() {
  onDialogOK(filters.value);
}

const cancelClicked = onDialogCancel;

onMounted(() => {
  loadPlatforms();
  loadTags();
});
</script>
<style scoped lang="scss"></style>

