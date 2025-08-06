<template>
  <div class="pa-4 text-center">
    <v-dialog v-model="$konvaStore.showInfo" max-width="600">
      <v-card class="pa-2 mr-10">
        <v-row dense>
          <v-col
            v-for="(value, key) in filteredAttrs"
            :key="key"
            cols="12"
          >
            <v-text-field
              v-if="key === 'tags'"
              v-model="tagString"
              label="Tags (comma-separated)"
              dense
              outlined
              hide-details
              @blur="updateTags"
              @keydown.stop
              :append-icon="!readonlyKeys.includes(key) ? 'mdi-delete' : ''"
              @click:append="removeBuiltInAttribute(key)"
            />

            <v-select
              v-else-if="key === 'type'"
              v-model="attrs[key]"
              :items="['Room', 'Window', 'Door']"
              label="Type"
              dense
              outlined
              hide-details
              @keydown.stop
              :append-icon="!readonlyKeys.includes(key) ? 'mdi-delete' : ''"
              @click:append="removeBuiltInAttribute(key)"
            />
            <v-text-field
              v-else
              v-model="attrs[key]"
              :label="key"
              dense
              outlined
              hide-details
              :readonly="readonlyKeys.includes(key)"
              @keydown.stop
              :append-icon="!readonlyKeys.includes(key) ? 'mdi-delete' : ''"
              @click:append="removeBuiltInAttribute(key)"
            />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col
            v-for="(attr, index) in customAttributes"
            :key="index"
            cols="12"
          >
            <v-text-field
              v-model="attr.value"
              :label="attr.key"
              dense
              outlined
              hide-details
              append-icon="mdi-delete"
              @click:append="removeAttribute(index)"
              @keydown.stop
            />
          </v-col>

          <!-- Add New Key-Value Pair -->
          <v-col cols="12" class="d-flex">
            <v-text-field
              v-model="newKey"
              label="Key"
              dense
              outlined
              hide-details
              class="mr-2"
              @keydown.stop
            />
            <v-text-field
              v-model="newValue"
              label="Value"
              dense
              outlined
              hide-details
              class="mr-2"
              @keydown.stop
            />
            <v-btn icon color="primary" @click="addAttribute"
              ><v-icon>mdi-plus</v-icon></v-btn
            >
          </v-col>
        </v-row>

        <v-card-actions class="justify-end mt-2">
          <v-btn color="error" @click="close">Close</v-btn>
          <v-btn color="secondary" @click="saveChanges">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
export default {
  data() {
    return {
      attrs: {},
      readonlyKeys: ["id", "fill"],
      customAttributes: [],
      newKey: "",
      newValue: "",
      tagString: "",
      removedKeys: []
    };
  },

  props: {
    selectedShape: {
      type: Object,
    },
  },
  computed: {
    filteredAttrs() {
      // Return only attributes that haven't been removed
      const result = {};
      Object.keys(this.attrs).forEach(key => {
        if (!this.removedKeys.includes(key)) {
          result[key] = this.attrs[key];
        }
      });
      return result;
    }
  },
  watch: {
    selectedShape: {
      immediate: true,
      handler(newRoom) {
        if (newRoom.attrs) {
          this.attrs = { ...newRoom.attrs };
          this.tagString = Array.isArray(this.attrs.tags)
            ? this.attrs.tags.join(", ")
            : "";
          this.removedKeys = []; // Reset removed keys when room changes
        }
      },
    },
  },
  methods: {
    addAttribute() {
      if (!this.newKey.trim() || this.attrs[this.newKey] !== undefined) return;
      this.customAttributes.push({ key: this.newKey, value: this.newValue });
      this.newKey = "";
      this.newValue = "";
    },
    removeAttribute(index) {
      this.customAttributes.splice(index, 1);
    },
    removeBuiltInAttribute(key) {
      if (this.readonlyKeys.includes(key)) return;
      // Add to removed keys to hide from UI
      this.removedKeys.push(key);
      // Also delete from attrs object
      delete this.attrs[key];
    },
    updateTags() {
      this.attrs.tags = this.tagString
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);
    },
    saveChanges() {
      const doc_id = this.$konvaStore.getActiveDocument().id;
      const object_id = this.selectedShape.id;
      
      // Create a copy of attrs - deleted keys are already removed from this.attrs
      const attrs = { ...this.attrs };
      
      // Add any custom attributes
      this.customAttributes.forEach((attr) => {
        attrs[attr.key] = attr.value;
      });
      
      this.updateTags();
      
     
      // This will update the underlying data structure, removing any deleted keys
      this.$konvaStore.setAttrs(doc_id, object_id, attrs);
      
      this.$notification.notify({
        message: "Room Attributes Updated",
        type: "success",
      });
      this.$konvaStore.setShowInfo(false);
    },
    close() {
      this.$konvaStore.setShowInfo(false);
    },
  },
};
</script>
