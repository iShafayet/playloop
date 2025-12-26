<template>
  <q-page class="row items-center justify-evenly">
    <q-card class="std-card">
      <div class="title-row q-pa-md q-gutter-sm">
        <div class="title">Backup & Restore</div>
      </div>

      <div class="q-pa-md">
        <div class="section-title q-mb-md">Export Data</div>
        <div class="control-group q-pa-md q-mb-md">
          <div class="control-title q-mb-sm">
            Export all your games and platforms to a CSV file. This file can be used to restore your data later.
          </div>
          <q-btn
            color="primary"
            text-color="white"
            label="Export to CSV"
            icon="download"
            @click="exportClicked"
            :loading="isExporting"
          />
        </div>

        <q-separator class="q-my-md" />

        <div class="section-title q-mb-md">Import Data</div>
        <div class="control-group q-pa-md q-mb-md">
          <div class="control-title q-mb-sm">
            Import games and platforms from a CSV file. Duplicate platforms and games (by name) will be skipped.
          </div>
          <q-btn
            color="secondary"
            text-color="white"
            label="Import from CSV"
            icon="upload"
            @click="importClicked"
            :loading="isImporting"
          />
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            style="display: none"
            @change="handleFileSelected"
          />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { backupRestoreService } from "src/services/backup-restore-service";
import { dialogService } from "src/services/dialog-service";
import { ref } from "vue";

const $q = useQuasar();
const fileInput = ref<HTMLInputElement | null>(null);
const isExporting = ref(false);
const isImporting = ref(false);

async function exportClicked() {
  isExporting.value = true;
  try {
    await backupRestoreService.downloadCsv();
    dialogService.notify("Export completed successfully!", "positive");
  } catch (error) {
    dialogService.notify(
      `Export failed: ${error instanceof Error ? error.message : String(error)}`,
      "negative"
    );
  } finally {
    isExporting.value = false;
  }
}

function importClicked() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const answer = await dialogService.confirm(
    "Import CSV",
    "This will import games and platforms from the CSV file. Duplicate platforms and games (by name) will be skipped. Continue?"
  );
  if (!answer) {
    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = "";
    }
    return;
  }

  isImporting.value = true;
  try {
    const result = await backupRestoreService.importFromCsvFile(file);

    // Create formatted HTML content
    const htmlContent = `
      <div style="padding: 8px 0;">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 18px; font-weight: 600; color: #1976d2; margin-bottom: 12px;">
            ✓ Import Completed
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div style="background: #e8f5e9; padding: 12px; border-radius: 4px;">
            <div style="font-weight: 600; color: #2e7d32; margin-bottom: 4px;">Games Created</div>
            <div style="font-size: 24px; color: #1b5e20; font-weight: 700;">${result.gamesCreated}</div>
          </div>
          <div style="background: #fff3e0; padding: 12px; border-radius: 4px;">
            <div style="font-weight: 600; color: #e65100; margin-bottom: 4px;">Games Skipped</div>
            <div style="font-size: 24px; color: #bf360c; font-weight: 700;">${result.gamesSkipped}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">(duplicates)</div>
          </div>
          <div style="background: #e8f5e9; padding: 12px; border-radius: 4px;">
            <div style="font-weight: 600; color: #2e7d32; margin-bottom: 4px;">Platforms Created</div>
            <div style="font-size: 24px; color: #1b5e20; font-weight: 700;">${result.platformsCreated}</div>
          </div>
          <div style="background: #fff3e0; padding: 12px; border-radius: 4px;">
            <div style="font-weight: 600; color: #e65100; margin-bottom: 4px;">Platforms Skipped</div>
            <div style="font-size: 24px; color: #bf360c; font-weight: 700;">${result.platformsSkipped}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">(duplicates)</div>
          </div>
        </div>
        ${
          result.errors.length > 0
            ? `
          <div style="margin-top: 16px; padding: 12px; background: #ffebee; border-radius: 4px; border-left: 4px solid #c62828;">
            <div style="font-weight: 600; color: #c62828; margin-bottom: 8px;">
              ⚠ Errors (${result.errors.length})
            </div>
            <div style="max-height: 200px; overflow-y: auto; font-size: 12px; color: #424242;">
              ${result.errors
                .slice(0, 10)
                .map((error) => `<div style="margin: 4px 0;">• ${error}</div>`)
                .join("")}
              ${
                result.errors.length > 10
                  ? `<div style="margin-top: 8px; font-style: italic; color: #666;">... and ${result.errors.length - 10} more errors</div>`
                  : ""
              }
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    // Use Quasar Dialog with HTML
    await new Promise<void>((resolve) => {
      $q.dialog({
        title: "CSV Import Results",
        html: true,
        message: htmlContent,
        ok: {
          label: "OK",
          color: "primary",
        },
      })
        .onOk(() => {
          resolve();
        })
        .onDismiss(() => {
          resolve();
        });
    });
  } catch (error) {
    await dialogService.alert(
      "Error",
      `Failed to import CSV: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    isImporting.value = false;
    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = "";
    }
  }
}
</script>

<style scoped lang="scss">
.section-title {
  font-size: 1.2em;
  font-weight: bold;
  color: #3b3b3b;
}

.control-group {
  background-color: rgb(244, 244, 244);
  border-radius: 4px;
}

.control-title {
  color: #3b3b3b;
  margin-bottom: 12px;
}
</style>

