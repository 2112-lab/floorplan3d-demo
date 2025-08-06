<template> 
    <div class="pa-5 navbar bg-primary">
        <div class="navbar-content">
            <div class="navbar-left">
                <router-link to="/" style="text-decoration: none; color: #222;">
                    <span class="rubik-mono-one-regular">Floorplan 3D</span>
                </router-link>
            </div>              
            <div class="navbar-right">
              <v-menu location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn
                    class="mt-n3"
                    icon="mdi-menu"
                    v-bind="props"
                    variant="text"
                  ></v-btn>
                </template>
                <v-list class="bg-primary">
                  <v-list-item
                    v-for="(item, index) in internalMenuItems"
                    :key="index"
                    :to="item.path"
                  >
                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                  </v-list-item>
                  <v-list-item
                    v-for="(item, index) in externalMenuItems"
                    :key="'ext-'+index"
                    :href="item.path"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
        </div>
    </div>    <slot />
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

<style scoped>
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