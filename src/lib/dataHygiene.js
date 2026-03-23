const US_STATE_CODES = {
  AL: "AL", ALABAMA: "AL",
  AK: "AK", ALASKA: "AK",
  AZ: "AZ", ARIZONA: "AZ",
  AR: "AR", ARKANSAS: "AR",
  CA: "CA", CALIFORNIA: "CA",
  CO: "CO", COLORADO: "CO",
  CT: "CT", CONNECTICUT: "CT",
  DE: "DE", DELAWARE: "DE",
  FL: "FL", FLORIDA: "FL",
  GA: "GA", GEORGIA: "GA",
  HI: "HI", HAWAII: "HI",
  ID: "ID", IDAHO: "ID",
  IL: "IL", ILLINOIS: "IL",
  IN: "IN", INDIANA: "IN",
  IA: "IA", IOWA: "IA",
  KS: "KS", KANSAS: "KS",
  KY: "KY", KENTUCKY: "KY",
  LA: "LA", LOUISIANA: "LA",
  ME: "ME", MAINE: "ME",
  MD: "MD", MARYLAND: "MD",
  MA: "MA", MASSACHUSETTS: "MA",
  MI: "MI", MICHIGAN: "MI",
  MN: "MN", MINNESOTA: "MN",
  MS: "MS", MISSISSIPPI: "MS",
  MO: "MO", MISSOURI: "MO",
  MT: "MT", MONTANA: "MT",
  NE: "NE", NEBRASKA: "NE",
  NV: "NV", NEVADA: "NV",
  NH: "NH", "NEW HAMPSHIRE": "NH",
  NJ: "NJ", "NEW JERSEY": "NJ",
  NM: "NM", "NEW MEXICO": "NM",
  NY: "NY", "NEW YORK": "NY",
  NC: "NC", "NORTH CAROLINA": "NC",
  ND: "ND", "NORTH DAKOTA": "ND",
  OH: "OH", OHIO: "OH",
  OK: "OK", OKLAHOMA: "OK",
  OR: "OR", OREGON: "OR",
  PA: "PA", PENNSYLVANIA: "PA",
  RI: "RI", "RHODE ISLAND": "RI",
  SC: "SC", "SOUTH CAROLINA": "SC",
  SD: "SD", "SOUTH DAKOTA": "SD",
  TN: "TN", TENNESSEE: "TN",
  TX: "TX", TEXAS: "TX",
  UT: "UT", UTAH: "UT",
  VT: "VT", VERMONT: "VT",
  VA: "VA", VIRGINIA: "VA",
  WA: "WA", WASHINGTON: "WA",
  WV: "WV", "WEST VIRGINIA": "WV",
  WI: "WI", WISCONSIN: "WI",
  WY: "WY", WYOMING: "WY",
  DC: "DC", "DISTRICT OF COLUMBIA": "DC"
};

export function normalizeState(value) {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase().replace(/\./g, "").replace(/\s+/g, " ");
  return US_STATE_CODES[normalized] || null;
}

export function normalizePhone(value) {
  if (!value) return null;
  const withoutExtension = String(value).replace(/(?:ext\.?|x)\s*\d+.*$/i, "").trim();
  let digits = withoutExtension.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) return null;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function normalizeWebsite(value) {
  if (!value) return null;
  let candidate = String(value).trim().toLowerCase();
  if (!candidate) return null;
  if (!/^https?:\/\//.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.replace(/^www\./, "");
    if (!hostname || !hostname.includes(".")) return null;
    return `https://www.${hostname}`;
  } catch {
    return null;
  }
}

export function getLastName(name) {
  if (!name) return "";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] || "").toLowerCase();
}

export function buildContactDuplicateRows(contacts) {
  const rows = [];
  const emailBuckets = new Map();
  const lastNameBuckets = new Map();

  contacts.forEach((contact) => {
    const email = contact.email?.trim().toLowerCase();
    const lastName = getLastName(contact.name);

    if (email) {
      emailBuckets.set(email, [...(emailBuckets.get(email) || []), contact]);
    }

    if (lastName) {
      lastNameBuckets.set(lastName, [...(lastNameBuckets.get(lastName) || []), contact]);
    }
  });

  const buildRow = (matchType, matchValue, matches) => {
    const sortedMatches = [...matches].sort((a, b) => {
      const aDate = new Date(a.created_date || 0).getTime();
      const bDate = new Date(b.created_date || 0).getTime();
      return aDate - bDate;
    });

    rows.push({
      id: `${matchType}-${matchValue}`,
      match_type: matchType,
      match_value: matchValue,
      record_count: sortedMatches.length,
      contacts: sortedMatches
        .map((contact) => `${contact.name || "Unnamed"}${contact.email ? ` (${contact.email})` : ""}`)
        .join(", "),
    });
  };

  emailBuckets.forEach((matches, email) => {
    if (matches.length > 1) {
      buildRow("Email", email, matches);
    }
  });

  lastNameBuckets.forEach((matches, lastName) => {
    if (matches.length > 1) {
      buildRow("Last Name", lastName, matches);
    }
  });

  return rows.sort((a, b) => b.record_count - a.record_count || a.match_type.localeCompare(b.match_type));
}