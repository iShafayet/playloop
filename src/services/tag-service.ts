import { Collection } from "src/constants/constants";
import { Tag } from "src/models/tag";
import { pouchdbService } from "./pouchdb-service";

class TagService {
  async getTagList(tagIdList: string[]): Promise<Tag[]> {
    const docList = (await pouchdbService.listByCollection(Collection.TAG)).docs as Tag[];
    return docList.filter((tag) => tagIdList.includes(tag._id!));
  }
}

export const tagService = new TagService();
