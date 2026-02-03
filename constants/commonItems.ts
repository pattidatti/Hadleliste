
export interface CatalogCategory {
  name: string;
  items: string[];
}

export const CATALOG: CatalogCategory[] = [
  {
    name: "Basisvarer",
    items: ["Banan", "Agurk", "Melk", "Avakado", "Brelett", "Meierismør", "Ruccula", "Rømme", "Creme fresh", "Kremfløte", "Cottage Cheese", "Yoghurt", "Purreløk", "Paprika", "Rød chilli", "Nypoteter", "Løk", "Rød løk", "Hvitløk", "Gulrøtter", "Frosne aspargesbønner", "Brokkoli", "Tomatpuré", "Fullkornpasta", "Kaffe", "Kakao", "Ris", "Søt kondensert melk"]
  },
  {
    name: "Ost & Pålegg",
    items: ["Ost", "Jarlsberg", "Brunost", "Revet ost", "Kremost naturel", "Parmesan", "Salami", "Kristine pålegg", "Kalkunpålegg", "Leverpostei", "Makrell i tomat"]
  },
  {
    name: "Middag & Kjøtt",
    items: ["Kjøttdeig", "Kyllingkjøttdeig", "Svinekjøtt", "Middagspølse", "Salatkinke", "Egg", "Kyllingfilét", "Laks", "Baconpakke", "Selskapsdressing", "Brød"]
  },
  {
    name: "Pizza & Bakst",
    items: ["Mel", "Speltmel", "Gjær", "Pizzasaus", "Kanel", "Bakepulver", "Natron", "Vaniljesukker", "Mørk sjokolade", "Havregryn", "Kardemomme"]
  },
  {
    name: "Wok & Krydder",
    items: ["Wok", "Nudler", "Woksaus", "Teriyaki saus", "Garda masala", "Paprikapulver"]
  },
  {
    name: "Taco",
    items: ["Salsa", "Tacolefse", "Smålefser", "Tacochips", "Tacokrydder", "Sriracha"]
  },
  {
    name: "Barn & Hygiene",
    items: ["Trym", "Bleier", "Våtservietter", "Grøt", "Trym servietter"]
  },
  {
    name: "Hus & Hjem",
    items: ["Bær", "Bosspose", "Bleiepose", "Oppvasktabletter", "Dopapir", "Vaskepulver", "Tørkepapir"]
  }
];

// Categories for grouping items in views (derived from CATALOG)
export const CATEGORIES = [
  "Basisvarer",
  "Ost & Pålegg",
  "Middag & Kjøtt",
  "Pizza & Bakst",
  "Wok & Krydder",
  "Taco",
  "Barn & Hygiene",
  "Hus & Hjem",
  "Annet"
];

export const COMMON_ITEMS = CATALOG.flatMap(c => c.items);
