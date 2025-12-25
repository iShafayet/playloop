import { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("pages/GamesListPage.vue"),
        meta: { requiresAuthentication: true, title: null },
      },
      {
        path: "login",
        name: "login",
        component: () => import("pages/LoginPage.vue"),
        meta: { requiresAuthentication: false, title: null },
      },
      {
        path: "post-logout",
        name: "post-logout",
        component: () => import("pages/PostLogoutPage.vue"),
        meta: { requiresAuthentication: false, title: null },
      },
      {
        path: "offline-onboarding",
        name: "offline-onboarding",
        component: () => import("pages/OfflineOnboardingPage.vue"),
        meta: { requiresAuthentication: false, title: null },
      },
      {
        path: "go-online",
        name: "go-online",
        component: () => import("pages/GoOnlinePage.vue"),
        meta: { requiresAuthentication: true, title: "Go Online" },
      },
      // --- Gaming:
      {
        path: "games",
        name: "games",
        component: () => import("pages/GamesListPage.vue"),
        meta: { requiresAuthentication: true, title: "Games", rememberable: true },
      },
      {
        path: "game/:gameId",
        name: "game",
        component: () => import("pages/SingleGamePage.vue"),
        meta: { requiresAuthentication: true, title: "Game Details", rememberable: false },
      },
      {
        path: "platforms",
        name: "platforms",
        component: () => import("pages/PlatformsPage.vue"),
        meta: { requiresAuthentication: true, title: "Platforms", rememberable: true },
      },
      {
        path: "sessions",
        name: "sessions",
        component: () => import("pages/SessionsPage.vue"),
        meta: { requiresAuthentication: true, title: "Gaming Sessions", rememberable: true },
      },
      {
        path: "pro-mode-games",
        name: "pro-mode-games",
        component: () => import("pages/ProModeGamesPage.vue"),
        meta: { requiresAuthentication: true, title: "Pro Mode - Games", rememberable: true, preferLeftDrawerClosed: true },
      },
      // --- Misc:
      {
        path: "memos",
        name: "memos",
        component: () => import("pages/MemosPage.vue"),
        meta: { requiresAuthentication: true, title: "Memos", rememberable: true },
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("pages/SettingsPage.vue"),
        meta: { requiresAuthentication: true, title: "Settings", rememberable: true },
      },
      {
        path: "debug",
        name: "debug",
        component: () => import("pages/DebugPage.vue"),
        meta: { requiresAuthentication: true, title: "Debug", rememberable: true },
      },
      {
        path: "audit-log",
        name: "audit-log",
        component: () => import("pages/AuditLogPage.vue"),
        meta: { requiresAuthentication: true, title: "Audit Log", rememberable: true },
      },
      {
        path: "about",
        name: "about",
        component: () => import("pages/AboutPage.vue"),
        meta: { requiresAuthentication: false, title: "About", rememberable: false },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
    meta: { requiresAuthentication: false },
  },
];

export default routes;
