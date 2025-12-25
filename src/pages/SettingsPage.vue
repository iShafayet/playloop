<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Application Settings</div>
        <q-btn color="primary" text-color="white" label="Save Changes" @click="saveChangesClicked" />
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title">Enter how many sessions you want to see at once in the Sessions page.</div>
        <q-input
          type="number"
          v-model="playSessionPaginationSize"
          label="Sessions per page"
          :rules="validators.nonZeroInteger"
          style="margin-right: 8px"
          class="local-control"
        ></q-input>
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title">Enter how many rows you want to see in one page (for Games and Platforms lists).</div>
        <q-input
          type="number"
          v-model="paginationSize"
          label="Rows per page"
          :rules="validators.nonZeroInteger"
          style="margin-right: 8px"
          class="local-control"
        ></q-input>
      </div>

      <div class="q-pa-md control-group">
        <div class="control-title" style="margin-bottom: 12px">Select what view you want to see when you open the application</div>
        <q-toggle
          class="control-toggle"
          v-model="rememberLastOpenedView"
          color="green"
          left-label
          label="Remember last opened view"
          style="margin-bottom: 12px"
        />
        <div class="local-control" style="margin-bottom: -24px">
          <q-select
            :disable="rememberLastOpenedView"
            filled
            v-model="defaultView"
            :options="defaultViewOptionList"
            label="Default View"
            emit-value
            map-options
            class="std-margin-bottom-32"
          />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { defaultViewOptionList } from "src/constants/constants";
import { dialogService } from "src/services/dialog-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { usePlaySessionPaginationSizeStore } from "src/stores/play-session-pagination";
import { useSettingsStore } from "src/stores/settings";
import { validators } from "src/utils/validators";
import { ref } from "vue";

const $q = useQuasar();
const playSessionPaginationStore = usePlaySessionPaginationSizeStore();
const paginationStore = usePaginationSizeStore();
const settingsStore = useSettingsStore();

const playSessionPaginationSize = ref(playSessionPaginationStore.playSessionPaginationSize);
const paginationSize = ref(paginationStore.paginationSize);
const defaultView = ref(settingsStore.defaultView);
const rememberLastOpenedView = ref(settingsStore.rememberLastOpenedView);

function saveChangesClicked() {
  playSessionPaginationStore.setPlaySessionPaginationSize(playSessionPaginationSize.value);
  paginationStore.setPaginationSize(paginationSize.value);
  settingsStore.setDefaultView(defaultView.value!);
  settingsStore.setRememberLastOpenedView(rememberLastOpenedView.value);

  dialogService.notify("Settings saved.", "positive");
}
</script>

<style scoped lang="scss">
.local-control {
  max-width: 260px;
}

.control-group {
  background-color: rgb(244, 244, 244);
  margin: 12px;
}

.control-toggle {
  display: flex;
  justify-content: start;
  width: calc(100% - 16px);
  max-width: 300px;
  color: #3b3b3b;
}

.control-title {
  color: #3b3b3b;
}
</style>
