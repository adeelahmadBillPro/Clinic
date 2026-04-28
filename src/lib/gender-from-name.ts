/**
 * Best-effort gender inference for patient registration.
 *
 * Reception ergonomics — when the receptionist types "Mrs Nimra" or
 * "Ahmad Bilal", auto-pick the radio so they don't have to. The user
 * stays in control: any manual click on the gender radio overrides the
 * inference for that session (handled at the form layer).
 *
 * Returns:
 *   "M" / "F" — confident match (prefix or known PK name)
 *   null     — unknown / ambiguous; don't change the current value
 *
 * Heuristic order (cheapest → most expensive):
 *   1. English-style honorific prefix (Mr/Mrs/Miss/Sir/Madam)
 *   2. Lookup in our small Pakistani-name dictionary
 *   3. Give up — return null. We deliberately do NOT use suffix
 *      heuristics like "ends in -a" because they false-positive on
 *      male names (e.g. Mustafa, Asia is gender-neutral, etc.).
 */

const MALE_PREFIXES = new Set([
  "mr",
  "sir",
  "master",
]);

const FEMALE_PREFIXES = new Set([
  "mrs",
  "ms",
  "miss",
  "madam",
  "madame",
  "maam",
]);

// ~100 most common Pakistani / Urdu male first names. Lowercase. Be
// conservative — when in doubt, leave it out (returning null is safer
// than auto-picking the wrong gender).
const MALE_NAMES = new Set([
  "muhammad", "mohammad", "mohammed", "muhamad",
  "ahmad", "ahmed", "ahmadali",
  "ali", "hassan", "hasan", "hussain", "hussein", "husnain",
  "bilal", "usman", "uthman", "umar", "omar", "umer",
  "yousuf", "yusuf", "yusaf", "yaqoob",
  "hamza", "saad", "sami", "samee",
  "asad", "adeel", "adnan", "abdullah", "abdurrahman",
  "salman", "suleman", "sulaiman",
  "imran", "khurram", "wasim", "waseem",
  "faisal", "fahad", "fahd", "faraz", "farhan", "fawad",
  "amir", "aamir", "asim", "akbar", "aslam", "atif", "awais",
  "bashir", "bashar", "danish", "dawood", "ehsan",
  "hadi", "haris", "haaris", "hashim", "hammad",
  "ibrahim", "ismail", "iftikhar", "imtiaz",
  "junaid", "kabir", "kaleem", "kamran", "khalid",
  "mahmood", "maaz", "majeed", "mansoor", "mehmood",
  "muneeb", "munir", "nadeem", "naeem", "nasir", "nawaz", "noman",
  "owais", "pervaiz", "qasim",
  "rafiq", "raheem", "rashid", "rasheed", "rehan", "rizwan",
  "sajjad", "sajid", "saqib", "shahid", "shahbaz", "shakeel",
  "shahzad", "sharif", "shoaib", "sohail", "sufyan",
  "tahir", "talha", "tariq",
  "umair", "usama", "waqar", "waqas", "wajahat",
  "yasir", "yaseen",
  "zaheer", "zahid", "zain", "zeeshan", "zubair", "zafar",
  "kabeer", "kabir",
  "bashir", "khan",
  "naveed", "shahzaib",
  "haider", "hyder", "hayder",
]);

// ~80 most common Pakistani / Urdu female first names.
const FEMALE_NAMES = new Set([
  "aisha", "ayesha", "ayeshah", "esha", "ayessha",
  "maryam", "mariam", "marium", "marya", "maria",
  "fatima", "fatema", "fathima",
  "khadija", "khadeeja",
  "zainab", "zaynab", "zenab",
  "hira", "mahira", "mahnoor", "mahnur", "maha",
  "nida", "sana", "sanaa", "sara", "sarah",
  "iqra", "hina", "bushra",
  "amna", "anum", "anam", "asma",
  "sadia", "sadiya", "saima", "saimah",
  "nimra", "nimrah",
  "saba", "tahira", "rabia", "razia",
  "nazia", "zara", "zahra", "zaara",
  "madiha", "hifsa", "hifza", "hadia",
  "sehrish", "rida", "naila", "faiza", "fariha", "mehwish",
  "manahil", "sakina", "salma", "tooba", "areeba", "bareera",
  "eman", "hooria", "hibba", "iman",
  "komal", "laraib", "mehak", "misha", "mishal",
  "maliha", "nayab", "noor", "noorah",
  "pari", "qurat", "qurratul",
  "rahila", "rumaisa", "shaista", "shumaila",
  "tasleem", "uzma", "yasmin", "yasmeen",
  "zoya", "samra", "sumera", "sumayya", "sumaiyya",
  "amber", "ambreen",
  "afshan", "afsheen",
  "ruby", "rubina", "robina",
  "shabnam",
  "fariha", "farah",
  "shazia",
  "naseem", "nasreen",
  "kainat", "kinza",
]);

export function inferGenderFromName(raw: string): "M" | "F" | null {
  const tokens = raw
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[.,;:]/g, ""))
    .filter(Boolean);
  if (tokens.length === 0) return null;

  // Honorific prefix is the strongest signal. "Mr Ahmed" / "Mrs Aisha" /
  // "Miss Sara" — prefix wins regardless of what follows.
  const firstToken = tokens[0];
  if (MALE_PREFIXES.has(firstToken)) return "M";
  if (FEMALE_PREFIXES.has(firstToken)) return "F";

  // Doctor / sahib / sahiba etc. are gender-noisy or skip-able. Strip
  // those and look at the next token.
  const NEUTRAL_PREFIXES = new Set([
    "dr",
    "doctor",
    "prof",
    "professor",
    "engr",
    "engineer",
    "rev",
    "haji",
  ]);
  let lookupTokens = tokens;
  if (NEUTRAL_PREFIXES.has(firstToken)) {
    lookupTokens = tokens.slice(1);
  }

  // Try each remaining token against the dictionary. Most patients are
  // entered as "First Last" — first match wins.
  for (const token of lookupTokens) {
    if (FEMALE_NAMES.has(token)) return "F";
    if (MALE_NAMES.has(token)) return "M";
  }

  return null;
}
