<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Entry } from '../lib/entries';

/**
 * Interactive editor for today's journal entry — a Vue island hydrated
 * with `client:load`. Shows a 1–5 rating selector and a textarea, then
 * POSTs to /api/entries on save. Today's entry may be saved repeatedly
 * (upsert) until the day rolls over, at which point the server rejects
 * further writes.
 */
const props = defineProps<{
  date: string;
  dateLabel: string;
  initialEntry?: Entry | null;
}>();

const content = ref(props.initialEntry?.content ?? '');
const rating = ref(props.initialEntry?.rating ?? 0);
const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

const canSave = computed(() => content.value.trim().length > 0 && rating.value > 0);

let savedTimer: ReturnType<typeof setTimeout> | undefined;

async function save() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  saved.value = false;
  error.value = null;

  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: props.date,
        content: content.value,
        rating: rating.value,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error ?? 'Failed to save.');
    }

    saved.value = true;
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      saved.value = false;
    }, 2500);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-semibold text-ink">{{ dateLabel }}</h1>

    <!-- Rating selector -->
    <div class="flex items-center gap-3">
      <span class="text-sm text-ink-soft">How was the day?</span>
      <div class="flex gap-2">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          :aria-label="`${n} out of 5`"
          @click="rating = n"
          :class="[
            'h-4 w-4 rounded-full transition-colors',
            n <= rating ? 'bg-accent' : 'bg-line hover:bg-ink-soft/40',
          ]"
        />
      </div>
    </div>

    <!-- Journal textarea -->
    <textarea
      v-model="content"
      rows="14"
      placeholder="Write about your day…"
      class="w-full resize-none rounded-card border border-line bg-surface p-4 text-base leading-relaxed text-ink transition-colors placeholder:text-ink-soft focus:border-accent focus:outline-none"
    />

    <!-- Save actions -->
    <div class="flex items-center gap-4">
      <button
        type="button"
        :disabled="!canSave || saving"
        @click="save"
        class="rounded-card bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:enabled:opacity-90 disabled:opacity-30"
      >
        {{ saving ? 'Saving…' : 'Save entry' }}
      </button>
      <Transition name="fade">
        <span v-if="saved" class="text-sm text-ink-soft">Saved ✓</span>
      </Transition>
      <span v-if="error" class="text-sm text-accent">{{ error }}</span>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
