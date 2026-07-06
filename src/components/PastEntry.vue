<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import JournalEditor from "./JournalEditor.vue";
import type { Entry } from "../lib/entries";

/**
 * Past-entry experience — a Vue island hydrated with `client:load`.
 *
 * Renders a read-only view of an existing entry (or a "No entry for this
 * day." notice for an empty past day) plus a button to edit / add an
 * entry. Clicking the button opens a confirmation modal; on confirm it
 * swaps to the JournalEditor. After a successful save it returns to the
 * read-only view showing the persisted content. Past days are normally
 * locked — the modal makes the intent explicit before allowing a write.
 */
const props = defineProps<{
    date: string;
    dateLabel: string;
    entry?: Entry | null;
}>();

// Local copy so we can update after a save without a full page reload.
const currentEntry = ref<Entry | null>(props.entry ?? null);
const hasEntry = computed(() => currentEntry.value !== null);

const showConfirm = ref(false);
const editing = ref(false);

const dialogEl = ref<HTMLElement | null>(null);
let lastFocused: HTMLElement | null = null;

function openConfirm() {
    lastFocused = document.activeElement as HTMLElement | null;
    showConfirm.value = true;
    nextTick(() => dialogEl.value?.focus());
}

function closeConfirm() {
    showConfirm.value = false;
    lastFocused?.focus();
}

function confirmEdit() {
    showConfirm.value = false;
    editing.value = true;
}

function onSaved(e: { date: string; content: string; rating: number }) {
    currentEntry.value = {
        date: e.date,
        content: e.content,
        rating: e.rating,
        created_at: currentEntry.value?.created_at ?? "",
        updated_at: new Date().toISOString(),
    };
    editing.value = false;
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && showConfirm.value) {
        closeConfirm();
    }
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
    <!-- Read-only view -->
    <article v-if="!editing" class="space-y-6">
        <div class="flex items-center justify-between gap-4">
            <h1 class="text-xl font-semibold text-ink">{{ dateLabel }}</h1>
            <div v-if="hasEntry" class="flex gap-1.5">
                <span
                    v-for="i in 5"
                    :key="i"
                    :class="i <= (currentEntry?.rating ?? 0) ? 'bg-accent' : 'bg-line'"
                    class="h-1.5 w-1.5"
                />
            </div>
        </div>

        <div v-if="hasEntry" class="whitespace-pre-wrap text-base leading-relaxed text-ink">
            {{ currentEntry?.content }}
        </div>
        <p v-else class="text-ink-soft">No entry for this day.</p>

        <!-- Edit / Add entry button -->
        <div>
            <button
                type="button"
                @click="openConfirm"
                class="border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent cursor-pointer"
            >
                {{ hasEntry ? "Edit" : "Add entry" }}
            </button>
        </div>
    </article>

    <!-- Inline editor after confirmation -->
    <JournalEditor
        v-else
        :date="date"
        :dateLabel="dateLabel"
        :initialEntry="currentEntry"
        @saved="onSaved"
    />

    <!-- Confirmation modal -->
    <Transition name="fade">
        <div
            v-if="showConfirm"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            @click.self="closeConfirm"
        >
            <div
                ref="dialogEl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="past-entry-confirm-title"
                tabindex="-1"
                class="w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-surface p-6 space-y-4"
            >
                <h2 id="past-entry-confirm-title" class="text-base font-semibold text-ink">
                    {{ hasEntry ? "Edit past entry?" : "Add past entry?" }}
                </h2>
                <p class="text-sm leading-relaxed text-ink-soft">
                    <template v-if="hasEntry">
                        This entry is from a past day and is normally locked. Are you sure you want to edit it?
                    </template>
                    <template v-else>
                        This day is in the past and entries are normally written on the day. Are you sure you want to add one?
                    </template>
                </p>
                <div class="flex justify-end gap-3">
                    <button
                        type="button"
                        @click="closeConfirm"
                        class="border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-canvas hover:text-ink cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        @click="confirmEdit"
                        class="bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
                    >
                        {{ hasEntry ? "Edit anyway" : "Add entry" }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
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
