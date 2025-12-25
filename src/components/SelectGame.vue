<script setup lang="ts">
import { Game } from "src/models/game";
import { gameService } from "src/services/game-service";
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
const gameList: Ref<Game[]> = ref([]);
const fullGameList: Ref<Game[]> = ref([]);

async function loadData() {
  isLoading.value = true;

  let list = await gameService.listGames();
  list.sort((a, b) => a.name.localeCompare(b.name));

  fullGameList.value = list;
  gameList.value = fullGameList.value;
  isLoading.value = false;
  setTimeout(() => {
    if (fullGameList.value.length && !value.value) {
      value.value = fullGameList.value[0]._id;
    }
  }, 10);
}

loadData();

function filterGameFn(val: string, update: any, abort: any) {
  update(() => {
    const needle = val.toLowerCase();
    gameList.value = fullGameList.value.filter((game) => {
      return game.name.toLowerCase().includes(needle);
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
    :options="gameList"
    :label="label || 'Game'"
    emit-value
    map-options
    fill-input
    use-input
    input-debounce="0"
    @filter="filterGameFn"
    class="std-margin-bottom-32"
    option-value="_id"
    option-label="name"
    hide-selected
    v-if="!isLoading"
  />
</template>

