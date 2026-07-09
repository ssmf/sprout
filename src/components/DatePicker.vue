<script setup lang="ts">
import { ref, computed } from "vue";
import {
    buildMonthGrid,
    prevMonth,
    nextMonth,
    monthKey,
    formatMonthLabel,
    todayISO,
    type DayCell,
} from "../lib/dates";

/**
 * DatePicker — a reusable month-grid date picker (Vue island, `client:load`).
 *
 * Reuses the pure helpers from `dates.ts` and the visual language of
 * `Calendar.astro` (hairline borders, surface cells, red accent for the
 * selected day). Days before `minDate` (defaults to today) are dimmed and
 * non-selectable. Emits `update:modelValue` with the chosen 'YYYY-MM-DD'.
 */
const props = withDefaults(
    defineProps<{
        modelValue?: string | null;
        timezone?: string;
        minDate?: string;
    }>(),
    { modelValue: null, timezone: "UTC", minDate: undefined },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
}>();

const minDate = computed(() => props.minDate ?? todayISO(props.timezone));

// Default the visible month to the selected date's month, else this month.
function initialYearMonth(): { year: number; month: number } {
    if (props.modelValue) {
        const [y, m] = props.modelValue.split("-").map(Number);
        return { year: y, month: m - 1 };
    }
    const [y, m] = todayISO(props.timezone).split("-").map(Number);
    return { year: y, month: m - 1 };
}

const view = ref(initialYearMonth());

const cells = computed<DayCell[]>(() =>
    buildMonthGrid(view.value.year, view.value.month, minDate.value),
);

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function goPrev() {
    view.value = prevMonth(view.value.year, view.value.month);
}
function goNext() {
    view.value = nextMonth(view.value.year, view.value.month);
}

function isSelectable(cell: DayCell): boolean {
    return cell.inMonth && cell.dateISO >= minDate.value;
}

function select(cell: DayCell) {
    if (!isSelectable(cell)) return;
    emit("update:modelValue", cell.dateISO);
}
</script>

<template>
    <div class="overflow-hidden border border-line" data-datepicker>
        <!-- Month navigation -->
        <div class="flex items-center justify-between border-b border-line bg-canvas px-2 py-2">
            <button
                type="button"
                @click="goPrev"
                aria-label="Previous month"
                class="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface hover:text-accent cursor-pointer"
            >
                ‹
            </button>
            <span class="text-lg font-semibold text-ink">
                {{ formatMonthLabel(view.year, view.month) }}
            </span>
            <button
                type="button"
                @click="goNext"
                aria-label="Next month"
                class="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface hover:text-accent cursor-pointer"
            >
                ›
            </button>
        </div>

        <!-- Weekday header row -->
        <div class="grid grid-cols-7 border-b border-line bg-canvas">
            <div
                v-for="day in weekdays"
                :key="day"
                class="py-2.5 text-center text-xs font-medium text-ink-soft"
            >
                {{ day }}
            </div>
        </div>

        <!-- Day grid: collapsed cell borders form hairline separators -->
        <div class="grid grid-cols-7">
            <button
                v-for="(cell, i) in cells"
                :key="cell.dateISO"
                type="button"
                :data-date="cell.dateISO"
                :disabled="!isSelectable(cell)"
                @click="select(cell)"
                :class="[
                    'flex min-h-[5.75rem] flex-col gap-1.5 border-line bg-surface p-2.5 transition-colors',
                    (i + 1) % 7 !== 0 && 'border-r',
                    i < cells.length - 7 && 'border-b',
                    !isSelectable(cell) && 'opacity-30',
                    cell.dateISO === modelValue && 'ring-2 ring-inset ring-accent',
                    isSelectable(cell) && cell.dateISO !== modelValue && 'hover:bg-accent/5',
                    isSelectable(cell) && 'cursor-pointer',
                ]"
            >
                <span
                    :class="[
                        'text-xs font-medium',
                        cell.dateISO === modelValue
                            ? 'text-accent'
                            : 'text-ink-soft',
                    ]"
                >
                    {{ cell.day }}
                </span>
            </button>
        </div>
    </div>
</template>
