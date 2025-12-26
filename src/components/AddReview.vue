<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card class="q-dialog-plugin add-review-dialog">
      <q-card-section>
        <div class="std-dialog-title q-pa-md">
          {{ existingReviewId ? "Editing Review" : "Adding Review" }}
        </div>
        <q-form class="q-gutter-md q-pa-md" ref="reviewForm">
          <!-- Review Text -->
          <q-input type="textarea" filled v-model="reviewText" label="Review Text" rows="6" lazy-rules />

          <!-- Date Reviewed -->
          <q-input filled v-model="dateReviewed" type="date" label="Date Reviewed" />

          <!-- Aspect Ratings -->
          <div class="q-mt-lg">
            <div class="text-subtitle2 q-mb-md">Individual Aspect Ratings (0-10)</div>
            <div v-for="aspect in aspectList" :key="aspect.key" class="aspect-item">
              <div class="row items-center justify-between q-mb-sm">
                <div class="text-body1 text-weight-medium">{{ aspect.label }}</div>
                <div class="row items-center q-gutter-sm">
                  <span v-if="aspectRatings[aspect.key] !== null && aspectRatings[aspect.key] !== undefined" class="text-body2">
                    {{ aspectRatings[aspect.key] }}/10
                  </span>
                  <span v-else class="text-body2 text-grey-6">Not rated</span>
                  <q-btn
                    v-if="aspectRatings[aspect.key] !== null && aspectRatings[aspect.key] !== undefined"
                    flat
                    dense
                    round
                    icon="clear"
                    size="sm"
                    @click="clearRating(aspect.key)"
                    title="Clear rating"
                    color="grey"
                  />
                </div>
              </div>
              <div class="row items-center q-gutter-sm rating-container">
                <q-rating
                  v-model="aspectRatings[aspect.key]"
                  :max="10"
                  :size="$q.screen.lt.sm ? '20px' : '28px'"
                  color="primary"
                  @update:model-value="onRatingChanged"
                />
              </div>
            </div>
          </div>

          <!-- Final Rating -->
          <div class="q-mt-lg" v-if="finalRating !== null">
            <div class="text-subtitle2 q-mb-sm">Overall Rating (Average)</div>
            <div class="row items-center q-gutter-sm rating-container">
              <q-rating :model-value="finalRating" :max="10" :size="$q.screen.lt.sm ? '24px' : '32px'" color="primary" readonly />
              <div class="overall-rating-value">{{ finalRating.toFixed(1) }}/10</div>
            </div>
          </div>
          <div class="q-mt-lg" v-else>
            <div class="text-subtitle2 q-mb-sm">Overall Rating</div>
            <div class="text-body2 text-grey-6">Rate at least one aspect to see overall rating</div>
          </div>

          <!-- Tags Management -->
          <div class="q-mt-lg">
            <div class="text-subtitle2 q-mb-md">Tags (For the Game)</div>
            <select-tag v-model="gameTags" label="Tags" />
          </div>

          <!-- Metrics -->
          <div class="q-mt-lg">
            <div class="text-subtitle2 q-mb-md">Subjective Aspects</div>
            <div class="text-body2 text-grey-6" style="margin-bottom: 16px; margin-top: -8px">Not counted in overall rating</div>
            <div v-for="metric in metricList" :key="metric.key" class="aspect-item">
              <div class="row items-center justify-between q-mb-sm">
                <div class="text-body1 text-weight-medium">{{ metric.label }}</div>
                <div class="row items-center q-gutter-sm">
                  <span v-if="metrics[metric.key] !== null && metrics[metric.key] !== undefined" class="text-body2"> {{ metrics[metric.key] }}/10 </span>
                  <span v-else class="text-body2 text-grey-6">Not set</span>
                  <q-btn
                    v-if="metrics[metric.key] !== null && metrics[metric.key] !== undefined"
                    flat
                    dense
                    round
                    icon="clear"
                    size="sm"
                    @click="clearMetric(metric.key)"
                    title="Clear metric"
                    color="grey"
                  />
                </div>
              </div>
              <q-slider v-model="metrics[metric.key]" :min="0" :max="10" :step="1" @update:model-value="onMetricChanged" />
            </div>
          </div>
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
import { Game } from "src/models/game";
import { Review, ReviewAspectRatings, ReviewMetrics } from "src/models/review";
import { pouchdbService } from "src/services/pouchdb-service";
import { dialogService } from "src/services/dialog-service";
import { reviewService } from "src/services/review-service";
import { gameService } from "src/services/game-service";
import { ref, onMounted, Ref, computed } from "vue";
import { useQuasar } from "quasar";
import SelectTag from "./SelectTag.vue";

// Props
const props = defineProps<{
  gameId: string;
  existingReviewId?: string | null;
}>();

// Emits
const emit = defineEmits([...useDialogPluginComponent.emits]);

// Dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const $q = useQuasar();

// State
let initialReview: Review | null = null;
let game: Game | null = null;

const isLoading = ref(false);
const reviewForm: Ref<QForm | null> = ref(null);

const reviewText: Ref<string | null> = ref("");
const dateReviewed: Ref<string | null> = ref(null);
const aspectRatings: Ref<ReviewAspectRatings> = ref({
  story: null,
  gameplay: null,
  novelty: null,
  music: null,
  artDesign: null,
  graphics: null,
  performance: null,
  characters: null,
});
const metrics: Ref<ReviewMetrics> = ref({
  difficulty: null,
  nostalgia: null,
});
const gameTags: Ref<string[]> = ref([]);

const aspectList = [
  { key: "story" as const, label: "Story" },
  { key: "gameplay" as const, label: "Gameplay" },
  { key: "novelty" as const, label: "Novelty" },
  { key: "music" as const, label: "Music" },
  { key: "artDesign" as const, label: "Art Design" },
  { key: "graphics" as const, label: "Graphics" },
  { key: "performance" as const, label: "Performance" },
  { key: "characters" as const, label: "Characters" },
];

const metricList = [
  { key: "difficulty" as const, label: "Difficulty" },
  { key: "nostalgia" as const, label: "Nostalgia" },
];

const finalRating = computed(() => {
  return reviewService.calculateAverageRating(aspectRatings.value);
});

function clearRating(aspectKey: keyof ReviewAspectRatings) {
  aspectRatings.value[aspectKey] = null;
}

function clearMetric(metricKey: keyof ReviewMetrics) {
  metrics.value[metricKey] = null;
}

function onRatingChanged() {
  // Trigger reactivity
}

function onMetricChanged() {
  // Trigger reactivity
}

// Helper function to format date for date input (YYYY-MM-DD)
function formatDateForInput(epoch: number | null | undefined): string | null {
  if (!epoch) return null;
  const date = new Date(epoch);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper function to parse date input to epoch
function parseDateInput(dateString: string | null): number | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.getTime();
}

// Load existing review if editing
onMounted(async () => {
  isLoading.value = true;

  // Load game
  game = await gameService.getGame(props.gameId);
  if (game) {
    gameTags.value = game.tagIdList || [];
  }

  // Load existing review if editing
  if (props.existingReviewId) {
    const res = (await pouchdbService.getDocById(props.existingReviewId)) as Review;
    initialReview = res;
    reviewText.value = res.reviewText || "";
    dateReviewed.value = formatDateForInput(res.dateReviewed);
    if (res.aspectRatings) {
      aspectRatings.value = {
        story: res.aspectRatings.story ?? null,
        gameplay: res.aspectRatings.gameplay ?? null,
        novelty: res.aspectRatings.novelty ?? null,
        music: res.aspectRatings.music ?? null,
        artDesign: res.aspectRatings.artDesign ?? null,
        graphics: res.aspectRatings.graphics ?? null,
        performance: res.aspectRatings.performance ?? null,
        characters: res.aspectRatings.characters ?? null,
      };
    }
    if (res.metrics) {
      metrics.value = {
        difficulty: res.metrics.difficulty ?? null,
        nostalgia: res.metrics.nostalgia ?? null,
      };
    }
  } else {
    // Set default date reviewed to today for new reviews
    const today = new Date();
    dateReviewed.value = formatDateForInput(today.getTime());
  }

  isLoading.value = false;
});

async function okClicked() {
  if (!game || !game._id) {
    await dialogService.alert("Error", "Game not found.");
    return;
  }

  // Clean up null/undefined values from aspectRatings and metrics
  const cleanAspectRatings: ReviewAspectRatings = {};
  Object.keys(aspectRatings.value).forEach((key) => {
    const value = aspectRatings.value[key as keyof ReviewAspectRatings];
    if (value !== null && value !== undefined) {
      cleanAspectRatings[key as keyof ReviewAspectRatings] = value;
    }
  });

  const cleanMetrics: ReviewMetrics = {};
  Object.keys(metrics.value).forEach((key) => {
    const value = metrics.value[key as keyof ReviewMetrics];
    if (value !== null && value !== undefined) {
      cleanMetrics[key as keyof ReviewMetrics] = value;
    }
  });

  let review: Review = {
    $collection: Collection.REVIEW,
    gameId: game._id,
    reviewText: reviewText.value || null,
    aspectRatings: Object.keys(cleanAspectRatings).length > 0 ? cleanAspectRatings : undefined,
    metrics: Object.keys(cleanMetrics).length > 0 ? cleanMetrics : undefined,
    dateReviewed: parseDateInput(dateReviewed.value),
  };

  if (initialReview) {
    review = Object.assign({}, initialReview, review);
  }

  await reviewService.saveReview(review);

  // Update game tags when saving review
  game.tagIdList = gameTags.value.length > 0 ? gameTags.value : undefined;
  await gameService.saveGame(game);

  onDialogOK();
}
</script>

<style scoped lang="scss">
.add-review-dialog {
  min-width: 600px;
  max-width: 800px;
  width: 90vw;

  @media (max-width: 600px) {
    min-width: unset;
    max-width: 95vw;
    width: 95vw;
  }
}

.aspect-item {
  padding-bottom: 32px;

  &:last-child {
    padding-bottom: 16px;
  }
}

.rating-container {
  flex-wrap: wrap;
  min-width: 0; // Allow flex items to shrink

  @media (max-width: 600px) {
    // Ensure rating doesn't overflow on mobile
    max-width: 100%;
    width: 100%;

    // Make rating component responsive
    :deep(.q-rating) {
      flex-shrink: 1;
      max-width: 100%;
    }

    // Ensure text doesn't overflow
    > span {
      flex-shrink: 0;
      white-space: nowrap;
    }
  }
}

.overall-rating-value {
  font-size: 2.4em;
  font-weight: bold;
  width: 100%;
  padding: 4px 0;

  @media (max-width: 600px) {
    text-align: center;
    font-size: 1.4em;
    padding: 8px 0;
  }
}
</style>
