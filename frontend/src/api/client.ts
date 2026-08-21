import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";

const DEFAULT_BASE_URL = "http://localhost:4010";

function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim() !== "") {
    return fromEnv.trim();
  }
  return DEFAULT_BASE_URL;
}

export const apiClient = createClient<paths>({
  baseUrl: resolveBaseUrl(),
});
