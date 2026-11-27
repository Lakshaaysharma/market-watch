/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the WebSocket address, e.g. when the API is on another host. */
  readonly VITE_WS_URL?: string;
}
