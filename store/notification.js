import { defineStore } from "pinia";
import { ref } from "vue";

export const useNotificationStore = defineStore("notification", () => {
  const snackbar = ref(false);
  const text = ref("");
  const type = ref("success"); // success, error, warning, info

  function notify({ message, type: newType = "success" }) {
    text.value = message;
    type.value = newType;
    snackbar.value = true;
  }

  return { snackbar, text, type, notify };
});
