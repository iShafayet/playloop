<script setup lang="ts">
import { Platform } from "src/models/platform";
import { platformService } from "src/services/platform-service";
import { Ref, computed, ref } from "vue";

const props = defineProps(["modelValue", "label"]);
const emit = defineEmits(["update:modelValue"]);

const value = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  },
});

const label = computed({
  get() {
    return props.label;
  },
  set(value) {
    return null;
  },
});

const isLoading: Ref<boolean> = ref(true);
const platformList: Ref<Platform[]> = ref([]);
const fullPlatformList: Ref<Platform[]> = ref([]);

async function loadData() {
  isLoading.value = true;

  let list = await platformService.listPlatforms();
  list.sort((a, b) => a.name.localeCompare(b.name));

  fullPlatformList.value = list;
  platformList.value = fullPlatformList.value;
  isLoading.value = false;
  setTimeout(() => {
    if (fullPlatformList.value.length && !value.value) {
      value.value = fullPlatformList.value[0]._id;
    }
  }, 10);
}

loadData();

function filterPlatformFn(val: string, update: any, abort: any) {
  update(() => {
    const needle = val.toLowerCase();
    platformList.value = fullPlatformList.value.filter((platform) => {
      return platform.name.toLowerCase().includes(needle);
    });
  });
}
</script>

<template>
  <div style="text-align: center" v-if="isLoading">
    <q-spinner color="primary" size="40px" :thickness="4" />
  </div>

  <q-select
    filled
    v-model="value"
    :options="platformList"
    :label="label || 'Platform'"
    emit-value
    map-options
    fill-input
    use-input
    input-debounce="0"
    @filter="filterPlatformFn"
    class="std-margin-bottom-32"
    option-value="_id"
    option-label="name"
    hide-selected
    v-if="!isLoading"
  />
</template>

