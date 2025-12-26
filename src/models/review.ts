export type ReviewAspectRatings = {
  story?: number | null; // 0-10
  gameplay?: number | null; // 0-10
  novelty?: number | null; // 0-10
  music?: number | null; // 0-10
  artDesign?: number | null; // 0-10
  graphics?: number | null; // 0-10
  performance?: number | null; // 0-10
  characters?: number | null; // 0-10
};

export type ReviewMetrics = {
  difficulty?: number | null; // 0-10
  nostalgia?: number | null; // 0-10
};

export type Review = {
  _id?: string;
  _rev?: string;
  $collection: string;
  gameId: string;
  reviewText?: string | null;
  aspectRatings?: ReviewAspectRatings;
  metrics?: ReviewMetrics;
  dateReviewed?: number | null; // epoch timestamp - when the review was written
  createdAt?: number; // epoch timestamp
  updatedAt?: number; // epoch timestamp
};

