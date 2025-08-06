<template>
    <v-snackbar timeout="1500" location="top right" v-model="notification.snackbar" :color="notification.type">
      {{ notification.text }}
      <template v-slot:actions>
        <v-btn color="white" variant="text" @click="notification.snackbar = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </template>
  
  <script setup>
  import { useNotificationStore } from '../../store/notification';
  
  const notification = useNotificationStore();
  </script>
  