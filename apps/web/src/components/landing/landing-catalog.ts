import type { LandingSource, WallSource } from "./landing-model";

// Vite replaces this with public presets; no server modules enter the client.
declare const __LANDING_CATALOG__: {
	sources: LandingSource[];
	wall: WallSource[];
};
export const landingCatalog = __LANDING_CATALOG__;
