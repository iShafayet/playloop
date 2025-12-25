import { Collection } from "src/constants/constants";
import { Tag } from "src/models/tag";
import { pouchdbService } from "./pouchdb-service";

class TagService {
  async listTags(): Promise<Tag[]> {
    const res = await pouchdbService.listByCollection(Collection.TAG);
    return res.docs as Tag[];
  }

  async getTagList(tagIdList: string[]): Promise<Tag[]> {
    const docList = (await pouchdbService.listByCollection(Collection.TAG)).docs as Tag[];
    return docList.filter((tag) => tagIdList.includes(tag._id!));
  }

  async saveTag(tag: Tag): Promise<Tag> {
    if (!tag.$collection) {
      tag.$collection = Collection.TAG;
    }
    const saved = await pouchdbService.upsertDoc(tag);
    return saved as Tag;
  }

  async deleteTag(tag: Tag): Promise<void> {
    await pouchdbService.removeDoc(tag);
  }
}

export const tagService = new TagService();
