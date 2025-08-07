import { useConsoleStore } from "~/store/console-store";
import { useSvgStore } from "~/store/svg-store";
import { useThreeStore } from "~/store/three-store";

export default defineNuxtPlugin(({ $pinia }) => {
  return {
    provide: {
      svgStore: useSvgStore($pinia),
      threeStore: useThreeStore($pinia),
      consoleStore: useConsoleStore($pinia),
    },
  };
});
