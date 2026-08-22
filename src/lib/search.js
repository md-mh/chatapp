// Everything in this file exists because of how the deployment implements
// `GET /users/search?q=`. Probing it against the live API showed that the
// query is interpolated straight into a MongoDB regular expression which is
// anchored to the start of `name`, and matched case-sensitively:
//
//   q=Rafi  → 16 results        q=rafi → 0        q=afi → 0
//   q=+880… → "Regular expression is invalid" (code 51091)
//   q=<any phone> → 0, because `phone` is never part of the match
//
// So the client escapes the pattern, retries the plausible casings, and
// resolves phone numbers itself.

const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

export function escapeRegex(value) {
  return String(value ?? "").replace(REGEX_METACHARACTERS, "\\$&");
}

export function digitsOf(value) {
  return String(value ?? "").replace(/\D/g, "");
}

// A query is treated as a phone number when it uses only the characters people
// write numbers with, and carries enough digits to be worth matching.
export function isPhoneQuery(term) {
  const trimmed = String(term ?? "").trim();
  if (!trimmed) return false;
  return /^[+\d\s()-]+$/.test(trimmed) && digitsOf(trimmed).length >= 3;
}

export function matchesPhone(user, term) {
  const wanted = digitsOf(term);
  if (!wanted) return false;
  return digitsOf(user?.phone).includes(wanted);
}

function capitalizeWords(value) {
  return value.replace(
    /\S+/g,
    (word) => word[0].toUpperCase() + word.slice(1).toLowerCase(),
  );
}

// "rafi" finds nobody on a case-sensitive prefix match, which reads as a bug to
// anyone typing normally. Asking for the obvious casings hides the difference.
export function casingVariants(term) {
  const trimmed = String(term ?? "").trim();
  if (!trimmed) return [];
  return [...new Set([trimmed, capitalizeWords(trimmed), trimmed.toLowerCase()])];
}

export function dedupeById(groups) {
  const byId = new Map();
  for (const group of groups)
    for (const user of Array.isArray(group) ? group : [])
      if (user?._id && !byId.has(user._id)) byId.set(user._id, user);
  return [...byId.values()];
}
