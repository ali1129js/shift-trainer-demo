/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: "local" | "http";
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
