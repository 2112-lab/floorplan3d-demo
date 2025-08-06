<template>
  <div class="chat-window d-flex flex-column">
    <!-- Messages Area -->
    <div class="messages-container flex-grow-1">
      <div class="messages pa-4" ref="messagesContainer">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message mb-4"
          :class="message.sender === 'ai' ? 'ai-message' : 'user-message'"
        >
          <div class="message-wrapper">
            <div class="message-content pa-3">
              {{ message.text }}
            </div>
            <v-btn
              class="copy-btn"
              icon="mdi-content-copy"
              size="x-small"
              variant="text"
              @click="copyToClipboard(message.text)"
            >
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons px-4 py-2">
      <v-btn
        color="primary"
        variant="outlined"
        size="small"
        :disabled="!canApplyToSvg"
        @click="handleApplyToSvg"
      >
        Apply to SVG
      </v-btn>
    </div>

    <!-- Input Area -->
    <div class="input-area px-4 py-2 d-flex align-center">
      <div class="d-flex align-center flex-grow-1 mr-2 input-with-attachment">
        <v-text-field
          v-model="newMessage"
          placeholder="Type your message..."
          variant="outlined"
          density="compact"
          hide-details
          @keyup.enter="sendMessage"
          class="mr-2"
        />
        <v-btn
          icon="mdi-paperclip"
          size="small"
          variant="text"
          class="attach-btn"
          @click="triggerFileInput"
        >
        </v-btn>
        <input
          type="file"
          ref="fileInput"
          style="display: none"
          @change="handleFileAttachment"
        />
      </div>
      <v-btn
        color="primary"
        icon
        size="small"
        @click="sendMessage"
        :disabled="!newMessage.trim()"
      >
        <v-icon>mdi-send</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      messages: [
        {
          text: "How can I help you today?",
          sender: "ai",
        },
      ],
      newMessage: "",
      canApplyToSvg: false,
      selectedFile: null,
    };
  },
  methods: {
    sendMessage() {
      if (!this.newMessage.trim() && !this.selectedFile) return;

      // Add user message
      this.messages.push({
        text: this.newMessage,
        sender: "user",
        attachment: this.selectedFile,
      });

      // Clear input and file
      this.newMessage = "";
      this.selectedFile = null;
      this.$refs.fileInput.value = "";

      // Simulate AI response (replace with actual AI integration)
      setTimeout(() => {
        this.messages.push({
          text: "I'm processing your request...",
          sender: "ai",
        });
        this.canApplyToSvg = true;
      }, 1000);

      // Scroll to bottom after messages update
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
    handleApplyToSvg() {
      // Implement SVG application logic
      this.$emit("apply-to-svg", this.messages);
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    handleFileAttachment(event) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
        this.newMessage = `Attached file: ${file.name}`;
      }
    },
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        // You might want to add a toast notification here
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    },
  },
  mounted() {
    this.scrollToBottom();
  },
  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      },
      deep: true,
    },
  },
};
</script>

<style scoped>
.chat-window {
  height: 100%;
  background-color: var(--v-background);
}

.messages-container {
  overflow-y: auto;
  border-bottom: 1px solid var(--v-border-color);
}

.messages {
  display: flex;
  flex-direction: column;
}

.message {
  max-width: 80%;
  margin-bottom: 1rem;
}

.message-wrapper {
  position: relative;
  display: inline-block;
}

.message-content {
  border-radius: 8px;
  word-wrap: break-word;
}

.copy-btn {
  position: absolute;
  bottom: -20px;
  right: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-wrapper:hover .copy-btn {
  opacity: 1;
}

.user-message {
  align-self: flex-end;
}

.user-message .message-content {
  background-color: var(--v-primary-base);
  color: white;
}

.ai-message {
  align-self: flex-start;
}

.ai-message .message-content {
  background-color: var(--v-surface-variant);
}

.input-area {
  border-top: 1px solid var(--v-border-color);
}

.action-buttons {
  border-top: 1px solid var(--v-border-color);
}

.input-with-attachment {
  position: relative;
}

.attach-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.v-text-field {
  padding-right: 40px;
}
</style>
