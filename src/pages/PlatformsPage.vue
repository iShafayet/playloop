<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
        <q-btn color="primary" text-color="white" label="Add Platform" @click="addPlatformClicked" />
      </div>

      <div class="q-pa-md">
        <!-- Search Bar -->
        <div class="q-mb-md">
          <q-input 
            outlined 
            rounded 
            dense 
            clearable 
            debounce="1" 
            v-model="searchFilter" 
            label="Search by name" 
            placeholder="Search" 
            class="search-field"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>

        <!-- Desktop Table View -->
        <!-- @vue-expect-error -->
        <q-table
          v-if="$q.screen.gt.xs"
          :loading="isLoading"
          title="Platforms"
          :rows="rows"
          :columns="columns"
          row-key="_id"
          flat
          bordered
          :rows-per-page-options="rowsPerPageOptions"
          binary-state-sort
          v-model:pagination="pagination"
          @request="dataForTableRequested"
          class="std-table-non-morphing"
        >
          <template v-slot:body-cell-actions="rowWrapper">
            <q-td :props="rowWrapper">
              <q-btn-dropdown size="sm" color="primary" label="Edit" split @click="editClicked(rowWrapper.row)">
                <q-list>
                  <q-item clickable v-close-popup @click="deleteClicked(rowWrapper.row)">
                    <q-item-section>
                      <q-item-label>Delete</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </q-td>
          </template>
        </q-table>

        <!-- Mobile Card View -->
        <div v-else>
          <div v-if="isLoading" class="text-center q-pa-lg">
            <q-spinner color="primary" size="3em" />
          </div>
          
          <div v-else-if="rows.length === 0" class="empty-state text-center q-pa-xl">
            <q-icon name="devices" size="80px" color="grey-4" />
            <div class="text-h6 q-mt-md text-grey-6">No platforms found</div>
          </div>

          <div v-else class="row q-gutter-md">
            <div 
              v-for="platform in rows" 
              :key="platform._id"
              class="col-12"
            >
              <q-card class="platform-card" flat bordered>
                <q-card-section>
                  <div class="row items-center q-gutter-sm">
                    <q-icon name="devices" size="28px" color="primary" />
                    <div class="col">
                      <div class="text-h6 text-weight-medium q-mb-xs">{{ platform.name }}</div>
                      <div v-if="platform.notes" class="text-body2 text-grey-7">
                        {{ platform.notes }}
                      </div>
                      <div v-else class="text-body2 text-grey-6">No notes</div>
                    </div>
                  </div>
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn 
                    flat 
                    color="primary" 
                    label="Edit" 
                    icon="edit"
                    @click="editClicked(platform)"
                  />
                  <q-btn 
                    flat 
                    color="negative" 
                    label="Delete" 
                    icon="delete"
                    @click="deleteClicked(platform)"
                  />
                </q-card-actions>
              </q-card>
            </div>
          </div>

          <!-- Mobile Pagination -->
          <div class="q-pa-lg flex flex-center">
            <q-pagination 
              v-model="pagination.page" 
              :max="Math.ceil(pagination.rowsNumber / pagination.rowsPerPage)" 
              :max-pages="5"
              direction-links
              @update:model-value="() => dataForTableRequested({ pagination: pagination })"
            />
          </div>
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script lang="ts" setup>
import { useQuasar } from "quasar";
import { Platform } from "src/models/platform";
import { dialogService } from "src/services/dialog-service";
import { platformService } from "src/services/platform-service";
import { usePaginationSizeStore } from "src/stores/pagination";
import { ref, watch, type Ref } from "vue";
import AddPlatform from "./../components/AddPlatform.vue";
import { rowsPerPageOptions } from "./../constants/constants";

const $q = useQuasar();
const paginationSizeStore = usePaginationSizeStore();

const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);

const columns = [
  {
    name: "name",
    required: true,
    label: "Name",
    align: "left",
    field: "name",
    sortable: true,
  },
  {
    name: "notes",
    align: "left",
    label: "Notes",
    field: "notes",
    sortable: false,
    format: (val: string) => val || "-",
  },
  {
    name: "actions",
    label: "Actions",
  },
];

const rows: Ref<any[]> = ref([]);

const pagination = ref({
  sortBy: "name",
  descending: false,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function applyOrdering(docList: Platform[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  }
}

async function dataForTableRequested(props: any) {
  let inputPagination = props?.pagination || pagination.value;

  const { page, rowsPerPage, sortBy, descending } = inputPagination;
  paginationSizeStore.setPaginationSize(rowsPerPage);

  isLoading.value = true;

  const skip = (page - 1) * rowsPerPage;
  const limit = rowsPerPage;

  let docList = await platformService.listPlatforms();
  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.name));
  }

  applyOrdering(docList, sortBy, descending);

  let totalRowCount = docList.length;
  let currentRows = docList.slice(skip, skip + limit);
  rows.value = currentRows;

  pagination.value.rowsNumber = totalRowCount;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  pagination.value.sortBy = sortBy;
  pagination.value.descending = descending;

  isLoading.value = false;
}

async function addPlatformClicked() {
  $q.dialog({ component: AddPlatform }).onOk(() => {
    loadData();
  });
}

async function loadData() {
  dataForTableRequested(null);
}

async function editClicked(platform: Platform) {
  $q.dialog({ component: AddPlatform, componentProps: { existingPlatformId: platform._id } }).onOk(() => {
    loadData();
  });
}

async function deleteClicked(platform: Platform) {
  let answer = await dialogService.confirm("Remove platform", `Are you sure you want to remove the platform "${platform.name}"?`);
  if (!answer) return;

  try {
    await platformService.deletePlatform(platform);
    loadData();
  } catch (error) {
    await dialogService.alert("Error", "There was an error trying to remove the platform.");
  }
}

// Initial data load
loadData();

// Watch for search filter changes
watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss">
.platform-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
}

.empty-state {
  padding: 60px 20px;
}
</style>

