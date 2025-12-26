import { Collection } from "src/constants/constants";
import { Game, GameOwnershipEntry, GameUntrackedHistoryEntry } from "src/models/game";
import { GameStatus } from "src/models/game-status";
import { Platform } from "src/models/platform";
import { Tag } from "src/models/tag";
import { gameService } from "./game-service";
import { platformService } from "./platform-service";
import { tagService } from "./tag-service";

type CsvRow = {
  [key: string]: string;
};

type ImportResult = {
  gamesCreated: number;
  gamesSkipped: number;
  platformsCreated: number;
  platformsSkipped: number;
  errors: string[];
};

class BackupRestoreService {
  /**
   * Trims whitespace from all values in a CSV row
   */
  private trimRow(row: CsvRow): CsvRow {
    const trimmed: CsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      trimmed[key] = typeof value === "string" ? value.trim() : value;
    }
    return trimmed;
  }

  /**
   * Converts array to CSV string
   */
  private arrayToCsv(data: CsvRow[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const rows = data.map((row) => {
      return headers.map((header) => {
        const value = row[header] || "";
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
    });

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  /**
   * Parses CSV string into array of objects
   */
  private parseCsv(csvText: string): CsvRow[] {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return [];

    // Simple CSV parser (handles quoted fields)
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.trim());
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length !== headers.length) continue; // Skip malformed rows

      const row: CsvRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });
      rows.push(this.trimRow(row));
    }

    return rows;
  }

  /**
   * Exports all games to CSV format with flattened platform/ownership columns
   */
  async exportToCsv(): Promise<string> {
    const games = await gameService.listGames();
    const platforms = await platformService.listPlatforms();
    const tags = await tagService.listTags();

    // Create maps for quick lookup
    const platformMap = new Map<string, string>();
    platforms.forEach((p) => {
      if (p._id && p.name) {
        platformMap.set(p._id, p.name.trim());
      }
    });

    const tagMap = new Map<string, string>();
    tags.forEach((t) => {
      if (t._id && t.name) {
        tagMap.set(t._id, t.name.trim());
      }
    });

    // Find maximum number of platforms across all games to determine column count
    let maxPlatforms = 0;
    games.forEach((game) => {
      const platformCount = Math.max(
        game.ownershipList?.length || 0,
        game.platformIdList?.length || 0
      );
      maxPlatforms = Math.max(maxPlatforms, platformCount);
    });

    // Build headers
    const headers: string[] = [
      "Name",
      "Rating",
      "ReleaseDate",
      "IsRetroGame",
      "Tags",
      "TotalPlaytimeHours",
    ];

    // Add variadic platform columns
    for (let i = 1; i <= maxPlatforms; i++) {
      headers.push(`Platform${i}`, `Ownership${i}`, `Status${i}`, `LastPlayed${i}`);
    }

    // Export games
    const gameRows: CsvRow[] = await Promise.all(
      games.map(async (game) => {
        // Initialize row with all columns (core + all platform columns)
        const row: CsvRow = {
          Name: (game.name || "").trim(),
          Rating: game.rating !== null && game.rating !== undefined ? String(game.rating) : "",
          ReleaseDate: game.releaseDate ? new Date(game.releaseDate).toISOString().split("T")[0] : "",
          IsRetroGame: game.isRetroGame ? "Yes" : "No",
          Tags: "",
          TotalPlaytimeHours: "",
          LastPlayedDate: "",
        };

        // Calculate total playtime: untracked + session playtime
        const untrackedPlaytimeMs = game.untrackedPlaytime || 0;
        const sessionPlaytimeMs = await gameService.getTotalPlaytime(game._id!);
        const totalPlaytimeMs = untrackedPlaytimeMs + sessionPlaytimeMs;
        const totalPlaytimeHours = totalPlaytimeMs / (1000 * 60 * 60);
        row.TotalPlaytimeHours = totalPlaytimeHours > 0 ? totalPlaytimeHours.toFixed(2) : "";

      // Initialize all platform columns to empty strings
      for (let i = 1; i <= maxPlatforms; i++) {
        row[`Platform${i}`] = "";
        row[`Ownership${i}`] = "";
        row[`Status${i}`] = "";
        row[`LastPlayed${i}`] = "";
      }

      // Get tag names
      const tagNames: string[] = [];
      if (game.tagIdList) {
        game.tagIdList.forEach((tagId) => {
          const tagName = tagMap.get(tagId);
          if (tagName) {
            tagNames.push(tagName);
          }
        });
      }
      row.Tags = tagNames.join(", ").trim();

      // Process ownership and untracked history
      const ownershipList = game.ownershipList || [];
      const untrackedHistoryMap = new Map<string, GameUntrackedHistoryEntry>();
      if (game.untrackedHistoryList) {
        game.untrackedHistoryList.forEach((entry) => {
          untrackedHistoryMap.set(entry.platformId, entry);
        });
      }

      // If no ownershipList but platformIdList exists, create default ownership entries
      const platformsToProcess: Array<{ platformId: string; ownershipType: GameOwnershipEntry["ownershipType"] }> = [];
      if (ownershipList.length > 0) {
        ownershipList.forEach((entry) => {
          platformsToProcess.push({
            platformId: entry.platformId,
            ownershipType: entry.ownershipType,
          });
        });
      } else if (game.platformIdList && game.platformIdList.length > 0) {
        // Fallback: use platformIdList with default "owned" ownership
        game.platformIdList.forEach((platformId) => {
          platformsToProcess.push({
            platformId,
            ownershipType: "owned",
          });
        });
      }

      // Fill platform columns for all platforms
      platformsToProcess.forEach((entry, index) => {
        const colIndex = index + 1;
        const platformName = platformMap.get(entry.platformId) || "";
        const untracked = untrackedHistoryMap.get(entry.platformId);

        row[`Platform${colIndex}`] = platformName;
        row[`Ownership${colIndex}`] = entry.ownershipType;
        row[`Status${colIndex}`] = untracked?.status || "";
        row[`LastPlayed${colIndex}`] = untracked?.lastPlayedDate
          ? new Date(untracked.lastPlayedDate).toISOString().split("T")[0]
          : "";
      });

        return row;
      })
    );

    // Sort rows by Name
    gameRows.sort((a, b) => {
      const nameA = (a.Name || "").trim().toLowerCase();
      const nameB = (b.Name || "").trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return this.arrayToCsv(gameRows);
  }

  /**
   * Downloads CSV as a file
   */
  async downloadCsv(): Promise<void> {
    const csv = await this.exportToCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `playloop-backup-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports games from CSV file
   * Never duplicates platforms or games (by name, case-insensitive)
   */
  async importFromCsvFile(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      gamesCreated: 0,
      gamesSkipped: 0,
      platformsCreated: 0,
      platformsSkipped: 0,
      errors: [],
    };

    try {
      const text = await file.text();
      const rows = this.parseCsv(text);

      if (rows.length === 0) {
        result.errors.push("CSV file is empty or invalid");
        return result;
      }

      // Get existing data
      const existingGames = await gameService.listGames();
      const existingPlatforms = await platformService.listPlatforms();
      const existingTags = await tagService.listTags();

      // Create lookup maps (case-insensitive)
      const existingGameNames = new Set(
        existingGames.map((g) => (g.name || "").trim().toLowerCase())
      );
      const existingPlatformNames = new Map<string, Platform>();
      existingPlatforms.forEach((p) => {
        const name = (p.name || "").trim().toLowerCase();
        existingPlatformNames.set(name, p);
      });
      const existingTagNames = new Map<string, Tag>();
      existingTags.forEach((t) => {
        const name = (t.name || "").trim().toLowerCase();
        existingTagNames.set(name, t);
      });

      // Process rows
      const platformNameToId = new Map<string, string>(); // Track newly created platforms
      const tagNameToId = new Map<string, string>(); // Track tags (create if needed)

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          await this.importGame(
            row,
            existingGameNames,
            existingPlatformNames,
            platformNameToId,
            existingTagNames,
            tagNameToId,
            result
          );
        } catch (error) {
          result.errors.push(
            `Row ${i + 2}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      result.errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Imports a game from CSV row with variadic platform columns
   */
  private async importGame(
    row: CsvRow,
    existingGameNames: Set<string>,
    existingPlatformNames: Map<string, Platform>,
    platformNameToId: Map<string, string>,
    existingTagNames: Map<string, Tag>,
    tagNameToId: Map<string, string>,
    result: ImportResult
  ): Promise<void> {
    const name = (row.Name || "").trim();
    if (!name) {
      throw new Error("Game name is required");
    }

    const nameLower = name.toLowerCase();

    // Check if game already exists
    if (existingGameNames.has(nameLower)) {
      result.gamesSkipped++;
      return;
    }

    // Parse tags (create if they don't exist)
    const tagNames = (row.Tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const tagIds: string[] = [];

    for (const tagName of tagNames) {
      const tagNameLower = tagName.toLowerCase();
      let tagId: string | undefined;

      if (existingTagNames.has(tagNameLower)) {
        tagId = existingTagNames.get(tagNameLower)!._id;
      } else if (tagNameToId.has(tagNameLower)) {
        tagId = tagNameToId.get(tagNameLower);
      } else {
        // Create tag if it doesn't exist
        const newTag: Tag = {
          $collection: Collection.TAG,
          name: tagName,
          color: "#444444", // Default color
        };
        const saved = await tagService.saveTag(newTag);
        existingTagNames.set(tagNameLower, saved);
        tagNameToId.set(tagNameLower, saved._id!);
        tagId = saved._id;
      }

      if (tagId && !tagIds.includes(tagId)) {
        tagIds.push(tagId);
      }
    }

    // Parse rating
    let rating: number | null = null;
    const ratingStr = (row.Rating || "").trim();
    if (ratingStr) {
      const ratingNum = parseFloat(ratingStr);
      if (!isNaN(ratingNum)) {
        rating = ratingNum;
      }
    }

    // Parse release date
    let releaseDate: number | undefined;
    const releaseDateStr = (row.ReleaseDate || "").trim();
    if (releaseDateStr) {
      const date = new Date(releaseDateStr);
      if (!isNaN(date.getTime())) {
        releaseDate = date.getTime();
      }
    }

    // Parse isRetroGame
    const isRetroGameStr = (row.IsRetroGame || "").trim().toLowerCase();
    const isRetroGame = isRetroGameStr === "yes" || isRetroGameStr === "true" || isRetroGameStr === "1";

    // Parse total playtime (for setting untracked playtime baseline)
    let untrackedPlaytime: number | undefined;
    const totalPlaytimeHoursStr = (row.TotalPlaytimeHours || "").trim();
    if (totalPlaytimeHoursStr) {
      const totalPlaytimeHours = parseFloat(totalPlaytimeHoursStr);
      if (!isNaN(totalPlaytimeHours) && totalPlaytimeHours > 0) {
        // When importing, the total playtime becomes the baseline untracked playtime
        // (since we don't import sessions, all playtime is "untracked")
        untrackedPlaytime = totalPlaytimeHours * 1000 * 60 * 60; // Convert hours to milliseconds
      }
    }

    // Parse variadic platform columns
    const ownershipList: GameOwnershipEntry[] = [];
    const untrackedHistoryList: GameUntrackedHistoryEntry[] = [];
    const platformIds: string[] = [];

    // Find all platform columns (Platform1, Platform2, etc.)
    let platformIndex = 1;
    while (true) {
      const platformName = (row[`Platform${platformIndex}`] || "").trim();
      if (!platformName) {
        break; // No more platforms
      }

      // Get or create platform
      const platformNameLower = platformName.toLowerCase();
      let platformId: string | undefined;

      if (existingPlatformNames.has(platformNameLower)) {
        platformId = existingPlatformNames.get(platformNameLower)!._id;
        result.platformsSkipped++;
      } else if (platformNameToId.has(platformNameLower)) {
        platformId = platformNameToId.get(platformNameLower);
        result.platformsSkipped++;
      } else {
        // Create platform if it doesn't exist
        const newPlatform: Platform = {
          $collection: Collection.PLATFORM,
          name: platformName,
        };
        const saved = await platformService.savePlatform(newPlatform);
        existingPlatformNames.set(platformNameLower, saved);
        platformNameToId.set(platformNameLower, saved._id!);
        platformId = saved._id;
        result.platformsCreated++;
      }

      if (platformId) {
        platformIds.push(platformId);

        // Parse ownership
        const ownershipTypeStr = (row[`Ownership${platformIndex}`] || "").trim().toLowerCase();
        const validOwnershipTypes: GameOwnershipEntry["ownershipType"][] = [
          "owned",
          "borrowed",
          "rented",
          "gifted",
          "other",
        ];
        const ownershipType: GameOwnershipEntry["ownershipType"] = validOwnershipTypes.includes(
          ownershipTypeStr as GameOwnershipEntry["ownershipType"]
        )
          ? (ownershipTypeStr as GameOwnershipEntry["ownershipType"])
          : "owned"; // Default to "owned"

        ownershipList.push({
          platformId,
          ownershipType,
        });

        // Parse untracked history (status and lastPlayedDate)
        const statusStr = (row[`Status${platformIndex}`] || "").trim();
        const lastPlayedStr = (row[`LastPlayed${platformIndex}`] || "").trim();

        if (statusStr) {
          const validStatuses: GameStatus[] = ["completed", "in-progress", "on-hold", "dropped"];
          const status: GameStatus = validStatuses.includes(statusStr as GameStatus)
            ? (statusStr as GameStatus)
            : "in-progress"; // Default status

          let lastPlayedDate: number | undefined;
          if (lastPlayedStr) {
            const date = new Date(lastPlayedStr);
            if (!isNaN(date.getTime())) {
              lastPlayedDate = date.getTime();
            }
          }

          untrackedHistoryList.push({
            platformId,
            status,
            lastPlayedDate,
          });
        }
      }

      platformIndex++;
    }

    // Create game
    const game: Game = {
      $collection: Collection.GAME,
      name: name,
      platformIdList: platformIds, // Keep for backward compatibility
      ownershipList: ownershipList.length > 0 ? ownershipList : undefined,
      untrackedHistoryList: untrackedHistoryList.length > 0 ? untrackedHistoryList : undefined,
      untrackedPlaytime: untrackedPlaytime,
      tagIdList: tagIds.length > 0 ? tagIds : undefined,
      rating: rating,
      releaseDate: releaseDate,
      isRetroGame: isRetroGame,
    };

    await gameService.saveGame(game);
    existingGameNames.add(nameLower);
    result.gamesCreated++;
  }
}

export const backupRestoreService = new BackupRestoreService();
