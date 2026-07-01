/**
 * WikiANN (PAN-X) evaluation data — REAL decoded parquet rows.
 *
 * Decoded offline from the attached parquet files with pandas/pyarrow:
 *   wikiann_en_test.parquet (en), wikiann_ar_test.parquet (ar), 0000.parquet (es).
 * `0000 (2).parquet` is a byte-identical duplicate of `0000.parquet` (verified via
 * DataFrame.equals) — both are the WikiANN Spanish (es) test split, confirmed by the
 * `langs` column, not guessed by filename.
 *
 * ner_tags integer scheme (confirmed against the `spans` field on real rows):
 *   0=O 1=B-PER 2=I-PER 3=B-ORG 4=I-ORG 5=B-LOC 6=I-LOC
 *
 * WIKIANN_META is computed over the FULL 10,000-row file per language (30,000 total).
 * WIKIANN_SAMPLE embeds 40 real rows per language (120 total) for live, in-browser
 * BIO-span extraction — chosen from rows containing at least one entity span.
 *
 * No model is trained on WikiANN; it is used strictly as a live evaluation dataset.
 */

export interface WikiannRow {
  /** Per-token text. */
  tokens: string[];
  /** Per-token BIO NER tags (B-/I- + PER|ORG|LOC, or O). */
  nerTags: string[];
  /** Language code (ar | en | es). */
  lang: 'ar' | 'en' | 'es';
}

export interface WikiannLangMeta {
  rows: number;
  spans: number;
  tokens: number;
  byType: Record<string, number>;
  sourceFile: string;
}

/** Real, full-file aggregate stats — computed once offline over all 30,000 rows. */
export const WIKIANN_META: Record<'en'|'ar'|'es', WikiannLangMeta> = {
  "en": {
    "rows": 10000,
    "spans": 13958,
    "tokens": 80326,
    "byType": {
      "LOC": 4657,
      "PER": 4556,
      "ORG": 4745
    },
    "sourceFile": "wikiann_en_test.parquet",
  },
  "ar": {
    "rows": 10000,
    "spans": 11259,
    "tokens": 64347,
    "byType": {
      "ORG": 3629,
      "LOC": 3780,
      "PER": 3850
    },
    "sourceFile": "wikiann_ar_test.parquet",
  },
  "es": {
    "rows": 10000,
    "spans": 12260,
    "tokens": 64727,
    "byType": {
      "PER": 3959,
      "LOC": 4725,
      "ORG": 3576
    },
    "sourceFile": "0000.parquet",
  }
};

/** Detected attachments and how each was resolved. */
export const WIKIANN_FILES = [
  { logicalName: 'wikiann_en_test', file: 'wikiann_en_test.parquet', rows: 10000, lang: 'en', resolved: 'decoded directly' },
  { logicalName: 'wikiann_ar_test', file: 'wikiann_ar_test.parquet', rows: 10000, lang: 'ar', resolved: 'decoded directly' },
  { logicalName: 'wikiann_es_test', file: '0000.parquet (+ identical duplicate 0000 (2).parquet)', rows: 10000, lang: 'es', resolved: 'confirmed Spanish via langs column, decoded' },
] as const;

/** Real decoded rows (40 per language, 120 total) sampled from rows containing >=1 entity span. */
export const WIKIANN_SAMPLE: WikiannRow[] = [
  {
    "lang": "en",
    "tokens": [
      "*15",
      "Feb",
      "-",
      "Osami",
      "Nagano"
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "B-PER",
      "I-PER"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Tamás",
      "Hajnal",
      "''from",
      "Borussia",
      "Dortmund",
      ",",
      "previously",
      "on",
      "loan",
      "''"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "O",
      "B-ORG",
      "I-ORG",
      "O",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Route",
      "102",
      "(",
      "Virginia",
      "–",
      "West",
      "Virginia",
      ")"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "'",
      "''",
      "With",
      "Irene",
      "Schweizer",
      "and",
      "Hamid",
      "Drake",
      "''",
      "'"
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "B-ORG",
      "I-ORG",
      "O",
      "B-PER",
      "I-PER",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Earl",
      "of",
      "Glandore"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "It",
      "is",
      "known",
      "from",
      "Bolivia",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Sen.",
      "Patty",
      "Murray",
      "(",
      "D-WA",
      ")"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "American",
      "Music",
      "Awards",
      "of",
      "1998"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Herbert",
      "Eugene",
      "Harris",
      "II",
      "(",
      "D",
      ")"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "*905",
      ":",
      "Fairfield",
      "station",
      "to",
      "Bankstown",
      "station"
    ],
    "nerTags": [
      "O",
      "O",
      "B-ORG",
      "I-ORG",
      "O",
      "B-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "He",
      "was",
      "born",
      "at",
      "Whitefield",
      ",",
      "Lancashire",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "B-LOC",
      "O",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Zitting",
      "cisticola",
      ",",
      "''Cisticola",
      "juncidis",
      "''"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Agios",
      "Ioannis",
      "(",
      "Pyrgos",
      ")"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "David",
      "Ruhe",
      "(",
      "1968–1993",
      ")"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "He",
      "was",
      "forced",
      "to",
      "take",
      "sick",
      "leave",
      "in",
      "1833",
      "and",
      "convalesced",
      "at",
      "Sandown",
      "on",
      "the",
      "Isle",
      "of",
      "Wight",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "B-LOC",
      "O",
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "``",
      "Not",
      "Afraid",
      "''",
      "–",
      "Animaholics-VFX",
      "(",
      "''performed",
      "by",
      "Eminem",
      "''",
      ")"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "B-PER",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Got",
      "the",
      "All",
      "Overs",
      "for",
      "You",
      "(",
      "All",
      "Over",
      "Me",
      ")"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "West",
      "Gloucester",
      "(",
      "MBTA",
      "station",
      ")"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Franco",
      "De",
      "Rosa"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "2004–05",
      "First",
      "League",
      "of",
      "Serbia",
      "and",
      "Montenegro"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "It",
      "is",
      "known",
      "from",
      "Sichuan",
      "in",
      "China",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "B-LOC",
      "O",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Ryan",
      "Hunter-Reay",
      "'",
      "''",
      "(",
      "W",
      ")",
      "'",
      "''"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "He",
      "is",
      "from",
      "St.",
      "Paul",
      ",",
      "Minnesota",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Boyd",
      "'s",
      "Automatic",
      "tide",
      "signalling",
      "apparatus"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "''",
      "Become",
      "''",
      "(",
      "2005",
      ")"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Brittany",
      "Farms-The",
      "Highlands",
      ",",
      "Pennsylvania"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "The",
      "Imagined",
      "Village"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Loupe",
      "(",
      "surname",
      ")"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Salt",
      "Lake",
      "City",
      ",",
      "Utah"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "O",
      "B-LOC"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Greg",
      "Maddux",
      "(",
      "7–5",
      ")"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Louise",
      "Elisabeth",
      "of",
      "Württemberg-Oels",
      "(",
      "1673-1736",
      ")"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "I-PER",
      "I-PER",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Santo",
      "Domingo",
      ",",
      "Dominican",
      "Republic"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "O",
      "B-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Communes",
      "of",
      "the",
      "Territoire",
      "de",
      "Belfort",
      "department"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Hans",
      "Werner",
      "Henze",
      "(",
      "1926–2012",
      ")"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "I-PER",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "It",
      "represents",
      "the",
      "historic",
      "county",
      "of",
      "Derbyshire",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "B-LOC",
      "I-LOC",
      "O",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Orlando",
      "B.",
      "Ficklin",
      "(",
      "D",
      ")"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "I-PER",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "''",
      "Luria",
      "controversa",
      "''"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "O"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "**",
      "NKVD",
      "Order",
      "№",
      "00439"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Chongqing",
      "Lifan",
      "F.C",
      "."
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "en",
    "tokens": [
      "Abraham",
      "William",
      "Serfaty",
      ",",
      "former",
      "Mayor",
      "of",
      "Gibraltar"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "I-PER",
      "O",
      "O",
      "B-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "'",
      "''",
      "Gianluca",
      "Brambilla",
      "''",
      "'"
    ],
    "nerTags": [
      "O",
      "O",
      "B-PER",
      "I-PER",
      "O",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Mercedes",
      "Milá",
      ",",
      "Galas",
      "semanales",
      "desde",
      "plató",
      "."
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Bahía",
      "de",
      "Parita"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "San",
      "Francisco",
      ",",
      "California",
      ",",
      "Estados",
      "Unidos",
      "."
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "O",
      "B-LOC",
      "O",
      "B-LOC",
      "I-LOC",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Tim",
      "Hardaway",
      "(",
      "2",
      ")"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "In",
      "This",
      "Moment"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Torneo",
      "Apertura",
      "2008",
      "(",
      "México",
      ")"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Semblanza",
      "Biográfica",
      "por",
      "Ana",
      "María",
      "Cetto"
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "B-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "'",
      "''",
      "Bert",
      "De",
      "Backer"
    ],
    "nerTags": [
      "O",
      "O",
      "B-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Crucificado",
      "Llinás",
      "del",
      "Vallés",
      "."
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "NT1",
      "(",
      "canal",
      "de",
      "televisión",
      ")"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "También",
      "aparecen",
      "en",
      "el",
      "álbum",
      "Glee",
      ":",
      "The",
      "Music",
      ",",
      "Volume",
      "1",
      "''",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "O",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "San",
      "Sebastián",
      "de",
      "los",
      "Reyes"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Spider-Man",
      "3",
      "(",
      "banda",
      "sonora",
      ")"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Springer-Verlag",
      ",",
      "Berlín",
      ",",
      "Alemania",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "B-LOC",
      "O",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Filarmónica",
      "Polaca",
      "Báltica"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Ein",
      "bißchen",
      "Frieden"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "'",
      "''",
      "Barbora",
      "Krejčíková",
      "An-Sophie",
      "Mestach",
      "''",
      "'4-6",
      ",",
      "6-3",
      ",",
      "[12-10]"
    ],
    "nerTags": [
      "O",
      "O",
      "B-PER",
      "I-PER",
      "B-PER",
      "I-PER",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "'",
      "''",
      "Brian",
      "Boitano",
      "''",
      "'"
    ],
    "nerTags": [
      "O",
      "O",
      "B-PER",
      "I-PER",
      "O",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Se",
      "encuentra",
      "en",
      "Indonesia",
      ",",
      "Australia",
      "y",
      "Fiyi",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "B-LOC",
      "O",
      "B-LOC",
      "O",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Abd",
      "al-Hafid",
      "de",
      "Marruecos"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Ley",
      "de",
      "los",
      "gases",
      "ideales"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Boca",
      "Juniors",
      "Football",
      "Club"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "1000",
      "maneras",
      "de",
      "morir",
      "''"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Arquidiócesis",
      "de",
      "San",
      "Luis",
      "Potosí"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Habita",
      "en",
      "República",
      "Democrática",
      "del",
      "Congo",
      ",",
      "Zambia",
      "y",
      "quizá",
      "Angola",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "O",
      "B-LOC",
      "O",
      "O",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Trajano",
      "retorna",
      "a",
      "Roma",
      "tras",
      "una",
      "exitosa",
      "campaña",
      "en",
      "Dacia",
      "."
    ],
    "nerTags": [
      "B-PER",
      "O",
      "O",
      "B-LOC",
      "O",
      "O",
      "O",
      "O",
      "O",
      "B-ORG",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Jean-François",
      "Millet",
      "(",
      "siglo",
      "XVII",
      ")"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER",
      "I-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "*Valencia",
      "2",
      "vs",
      "1",
      "Universidad"
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "B-ORG"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "San",
      "Francisco",
      ",",
      "California",
      ",",
      "Estados",
      "Unidos",
      "."
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "O",
      "B-LOC",
      "O",
      "B-LOC",
      "I-LOC",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "'",
      "''",
      "Jalisco",
      "''",
      "'",
      "-",
      "'",
      "''",
      "Ximena",
      "Navarrete",
      "''",
      "'",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "B-LOC",
      "O",
      "O",
      "O",
      "O",
      "O",
      "B-PER",
      "I-PER",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "'",
      "''",
      "Con",
      "Roy",
      "Ayers",
      "''",
      "'"
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "B-PER",
      "I-PER",
      "O",
      "O"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Distrito",
      "Escolar",
      "Independiente",
      "de",
      "Mesquite"
    ],
    "nerTags": [
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Palmolive",
      "(",
      "músico",
      ")"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Peñón",
      "de",
      "Vélez",
      "de",
      "la",
      "Gomera"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "'",
      "''",
      "Sestu",
      "''",
      "'",
      ",",
      "Italia"
    ],
    "nerTags": [
      "O",
      "O",
      "B-LOC",
      "O",
      "O",
      "O",
      "B-LOC"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Región",
      "de",
      "Murcia"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "Júlio",
      "Silva",
      "Rogério",
      "Dutra",
      "da",
      "Silva"
    ],
    "nerTags": [
      "B-PER",
      "I-PER",
      "B-PER",
      "I-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "REDIRECCIÓN",
      "Ricardo",
      "de",
      "Ortega",
      "y",
      "Díez"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "es",
    "tokens": [
      "``",
      "Since",
      "U",
      "Been",
      "Gone",
      "''",
      "-",
      "3:21"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "الإشارة",
      "المرجعية",
      "له",
      "وفق",
      "الملحق",
      "الدوري",
      "لمدارات",
      "الكويكبات",
      "هي",
      "MPO220817"
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "O",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "خلية",
      "تي",
      "مساعدة"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "هيلاري",
      "بيلي",
      "سميث"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "**",
      "(",
      "''دفع",
      "المضار",
      "الكلية",
      "''",
      ")",
      "ابن",
      "سينا",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "B-PER",
      "I-PER",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "أويو",
      "دي",
      "مانثاناريس"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "كلية",
      "الطب",
      "بجامعة",
      "إلينوي"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "سومرفيل",
      "(",
      "تينيسي",
      ")"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "بليزانت",
      "هيل",
      "(",
      "تينيسي",
      ")"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "آغا",
      "خان",
      "الأول"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "بلدة",
      "بويس",
      "بلانك",
      "(",
      "ميشيغان",
      ")"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "كنيسة",
      "يسوع",
      "المسيح",
      "لقديسي",
      "الأيام",
      "الأخيرة"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "كلية",
      "طب",
      "الاسنان",
      "جامعة",
      "قناة",
      "السويس"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "**",
      "كوبنهاغن",
      "(",
      "وفد",
      "عام",
      ")"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "استاد",
      "غيلورا",
      "سريويجايا"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "يتاخم",
      "الإقليم",
      "من",
      "الشمال",
      "الحدود",
      "البولندية",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "O",
      "O",
      "O",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "مقاطعة",
      "إليس",
      "(",
      "أوكلاهوما",
      ")"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "وتعرف",
      "بحوثه",
      "سلسلة",
      "ماركوف",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "B-PER",
      "I-PER",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "جوليس",
      "هاردوين",
      "مانسارت"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "ثورة",
      "23",
      "يوليو"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "فيسانسي",
      "(",
      "أين",
      ")"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "البدلة",
      "المتنقلة",
      "كاندام",
      "00"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "كان",
      "ريال",
      "مدريد",
      "حامل",
      "اللقب",
      "خرج",
      "من",
      "المنافسة",
      "بعد",
      "خسارته",
      "من",
      "أتلتيكو",
      "مدريد",
      "دور",
      "ال16",
      "."
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "B-ORG",
      "I-ORG",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "روبي",
      "(",
      "مغنية",
      ")"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "إيميت",
      "(",
      "كانساس",
      ")"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "قائمة",
      "المدارس",
      "الدولية",
      "في",
      "الهند"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "3-",
      "فيرا",
      "زفوناريفا",
      "(",
      "الدور",
      "الثمن",
      "نهائي",
      ")"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "O",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تعلم",
      "في",
      "جامعة",
      "فيينا",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "B-ORG",
      "I-ORG",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "السلطة",
      "الوطنية",
      "الفلسطينية"
    ],
    "nerTags": [
      "O",
      "B-LOC",
      "I-LOC",
      "I-LOC"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "'",
      "''",
      "يوهان",
      "كرويف",
      "''",
      "'"
    ],
    "nerTags": [
      "O",
      "O",
      "B-PER",
      "I-PER",
      "O",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "سلاح",
      "البحرية",
      "الإسرائيلي"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "المنظمة",
      "الدولية",
      "للمعايير",
      "(",
      "أيزو",
      ")"
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "بطريركية",
      "بلغاريا",
      "حيث",
      "يبلغ",
      "عدد",
      "أتباعها",
      "10",
      "مليون",
      "."
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "مشروع",
      "الجينوم",
      "البشري",
      "."
    ],
    "nerTags": [
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "موطنه",
      "الأصلي",
      "بلاد",
      "الشام",
      "تركيا",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "B-LOC",
      "I-LOC",
      "B-LOC",
      "O"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "مجمع",
      "علماء",
      "الدين",
      "المجاهدين"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "عبد",
      "العزيز",
      "بن",
      "الحسن"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "سلاح",
      "الجو",
      "التشيكي"
    ],
    "nerTags": [
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "رودولف",
      "أماندوس",
      "فيليبي"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "تحويل",
      "محمد",
      "إبراهيم",
      "يوسف"
    ],
    "nerTags": [
      "O",
      "B-PER",
      "I-PER",
      "I-PER"
    ]
  },
  {
    "lang": "ar",
    "tokens": [
      "لعب",
      "مع",
      "منتخب",
      "ألمانيا",
      "لكرة",
      "القدم",
      "."
    ],
    "nerTags": [
      "O",
      "O",
      "B-ORG",
      "I-ORG",
      "I-ORG",
      "I-ORG",
      "O"
    ]
  }
];

/** Gold cross-lingual aligned entities (same real-world entity, hand-aligned en/es/ar — WikiANN's monolingual splits are not parallel corpora). */
export const WIKIANN_ALIGNED = [
  { type: 'ORG', en: 'World Health Organization', es: 'Organización Mundial de la Salud', ar: 'منظمة الصحة العالمية' },
  { type: 'ORG', en: 'Red Crescent', es: 'Media Luna Roja', ar: 'الهلال الأحمر' },
  { type: 'ORG', en: 'United Nations', es: 'Naciones Unidas', ar: 'الأمم المتحدة' },
  { type: 'LOC', en: 'Geneva', es: 'Ginebra', ar: 'جنيف' },
  { type: 'LOC', en: 'Damascus', es: 'Damasco', ar: 'دمشق' },
  { type: 'LOC', en: 'Cairo', es: 'El Cairo', ar: 'القاهرة' },
  { type: 'PER', en: 'Maria Lopez', es: 'María López', ar: 'ماريا لوبيز' },
] as const;
