import { useConsoleStore } from "~/store/console-store";
import { useSvgStore } from "~/store/svg-store";

export default defineNuxtPlugin(({ $pinia }) => {
  return {
    provide: {
      svgStore: useSvgStore($pinia),
      consoleStore: useConsoleStore($pinia),
    },
  };
});
