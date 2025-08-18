<template> 
  <slot />
</template>

<script>
export default {
  data() {
    return {
      menuItems: [
        { title: 'Workflow', path: 'https://docs.google.com/document/d/13o2iLl21JGvx6v1ir15SqojOi9idB6W9Vf4EFuNr2-M/edit', external: true },
        { title: 'API', path: 'https://docs.google.com/document/d/1PXjm705uVGYTW03Rw2z-urSvkk1BmZ2oN99Xs8e_Q7E/edit?tab=t.0', external: true },
        {title: "Sample Images", path:"https://drive.google.com/drive/folders/1g6I1GfD7ikODFpcw6RZUuaS-ShgqSzFa", external: true}
      ]
    }
  },
  computed: {
    internalMenuItems() {
      return this.menuItems.filter(item => !item.external);
    },
    externalMenuItems() {
      return this.menuItems.filter(item => item.external);
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Rubik+Mono+One&display=swap');
.rubik-mono-one-regular {
    font-family: "Rubik Mono One", monospace;
    font-weight: 100;
    font-style: normal;
  }
  .navbar{
    position: fixed;
    width: 100%;
    top: 0;
    left: 0;
    height: 64px;
    z-index:1;
  }
  .navbar-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .navbar-left, .navbar-right {
    display: flex;
    align-items: center;
  }
</style>