export const DEFAULT_REMOTE_SERVER_URL = "https://cluster-1.playloop.website";

export type ServerOption = {
  label: string;
  value: string;
};

export const serverOptions: ServerOption[] = [
  { label: "Playloop (Cluster 1)", value: "cluster-1" },
  { label: "Playloop (Cluster 2)", value: "cluster-2" },
  { label: "Self Hosted", value: "self-hosted" },
];

export const OFFLINE_SERVER_URL = "offline";
export const OFFLINE_DOMAIN = "offline";
