<template>
  <NuxtLayout>
    <v-app>
      <NuxtPage />
      <GlobalSnackbar />
    </v-app>
  </NuxtLayout>
</template>

<script>
import GlobalSnackbar from './components/global-snackbar/global-snackbar.vue';
</script>


<style>
body{
  overflow-x: hidden;
  overflow-y: hidden;
}

/* Custom scrollbar styles */
::-webkit-scrollbar {
  width: 6px; /* Width of the scrollbar */
}

::-webkit-scrollbar-track {
  background: transparent; /* Track background */
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2); /* Scrollbar color */
  border-radius: 3px; /* Rounded corners */
}

/* Firefox scrollbar styles */
* {
  scrollbar-width: thin; /* "thin", "auto" or "none" */
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent; /* thumb and track color */
}

/* To completely hide scrollbars but keep scrolling functionality, uncomment:
::-webkit-scrollbar {
  width: 0px;
  background: transparent;
}
* {
  scrollbar-width: none;
}
*/
</style>
