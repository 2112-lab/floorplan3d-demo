<template>
  <pre class="language-markup">
    <p v-html="highlightedCode"></p>
  </pre>
</template>

<script>
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism.css";
import { formatSVG } from "~/lib/svg";


export default {
  name: "SVGHighlight",
  props: {
    code: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      highlightedCode: "",
    };
  },
  watch: {
    code: {
      immediate: true,
      handler(newCode) {
        const formattedCode = formatSVG(newCode);
        this.highlightedCode = Prism.highlight(
          formattedCode,
          Prism.languages.markup,
          "markup"
        );
      },
    },
  },
  methods: {},
};
</script>

<style scoped>
pre.language-markup {
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 8px;
  margin: 0;
}

pre.language-markup p {
  margin: 0;
  overflow-wrap: break-word;
  max-width: 100%;
}
</style>
