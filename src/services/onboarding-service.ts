import { User } from "src/models/user";
import { useUserStore } from "src/stores/user";
import { pouchdbService } from "./pouchdb-service";
import { Collection, defaultTagColor } from "src/constants/constants";
import { Platform } from "src/models/platform";
import { Tag } from "src/models/tag";
import { sleep } from "src/utils/misc-utils";
import { OFFLINE_DOMAIN, OFFLINE_SERVER_URL } from "src/constants/auth-constants";

const userStore = useUserStore();

export type OnboardingProgress = {
  step: string;
  progress: number;
  message: string;
};

class OnboardingService {
  /**
   * Creates an offline user with the given username
   */
  async createOfflineUser(username: string): Promise<User> {
    const user: User = {
      domain: OFFLINE_DOMAIN,
      serverUrl: OFFLINE_SERVER_URL,
      username,
      loginAt: Date.now(),
      isOfflineUser: true,
      hasCompletedOnboarding: false,
    };

    userStore.setUser(user);
    return user;
  }

  /**
   * Sets up default accounts and entities for offline user
   */
  async setupDefaultAccounts(progressCallback?: (progress: OnboardingProgress) => void): Promise<void> {
    const steps = [
      { message: "Creating game platforms...", weight: 40 },
      { message: "Creating default tags...", weight: 30 },
      { message: "Finalizing setup...", weight: 30 },
    ];

    let currentProgress = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (progressCallback) {
        progressCallback({
          step: step.message,
          progress: currentProgress,
          message: step.message,
        });
      }

      await sleep(300); // Simulate work being done

      switch (i) {
        case 0:
          await this.createDefaultPlatforms();
          break;
        case 1:
          await this.createDefaultTags();
          break;
        case 2:
          await this.finalizeSetup();
          break;
      }

      currentProgress += step.weight;

      if (progressCallback) {
        progressCallback({
          step: step.message,
          progress: currentProgress,
          message: step.message,
        });
      }
    }
  }

  /**
   * Creates default platforms
   */
  private async createDefaultPlatforms(): Promise<void> {
    const platforms = [
      { name: "PC", notes: "Personal Computer" },
      { name: "PlayStation 5", notes: "Sony PlayStation 5" },
      { name: "PlayStation 4", notes: "Sony PlayStation 4" },
      { name: "Xbox Series X|S", notes: "Microsoft Xbox Series X|S" },
      { name: "Xbox One", notes: "Microsoft Xbox One" },
      { name: "Nintendo Switch", notes: "Nintendo Switch" },
      { name: "Nintendo 3DS", notes: "Nintendo 3DS" },
      { name: "Steam Deck", notes: "Valve Steam Deck" },
      { name: "Mobile", notes: "Mobile devices (iOS/Android)" },
      { name: "Other", notes: "Other platforms" },
    ];

    for (const platform of platforms) {
      const platformDoc: Platform = {
        $collection: Collection.PLATFORM,
        name: platform.name,
        notes: platform.notes,
      };
      await pouchdbService.upsertDoc(platformDoc);
    }
  }

  /**
   * Creates default tags
   */
  private async createDefaultTags(): Promise<void> {
    const tags = [
      { name: "Nostalgia", color: "#9C27B0" },
      { name: "Hidden Gem", color: "#00BCD4" },
      { name: "Favorite", color: "#FF9800" },
      { name: "Recommended", color: "#4CAF50" },
    ];

    for (const tag of tags) {
      const tagDoc: Tag = {
        $collection: Collection.TAG,
        name: tag.name,
        color: tag.color,
      };
      await pouchdbService.upsertDoc(tagDoc);
    }
  }

  /**
   * Finalizes the setup process
   */
  private async finalizeSetup(): Promise<void> {
    // Additional setup tasks can be added here
    await sleep(500);
  }

  /**
   * Completes the onboarding process
   */
  async completeOnboarding(): Promise<void> {
    const currentUser = userStore.currentUser;
    if (currentUser) {
      currentUser.hasCompletedOnboarding = true;
      userStore.setUser(currentUser);
    }
  }
}

export const onboardingService = new OnboardingService();
