<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated v-if="userStore.isUserLoggedIn">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          {{ route.meta.title || "Playloop" }}
        </q-toolbar-title>

        <!-- Offline Indicator -->
        <div v-if="userStore.currentUser?.isOfflineUser" class="offline-indicator-container" @click="goToOnlinePage">
          <q-icon name="offline_bolt" color="orange" size="20px" />
          <span class="offline-indicator-text">Offline</span>
          <q-tooltip>Click to go online and sync across devices</q-tooltip>
        </div>

        <!-- Sync Spinner -->
        <div v-if="syncService.status.value.isBackgroundSyncing" class="sync-spinner-container">
          <q-spinner color="white" size="20px" :thickness="3" />
          <span class="sync-spinner-text">Syncing...</span>
        </div>

        <div v-if="route.meta.title && !isDevDatabase && !isDevMachine">Playloop</div>
        <div class="dev-mode-notification" v-if="isDevDatabase">DEV DB</div>
        <div class="dev-mode-warning" v-if="!isDevDatabase && isDevMachine && !isOfflineDatabase">PROD DB in DEV ENV</div>

        <q-btn flat dense round icon="perm_identity">
          <q-menu>
            <q-list style="min-width: 150px">
              <q-item clickable v-close-popup @click="fullSyncClicked" :disable="syncService.isSyncing()">
                <q-item-section>Sync</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="hardRefreshClicked">
                <q-item-section>Hard Refresh</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="logoutClicked">
                <q-item-section>Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer class="std-column main-left-sidebar-drawer" v-model="leftDrawerOpen" show-if-above bordered v-if="userStore.isUserLoggedIn">
      <q-list>
        <q-item-label header> GAMING </q-item-label>
        <EssentialLink v-for="link in gamingList" :key="link.title" v-bind="link" />
      </q-list>

      <q-list>
        <q-item-label header> ADVANCED </q-item-label>
        <EssentialLink v-for="link in advancedList" :key="link.title" v-bind="link" />
      </q-list>

      <q-list>
        <q-item-label header> MISC </q-item-label>
        <EssentialLink v-for="link in miscList" :key="link.title" v-bind="link" />
      </q-list>

      <div style="flex: 1"></div>

      <div class="drawer-bottom">
        <div class="app-version">
          <img class="logo" src="icons/android-chrome-192x192.png" alt="PL" />
          <div @click="verionClicked" style="cursor: pointer">
            <div style="font-size: 16px">Playloop</div>
            <div style="font-size: 10px; color: rgb(187, 186, 186)">Version: {{ APP_VERSION }} (Alpha)</div>
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import EssentialLink from "src/components/sidebar/EssentialLink.vue";
import { useQuasar } from "quasar";
import { OFFLINE_DOMAIN } from "src/constants/auth-constants";
import { APP_BUILD_DATE, APP_BUILD_VERSION, APP_VERSION } from "src/constants/config-constants";
import { authService } from "src/services/auth-service";
import { dialogService } from "src/services/dialog-service";
import { syncService } from "src/services/sync-service";
import { useUserStore } from "src/stores/user";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();

const gamingList = [
  {
    title: "Dashboard",
    caption: "Overview and statistics",
    icon: "dashboard",
    link: "#/dashboard",
  },
  {
    title: "Games",
    caption: "Manage your game library",
    icon: "sports_esports",
    link: "#/games",
  },
  {
    title: "Sessions",
    caption: "Gaming sessions",
    icon: "play_circle",
    link: "#/sessions",
  },
  {
    title: "Platforms",
    caption: "Game platforms",
    icon: "devices",
    link: "#/platforms",
  },
  {
    title: "Tags",
    caption: "Game tags",
    icon: "label",
    link: "#/tags",
  },
];

const advancedList = computed(() => {
  const list: any[] = [
    {
      title: "Pro Mode - Games",
      caption: "Bulk edit games",
      icon: "table_chart",
      link: "#/pro-mode-games",
    },
  ];
  if (userStore.currentUser?.isOfflineUser) {
    list.push({
      title: "Go Online",
      caption: "",
      icon: "cloud_sync",
      link: "#/go-online",
    });
  }
  return list;
});

const miscList = [
  {
    title: "Memos",
    caption: "",
    icon: "edit_note",
    link: "#/memos",
  },
  {
    title: "Settings",
    caption: "",
    icon: "settings",
    link: "#/settings",
  },
  {
    title: "Debug",
    caption: "",
    icon: "bug_report",
    link: "#/debug",
  },
  {
    title: "About",
    caption: "",
    icon: "contact_support",
    link: "#/about",
  },
];

const leftDrawerOpen = ref(false);
const isDevDatabase = ref(false);
const isDevMachine = ref(false);
const isOfflineDatabase = ref(false);

const userStore = useUserStore();
const $q = useQuasar();
const router = useRouter();

function determineMode() {
  isDevDatabase.value = false;
  isDevMachine.value = false;
  if (userStore.user && (userStore.user.domain.indexOf("test") > -1 || userStore.user.domain.indexOf("-sit-") > -1)) {
    isDevDatabase.value = true;
  }

  if (window.location.host.indexOf("localhost") > -1 || window.location.host.indexOf("127.0.0.1") > -1) {
    isDevMachine.value = true;
  }

  isOfflineDatabase.value = (userStore.user?.isOfflineUser || false) && userStore.user?.domain === OFFLINE_DOMAIN;
}

userStore.$subscribe(determineMode);
onMounted(() => {
  determineMode();
  syncService.setUpPouchdbListener();
  handleRouteChange(route.fullPath, null);
  informApplicationHasLoaded();
});

function informApplicationHasLoaded() {
  console.debug("informApplicationHasLoaded");
  // @ts-ignore
  window.__lm__hasLoaded = true;
}

async function logoutClicked() {
  let [successful, failureReason] = await authService.logout();
  if (!successful) {
    await dialogService.alert("Logout Error", failureReason as string);
    return;
  }
  // Navigate to post-logout page instead of reloading
  await router.push({ name: "post-logout" });
}

function fullSyncClicked() {
  if (userStore.currentUser?.isOfflineUser) {
    router.push({ name: "go-online" });
    return;
  }
  syncService.doFullSync($q, true, "MainLayout");
}

async function verionClicked() {
  const title = `Version ${APP_VERSION}`;
  const body = `Internal Build: ${APP_BUILD_VERSION}, Release Date: ${APP_BUILD_DATE}`;
  await dialogService.alert(title, body);
}

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function goToOnlinePage() {
  await router.push({ name: "go-online" });
}

function handleRouteChange(newPath: string, oldPath: string | null) {
  const newRoute = route;
  const oldRoute = router.resolve(oldPath || "/");
  if (newRoute.meta && newRoute.meta.preferLeftDrawerClosed) {
    leftDrawerOpen.value = false;
  } else if (oldRoute.meta && oldRoute.meta.preferLeftDrawerClosed) {
    leftDrawerOpen.value = true;
  }
}

watch(() => route.fullPath, handleRouteChange);

function hardRefreshClicked() {
  console.debug("hardRefreshClicked");
  window.location.href = "/";
  // @ts-ignore
  // window.location.reload(true);
}

onUnmounted(() => {
  // Cleanup if needed
});
</script>

<style scoped lang="scss">
.offline-indicator-container {
  display: flex;
  align-items: center;
  margin-right: 16px;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(255, 165, 0, 0.1);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 165, 0, 0.2);
  }
}

.offline-indicator-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.sync-spinner-container {
  display: flex;
  align-items: center;
  margin-right: 16px;
  gap: 8px;
}

.sync-spinner-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.drawer-bottom {
  margin-top: 8px;
  background: rgb(29, 29, 29);
  padding: 18px;
  font-size: 12px;
  color: whitesmoke;
}

.app-version {
  display: flex;
  align-items: start;
}

.logo {
  margin-right: 8px;
  margin-bottom: 4px;
  width: 40px;
  height: 40px;
}

.dev-mode-notification {
  background-color: yellow;
  color: black;
  padding: 0px 8px;
  font-weight: bold;
}

.dev-mode-warning {
  background-color: red;
  color: black;
  padding: 0px 8px;
  font-weight: bold;
}
</style>
