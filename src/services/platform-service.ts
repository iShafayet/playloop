import { Collection } from "src/constants/constants";
import { Platform } from "src/models/platform";
import { pouchdbService } from "./pouchdb-service";

class PlatformService {
  async listPlatforms(): Promise<Platform[]> {
    const res = await pouchdbService.listByCollection(Collection.PLATFORM);
    return res.docs as Platform[];
  }

  async getPlatform(platformId: string): Promise<Platform | null> {
    try {
      const doc = (await pouchdbService.getDocById(platformId)) as Platform;
      return doc;
    } catch (error) {
      return null;
    }
  }

  async savePlatform(platform: Platform): Promise<Platform> {
    if (!platform.$collection) {
      platform.$collection = Collection.PLATFORM;
    }
    const saved = await pouchdbService.upsertDoc(platform);
    return saved as Platform;
  }

  async deletePlatform(platform: Platform): Promise<void> {
    await pouchdbService.removeDoc(platform);
  }
}

export const platformService = new PlatformService();

