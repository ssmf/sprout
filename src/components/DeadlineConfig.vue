<script setup lang="ts">
import { ref, computed } from "vue";
import DatePicker from "./DatePicker.vue";
import { formatLongDate } from "../lib/dates";

/**
 * DeadlineConfig — the "Deadline" settings panel (Vue island, `client:load`).
 *
 * Shows the currently-saved deadline (or "No deadline set"), a DatePicker to
 * choose a new date, and Save / Clear buttons that POST to /api/settings.
 * `persisted` tracks the last saved value so "Save" is only enabled when the
 * working selection actually differs from what's stored. Feedback styling
 * mirrors JournalEditor.vue.
 */
const props = defineProps<{
    initialDeadline: string | null;
    timezone: string;
}>();

// The value currently persisted on the server (updated after a successful
// save/clear so canSave/canClear stay accurate without a reload).
const persisted = ref<string | null>(props.initialDeadline ?? null);
// The working selection inside the picker; null = nothing chosen yet.
const selected = ref<string | null>(props.initialDeadline ?? null);

const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

const currentLabel = computed(() =>
    persisted.value ? formatLongDate(persisted.value) : null,
);

// Save is meaningful only when a date is chosen and differs from stored.
const canSave = computed(
    () => selected.value !== null && selected.value !== persisted.value,
);
const canClear = computed(() => persisted.value !== null);

let savedTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSavedReset() {
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
        saved.value = false;
    }, 2500);
}

async function save() {
    if (!canSave.value || saving.value || selected.value === null) return;
    saving.value = true;
    saved.value = false;
    error.value = null;

    try {
        const res = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "deadline", value: selected.value }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error ?? "Failed to save.");
        }
        persisted.value = selected.value;
        saved.value = true;
        scheduleSavedReset();
    } catch (e) {
        error.value = e instanceof Error ? e.message : "Failed to save.";
    } finally {
        saving.value = false;
    }
}

async function clear() {
    if (saving.value) return;
    saving.value = true;
    saved.value = false;
    error.value = null;

    try {
        const res = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "deadline", value: null }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error ?? "Failed to clear.");
        }
        persisted.value = null;
        selected.value = null;
        saved.value = true;
        scheduleSavedReset();
    } catch (e) {
        error.value = e instanceof Error ? e.message : "Failed to clear.";
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div
        class="space-y-5 rounded-[var(--radius-card)] border border-line bg-surface p-5"
    >
        <div class="space-y-1">
            <h2 class="text-sm font-semibold text-ink">Deadline</h2>
            <p class="text-xs text-ink-soft">
                {{ currentLabel ?? "No deadline set" }}
            </p>
        </div>

        <DatePicker v-model="selected" :timezone="timezone" />

        <div class="flex items-center gap-4">
            <button
                type="button"
                :disabled="!canSave || saving"
                @click="save"
                class="bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:enabled:opacity-90 disabled:opacity-30 cursor-pointer"
            >
                {{ saving ? "Saving…" : "Save deadline" }}
            </button>
            <button
                v-if="canClear"
                type="button"
                :disabled="saving"
                @click="clear"
                class="border border-line px-3 py-2 text-xs text-ink-soft transition-colors hover:bg-canvas hover:text-ink cursor-pointer"
            >
                Clear
            </button>
            <Transition name="fade">
                <span v-if="saved" class="text-xs text-ink-soft">Saved ✓</span>
            </Transition>
            <span v-if="error" class="text-xs text-accent">{{ error }}</span>
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
