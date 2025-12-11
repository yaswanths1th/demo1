// ✅ frontend/src/utils/messageloader.js
export async function loadMessages() {
  try {
    // ✅ Always refresh messages (remove old cache)
    localStorage.removeItem("messages_loaded");

    const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
    if (!res.ok) throw new Error("Failed to fetch message tables");

    const data = await res.json();

    // ✅ Save fresh arrays into cache
    localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
    localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
    localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));

    // ✅ Mark cache ready
    localStorage.setItem("messages_loaded", "1");
  } catch (e) {
    console.warn("⚠️ Failed to load messages:", e);

    // ✅ Guarantee correct structure so JSON.parse doesn't crash
    if (!localStorage.getItem("user_error")) {
      localStorage.setItem("user_error", "[]");
    }
    if (!localStorage.getItem("user_information")) {
      localStorage.setItem("user_information", "[]");
    }
    if (!localStorage.getItem("user_validation")) {
      localStorage.setItem("user_validation", "[]");
    }
  }
}

// ✅ Helper functions to lookup text safely
export const getErrorText = (list, code) => {
  try {
    const c = (code || "").toUpperCase();
    const item = list.find((e) => e.error_code === c);
    return item ? item.error_message : "";
  } catch {
    return "";
  }
};

export const getInfoText = (list, code) => {
  try {
    const c = (code || "").toUpperCase();
    const item = list.find((i) => i.information_code === c);
    return item ? item.information_text : "";
  } catch {
    return "";
  }
};
