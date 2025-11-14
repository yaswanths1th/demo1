// ✅ Global cache
let MESSAGES = null;

// ✅ Save response constants to frontend
export function saveMessagesToStorage(data) {
  MESSAGES = data;
  localStorage.setItem("APP_MESSAGES", JSON.stringify(data));
}

// ✅ Ensure messages are loaded from storage
function ensureLoaded() {
  if (!MESSAGES) {
    try {
      MESSAGES = JSON.parse(localStorage.getItem("APP_MESSAGES")) || {};
    } catch {
      MESSAGES = {};
    }
  }
}

// ✅ Main function: convert Django or Backend errors into readable messages
export function getMessage(input) {
  ensureLoaded();

  if (!input) return "Something went wrong";

  // ✅ If Django returns { field: ["CODE"] }
  if (typeof input === "object" && !Array.isArray(input)) {
    const firstKey = Object.keys(input)[0];
    const value = input[firstKey];

    // If value is array → ["ES003"]
    if (Array.isArray(value)) {
      return getMessage(value[0]);
    }

    // If value is string → "ES003"
    if (typeof value === "string") {
      return lookup(value) || value;
    }

    // If contains "code"
    if (input.code) return lookup(input.code);

    return "Something went wrong";
  }

  // ✅ If received array like ["ES003"]
  if (Array.isArray(input)) {
    return getMessage(input[0]);
  }

  // ✅ Simple string
  if (typeof input === "string") {
    const normalized = input.trim().toUpperCase();
    return lookup(normalized) || input;
  }

  return "Something went wrong";
}

// ✅ Lookup by code prefix
function lookup(code) {
  if (!code) return null;
  ensureLoaded();

  const prefix = code[0];

  if (prefix === "E" && MESSAGES.ERRORS?.[code]) return MESSAGES.ERRORS[code];
  if (prefix === "I" && MESSAGES.INFORMATION?.[code]) return MESSAGES.INFORMATION[code];
  if (prefix === "V" && MESSAGES.VALIDATIONS?.[code]) return MESSAGES.VALIDATIONS[code];

  return null;
}
