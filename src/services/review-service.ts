import { Collection } from "src/constants/constants";
import { Review } from "src/models/review";
import { pouchdbService } from "./pouchdb-service";

class ReviewService {
  async getReviewByGameId(gameId: string): Promise<Review | null> {
    try {
      const res = await pouchdbService.listByCollection(Collection.REVIEW);
      const reviews = res.docs as Review[];
      const review = reviews.find((r) => r.gameId === gameId);
      return review || null;
    } catch (error) {
      return null;
    }
  }

  async saveReview(review: Review): Promise<Review> {
    if (!review.$collection) {
      review.$collection = Collection.REVIEW;
    }
    
    const now = Date.now();
    if (!review._id) {
      review.createdAt = now;
    }
    review.updatedAt = now;
    
    const saved = await pouchdbService.upsertDoc(review);
    return saved as Review;
  }

  async deleteReview(review: Review): Promise<void> {
    await pouchdbService.removeDoc(review);
  }

  calculateAverageRating(aspectRatings?: Review["aspectRatings"]): number | null {
    if (!aspectRatings) {
      return null;
    }

    const ratings: number[] = [];
    const aspects = ["story", "gameplay", "novelty", "music", "artDesign", "graphics", "performance", "characters"] as const;
    
    aspects.forEach((aspect) => {
      const rating = aspectRatings[aspect];
      if (rating !== null && rating !== undefined) {
        ratings.push(rating);
      }
    });

    if (ratings.length === 0) {
      return null;
    }

    const sum = ratings.reduce((acc, val) => acc + val, 0);
    return sum / ratings.length;
  }
}

export const reviewService = new ReviewService();

