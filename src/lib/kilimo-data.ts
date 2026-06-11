export const COUNTIES = [
  "Mombasa","Kwale","Kilifi","Tana River","Lamu","Taita Taveta","Garissa","Wajir","Mandera",
  "Marsabit","Isiolo","Meru","Tharaka-Nithi","Embu","Kitui","Machakos","Makueni","Nyandarua",
  "Nyeri","Kirinyaga","Murang'a","Kiambu","Turkana","West Pokot","Samburu","Trans Nzoia",
  "Uasin Gishu","Elgeyo Marakwet","Nandi","Baringo","Laikipia","Nakuru","Narok","Kajiado",
  "Kericho","Bomet","Kakamega","Vihiga","Bungoma","Busia","Siaya","Kisumu","Homa Bay",
  "Migori","Kisii","Nyamira","Nairobi",
] as const;

export type EcoZone = "Highlands" | "Semi-Arid" | "Coastal & Tropical" | "Lake Basin";

const HIGHLANDS = new Set([
  "Kiambu","Nyeri","Uasin Gishu","Meru","Nyandarua","Kericho","Kirinyaga","Murang'a",
  "Embu","Tharaka-Nithi","Nandi","Bomet","Trans Nzoia","Elgeyo Marakwet","Laikipia",
  "Nakuru","Kisii","Nyamira","Kakamega","Vihiga","Bungoma",
]);
const SEMI_ARID = new Set([
  "Machakos","Kitui","Makueni","Garissa","Wajir","Kajiado","Mandera","Marsabit","Isiolo",
  "Turkana","West Pokot","Samburu","Baringo","Narok","Tana River",
]);
const COASTAL = new Set([
  "Kilifi","Kwale","Mombasa","Lamu","Taita Taveta",
]);
const LAKE_BASIN = new Set([
  "Kisumu","Siaya","Homa Bay","Migori","Busia","Nairobi",
]);

const CROP_MAP: Record<EcoZone, string[]> = {
  "Highlands": ["Maize","Potatoes","Cabbages","Tea","Coffee","Wheat"],
  "Semi-Arid": ["Sorghum","Millet","Green Grams (Ndengu)","Pigeon Peas","Cowpeas"],
  "Coastal & Tropical": ["Cassava","Coconuts","Cashew Nuts","Maize","Mangoes"],
  "Lake Basin": ["Rice","Maize","Sweet Potatoes","Beans","Sorghum"],
};

export function getEcoZone(county: string): EcoZone {
  if (HIGHLANDS.has(county)) return "Highlands";
  if (SEMI_ARID.has(county)) return "Semi-Arid";
  if (COASTAL.has(county)) return "Coastal & Tropical";
  if (LAKE_BASIN.has(county)) return "Lake Basin";
  return "Highlands";
}

export function getCropsForCounty(county: string): string[] {
  return CROP_MAP[getEcoZone(county)];
}

export const WATER_SOURCES = ["Rain-fed", "Borehole", "Drip-Irrigation"] as const;
