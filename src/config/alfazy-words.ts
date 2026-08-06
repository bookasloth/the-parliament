/**
 * Alfazy dictionary source list (curated common 5-letter words).
 *
 * This array is NOT read at runtime — the live daily word comes from the
 * `alfazy_words` DB table (see getDailyPuzzle). It exists only to GENERATE the
 * seed SQL / seed script deterministically. Order here = the `idx` sequence, so
 * appending new words is safe (existing puzzle numbers keep their word); do not
 * reorder or remove entries or past puzzles/leaderboards shift.
 *
 * Invariant (asserted by scripts/gen-alfazy-words-sql.ts): every entry is a
 * unique, uppercase, exactly-5-letter word.
 */
export const ALFAZY_WORDS: string[] = [
  "CRANE", "SLOTH", "HOUSE", "PIXEL", "BRAVE", "MANGO", "RIVER", "TIGER", "LEMON", "CLOUD",
  "PLANT", "STORM", "GRAPE", "OCEAN", "FLAME", "MUSIC", "DANCE", "LIGHT", "EARTH", "SMILE",
  "HEART", "DREAM", "SHINE", "PEACE", "GLORY", "FAITH", "TRUST", "POWER", "SPARK", "BLOOM",
  "QUEST", "NOBLE", "SWIFT", "PROUD", "SHARP", "CLEAN", "FRESH", "GRAND", "MIGHT", "PRIDE",
  "CHESS", "PIANO", "DRUMS", "PAINT", "BRUSH", "STAGE", "SCENE", "STORY", "NOVEL", "VERSE",
  "MEDAL", "CROWN", "TITLE", "AWARD", "PRIZE", "SCORE", "BOARD", "MATCH", "ROUND", "FINAL",
  "ALPHA", "OMEGA", "DELTA", "GAMMA", "SIGMA", "THETA", "KAPPA", "LOTUS", "NADIR", "ZESTY",
  "APPLE", "BERRY", "MELON", "PEACH", "OLIVE", "WHEAT", "MAIZE", "SPICE", "HONEY", "COCOA",
  "BEACH", "RIDGE", "GROVE", "FIELD", "MARSH", "CREEK", "COAST", "CLIFF", "DELLS", "BAYOU",
  "AMBER", "CORAL", "IVORY", "PEARL", "TOPAZ", "SLATE", "MAUVE", "BEIGE", "LILAC", "GREEN",
  "BLAZE", "EMBER", "FROST", "MISTY", "SUNNY", "WINDY", "RAINY", "SNOWY", "CLEAR", "HAZEL",
  "EAGLE", "ROBIN", "FINCH", "HERON", "STORK", "RAVEN", "CROWS", "DOVES", "LARKS", "QUAIL",
  "LIONS", "BEARS", "FOXES", "MOOSE", "OTTER", "PANDA", "KOALA", "CAMEL", "HORSE", "ZEBRA",
  "STONE", "BRICK", "STEEL", "GLASS", "METAL", "WOODS", "PAPER", "CLOTH", "LINEN", "SHELL",
  "SUGAR", "CANDY", "CREAM", "BREAD", "TOAST", "PASTA", "CURRY", "SAUCE", "BROTH", "SALAD",
  "SCARF", "GLOVE", "BOOTS", "DRESS", "SHIRT", "JEANS", "SKIRT", "CLOAK", "ROBES", "SHAWL",
  "TRACK", "ROUTE", "ALLEY", "LANES", "PATHS", "GATES", "YARDS", "PLAZA", "TOWER", "VILLA",
  "BOOKS", "PAGES", "WORDS", "LINES", "NOTES", "DIARY", "ATLAS", "TALES", "MYTHS", "FABLE",
  "CHAIR", "TABLE", "COUCH", "SHELF", "LAMPS", "CLOCK", "FRAME", "VASES", "BOWLS", "PLATE",
  "SMART", "QUICK", "FLEET", "AGILE", "ALERT", "WISER", "BRISK", "SAVVY", "SHREW", "KEENS",
];
