import { useConsoleStore } from "~/store/console-store";
import { useEditStore } from "~/store/edit";
import { useKonvaStore } from "~/store/konva-store";
import { useNotificationStore } from "~/store/notification";
import { useThreeStore } from "~/store/three-store";

export default defineNuxtPlugin(({ $pinia }) => {
  return {
    provide: {
      editStore: useEditStore($pinia),
      konvaStore: useKonvaStore($pinia),
      threeStore: useThreeStore($pinia),
      notification: useNotificationStore($pinia),
      consoleStore: useConsoleStore($pinia),
    },
  };
});
