import { useSvgStore } from "~/store/svg-store";

export default defineNuxtPlugin(({ $pinia }) => {
  return {
    provide: {
      svgStore: useSvgStore($pinia),
    },
  };
});
