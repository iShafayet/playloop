<template>
  <q-page class="row items-center justify-center">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title"></div>
      </div>

      <q-separator />

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
          title="Reviews"
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
          <template v-slot:body-cell-platforms="rowWrapper">
            <q-td :props="rowWrapper">
              <q-chip
                v-for="platformId in rowWrapper.row.platformIdList"
                :key="platformId"
                :label="getPlatformName(platformId)"
                size="sm"
                class="q-mr-xs"
              />
              <span v-if="!rowWrapper.row.platformIdList || rowWrapper.row.platformIdList.length === 0">-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-dateReviewed="rowWrapper">
            <q-td :props="rowWrapper">
              {{ rowWrapper.row.dateReviewed ? new Date(rowWrapper.row.dateReviewed).toLocaleDateString() : "-" }}
            </q-td>
          </template>

          <template v-slot:body-cell-overallRating="rowWrapper">
            <q-td :props="rowWrapper">
              {{ rowWrapper.row.overallRating !== null && rowWrapper.row.overallRating !== undefined ? rowWrapper.row.overallRating.toFixed(1) : "-" }}
            </q-td>
          </template>

          <template v-slot:body-cell-actions="rowWrapper">
            <q-td :props="rowWrapper">
              <div class="row q-gutter-xs">
                <q-btn 
                  size="sm" 
                  color="primary" 
                  label="View" 
                  @click="viewGameClicked(rowWrapper.row)"
                />
              </div>
            </q-td>
          </template>
        </q-table>

        <!-- Mobile Card View -->
        <div v-else>
          <div v-if="isLoading" class="text-center q-pa-lg">
            <q-spinner color="primary" size="3em" />
          </div>
          
          <div v-else-if="rows.length === 0" class="empty-state text-center q-pa-xl">
            <q-icon name="rate_review" size="80px" color="grey-4" />
            <div class="text-h6 q-mt-md text-grey-6">No reviews found</div>
          </div>

          <div v-else class="mobile-cards-container">
            <div 
              v-for="game in rows" 
              :key="game._id"
              class="mobile-card-wrapper"
            >
              <q-card class="game-card" flat bordered>
                <q-card-section>
                  <div class="row items-start q-gutter-sm">
                    <div class="col">
                      <div class="text-h6 text-weight-medium q-mb-xs">{{ game.name }}</div>
                      
                      <!-- Platforms -->
                      <div class="q-mb-sm" v-if="game.platformIdList && game.platformIdList.length > 0">
                        <q-chip
                          v-for="platformId in game.platformIdList"
                          :key="platformId"
                          :label="getPlatformName(platformId)"
                          size="sm"
                          color="primary"
                          text-color="white"
                          class="q-mr-xs q-mb-xs"
                        />
                      </div>
                      <div v-else class="text-body2 text-grey-6 q-mb-sm">No platforms</div>

                      <!-- Review Metadata -->
                      <div class="row q-gutter-md text-body2 text-grey-7">
                        <div v-if="game.dateReviewed" class="row items-center q-gutter-xs">
                          <q-icon name="calendar_today" size="14px" />
                          <span>{{ new Date(game.dateReviewed).toLocaleDateString() }}</span>
                        </div>
                        <div v-if="game.overallRating !== null && game.overallRating !== undefined" class="row items-center q-gutter-xs">
                          <q-icon name="star" size="14px" />
                          <span>{{ game.overallRating.toFixed(1) }}/10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn 
                    flat 
                    color="primary" 
                    label="View" 
                    icon="visibility"
                    @click="viewGameClicked(game)"
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
import { Game } from "src/models/game";
import { Review } from "src/models/review";
import { Platform } from "src/models/platform";
import { gameService } from "src/services/game-service";
import { reviewService } from "src/services/review-service";
import { platformService } from "src/services/platform-service";
import { pouchdbService } from "src/services/pouchdb-service";
import { Collection } from "src/constants/constants";
import { usePaginationSizeStore } from "src/stores/pagination";
import { ref, watch, type Ref, onMounted } from "vue";
import { rowsPerPageOptions } from "./../constants/constants";
import AddReview from "src/components/AddReview.vue";

const $q = useQuasar();
const paginationSizeStore = usePaginationSizeStore();

const searchFilter: Ref<string | null> = ref(null);
const isLoading = ref(false);
const platformsMap = ref(new Map<string, Platform>());

const columns = [
  {
    name: "name",
    required: true,
    label: "Game",
    align: "left",
    field: "name",
    sortable: true,
  },
  {
    name: "platforms",
    align: "left",
    label: "Platforms",
    field: "platformIdList",
    sortable: true,
  },
  {
    name: "dateReviewed",
    align: "left",
    label: "Date Reviewed",
    field: "dateReviewed",
    sortable: true,
    format: (val: number | null) => (val ? new Date(val).toLocaleDateString() : "-"),
  },
  {
    name: "overallRating",
    align: "center",
    label: "Rating",
    field: "overallRating",
    sortable: true,
    format: (val: number | null) => (val !== null && val !== undefined ? val.toFixed(1) : "-"),
  },
  {
    name: "actions",
    label: "Actions",
  },
];

const rows: Ref<any[]> = ref([]);

const pagination = ref({
  sortBy: "dateReviewed",
  descending: true,
  page: 1,
  rowsPerPage: paginationSizeStore.paginationSize,
  rowsNumber: 0,
});

function getPlatformName(platformId: string): string {
  return platformsMap.value.get(platformId)?.name || platformId;
}

function getFirstPlatformName(game: Game): string {
  if (!game.platformIdList || game.platformIdList.length === 0) {
    return "";
  }
  const firstPlatformId = game.platformIdList[0];
  return getPlatformName(firstPlatformId);
}

function applyOrdering(docList: any[], sortBy: string, descending: boolean) {
  if (sortBy === "name") {
    docList.sort((a, b) => {
      return a.name.localeCompare(b.name) * (descending ? -1 : 1);
    });
  } else if (sortBy === "platforms") {
    docList.sort((a, b) => {
      const aPlatform = getFirstPlatformName(a);
      const bPlatform = getFirstPlatformName(b);
      return aPlatform.localeCompare(bPlatform) * (descending ? -1 : 1);
    });
  } else if (sortBy === "dateReviewed") {
    docList.sort((a, b) => {
      const aDate = a.dateReviewed ?? 0;
      const bDate = b.dateReviewed ?? 0;
      return (bDate - aDate) * (descending ? -1 : 1);
    });
  } else if (sortBy === "overallRating") {
    docList.sort((a, b) => {
      const aRating = a.overallRating ?? -1;
      const bRating = b.overallRating ?? -1;
      return (bRating - aRating) * (descending ? -1 : 1);
    });
  }
}

async function loadPlatforms() {
  const platforms = await platformService.listPlatforms();
  platforms.forEach((p) => {
    if (p._id) {
      platformsMap.value.set(p._id, p);
    }
  });
}

async function dataForTableRequested(props: any) {
  let inputPagination = props?.pagination || pagination.value;

  const { page, rowsPerPage, sortBy, descending } = inputPagination;
  paginationSizeStore.setPaginationSize(rowsPerPage);

  isLoading.value = true;

  const skip = (page - 1) * rowsPerPage;
  const limit = rowsPerPage;

  // Load all reviews
  const reviewsRes = await pouchdbService.listByCollection(Collection.REVIEW);
  const allReviews = reviewsRes.docs as Review[];

  // Get unique game IDs from reviews
  const gameIdsWithReviews = new Set<string>();
  const reviewMap = new Map<string, Review>();
  allReviews.forEach((review) => {
    if (review.gameId) {
      gameIdsWithReviews.add(review.gameId);
      reviewMap.set(review.gameId, review);
    }
  });

  // Load games that have reviews
  let docList: Game[] = [];
  for (const gameId of gameIdsWithReviews) {
    const game = await gameService.getGame(gameId);
    if (game) {
      docList.push(game);
    }
  }

  // Apply search filter
  if (searchFilter.value) {
    let regex = new RegExp(`.*${searchFilter.value}.*`, "i");
    docList = docList.filter((doc) => regex.test(doc.name));
  }

  // Add review data to each game
  const gamesWithReviewData = docList.map((game) => {
    const review = reviewMap.get(game._id || "");
    return {
      ...game,
      reviewId: review?._id || null,
      dateReviewed: review?.dateReviewed || null,
      overallRating: review ? reviewService.calculateAverageRating(review.aspectRatings) : null,
    };
  });

  applyOrdering(gamesWithReviewData, sortBy, descending);

  let totalRowCount = gamesWithReviewData.length;
  let currentRows = gamesWithReviewData.slice(skip, skip + limit);
  rows.value = currentRows;

  pagination.value.rowsNumber = totalRowCount;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  pagination.value.sortBy = sortBy;
  pagination.value.descending = descending;

  isLoading.value = false;
}

async function loadData() {
  await loadPlatforms();
  dataForTableRequested(null);
}

function viewGameClicked(row: any) {
  if (!row._id || !row.reviewId) return;
  $q.dialog({
    component: AddReview,
    componentProps: {
      gameId: row._id,
      existingReviewId: row.reviewId,
    },
  }).onOk(() => {
    loadData();
  });
}

// Initial data load
onMounted(() => {
  loadData();
});

// Watch for search filter changes
watch(searchFilter, () => {
  loadData();
});
</script>

<style scoped lang="scss">
.mobile-cards-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-card-wrapper {
  width: 100%;
}

.game-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  width: 100%;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
}

.empty-state {
  padding: 60px 20px;
}
</style>

