import { controlResponseTypes } from "./controlResponseTypes";
import { controlRoutesCatalog } from "../../shared/controlRoutesCatalog";

export function controlCatalogJson(baseUrl: string, tokenHint: string) {
  return {
    name: "birdsong-control",
    baseUrl,
    auth: {
      type: "bearer",
      header: "Authorization: Bearer <token>",
      tokenFrom: "~/.birdsong/control.json",
      note: tokenHint,
    },
    errors: "Non-200 responses are an Error shape.",
    /** Shapes named by route `response` fields (e.g. "Session", "TranscriptTurn[]"). */
    types: controlResponseTypes,
    routes: controlRoutesCatalog(baseUrl),
  };
}
