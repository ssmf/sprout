<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

/**
 * DayPreview — a small client-side hover note for the calendar grid.
 *
 * On mouseover/focus over a day cell carrying a `data-date` that maps to an
 * entry, it shows a fixed-position note with the full date label, rating
 * dots, and a longer snippet of the entry content. It uses hover-intent
 * delays so quick mouse passes don't flicker, flips above the cell when
 * near the bottom of the viewport, clamps horizontally to the viewport,
 * and swaps content instantly when moving between two entry cells.
 *
 * Pure presentation — the cell's own link exposes the full entry, so the
 * note is aria-hidden and pointer-events:none (never steals hover).
 */
const props = defineProps<{
    entries: Record<
        string,
        { date: string; dateLabel: string; content: string; rating: number }
    >;
}>();

const SHOW_DELAY = 120; // ms — hover intent before showing
const HIDE_DELAY = 100; // ms — grace period before hiding

const visible = ref(false);
const pendingShow = ref(false); // true while waiting for the show delay

const dateLabel = ref("");
const content = ref("");
const rating = ref(0);

const noteEl = ref<HTMLElement | null>(null);
const style = ref<Record<string, string>>({});
const snap = ref(false); // true = reposition instantly (no transition) during scroll/resize

let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let snapTimer: ReturnType<typeof setTimeout> | undefined;
let activeDateISO: string | null = null; // the cell currently shown/animating
let pendingDateISO: string | null = null; // the cell we're waiting to show

const CALENDAR_SELECTOR = "[data-calendar]";
const CELL_SELECTOR = "[data-date]";

function clearShowTimer() {
    if (showTimer) {
        clearTimeout(showTimer);
        showTimer = undefined;
    }
}

function clearHideTimer() {
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = undefined;
    }
}

function positionFor(cell: HTMLElement) {
    const note = noteEl.value;
    if (!note) return;

    const rect = cell.getBoundingClientRect();
    const nRect = note.getBoundingClientRect();
    const margin = 12;
    const gap = 10;

    const noteW = nRect.width || 396; // w-[22rem] @ 18px root
    const noteH = nRect.height || 396; // min-h-[22rem] @ 18px root

    // Vertical: default below; flip above if it would overflow the bottom.
    let top: number;
    if (rect.bottom + gap + noteH + margin > window.innerHeight) {
        top = Math.max(margin, rect.top - gap - noteH);
    } else {
        top = rect.bottom + gap;
    }

    // Horizontal: center on the cell, clamped to viewport edges.
    const preferredLeft = rect.left + rect.width / 2 - noteW / 2;
    let left = Math.min(
        Math.max(margin, preferredLeft),
        window.innerWidth - noteW - margin,
    );

    style.value = {
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
    };
}

function show(dateISO: string, cell: HTMLElement) {
    const entry = props.entries[dateISO];
    if (!entry) return;

    pendingDateISO = dateISO;

    // Already showing for a (different) entry cell → swap content instantly
    // and reposition, no fade out/in, so movement feels continuous.
    // Clear any pending hide/show timers first — moving between cells must
    // never leave a queued hide that would later dismiss the note.
    if (visible.value && activeDateISO && activeDateISO !== dateISO) {
        clearHideTimer();
        clearShowTimer();
        pendingShow.value = false;
        activeDateISO = dateISO;
        dateLabel.value = entry.dateLabel;
        content.value = entry.content;
        rating.value = entry.rating;
        // Reposition synchronously so the glide starts immediately. The note
        // is always 396×396 (fixed width + min-height dominate the clamped
        // content), so measuring before the content flush is exact.
        positionFor(cell);
        return;
    }

    // Same cell re-entered while waiting to show — keep the pending show.
    if (activeDateISO === dateISO && pendingShow.value) return;

    clearHideTimer();
    pendingShow.value = true;
    clearShowTimer();
    showTimer = setTimeout(() => {
        showTimer = undefined;
        if (pendingDateISO !== dateISO) return; // superseded

        activeDateISO = dateISO;
        pendingShow.value = false;
        dateLabel.value = entry.dateLabel;
        content.value = entry.content;
        rating.value = entry.rating;
        visible.value = true;
        requestAnimationFrame(() => positionFor(cell));
    }, SHOW_DELAY);
}

function hide() {
    pendingDateISO = null;
    pendingShow.value = false;
    clearShowTimer();
    clearHideTimer();
    hideTimer = setTimeout(() => {
        hideTimer = undefined;
        visible.value = false;
        activeDateISO = null;
    }, HIDE_DELAY);
}

/** Hovering the note itself — cancel any pending hide so it stays open. */
function onNoteEnter() {
    clearHideTimer();
}

/** Leaving the note — schedule a hide (re-entering a cell cancels it). */
function onNoteLeave() {
    hide();
}

function onPointerOver(e: Event) {
    const target = e.target as Element | null;
    const cell = target?.closest?.(CELL_SELECTOR) as HTMLElement | null;
    if (!cell) return;
    const dateISO = cell.getAttribute("data-date");
    if (!dateISO || !props.entries[dateISO]) return;
    show(dateISO, cell);
}

function onPointerOut(e: Event) {
    const target = e.target as Element | null;
    const cell = target?.closest?.(CELL_SELECTOR) as HTMLElement | null;
    if (!cell) return;
    const dateISO = cell.getAttribute("data-date");
    if (!dateISO || !props.entries[dateISO]) return;
    hide();
}

function onFocusIn(e: Event) {
    const target = e.target as Element | null;
    const cell = target?.closest?.(CELL_SELECTOR) as HTMLElement | null;
    if (!cell) return;
    const dateISO = cell.getAttribute("data-date");
    if (!dateISO || !props.entries[dateISO]) return;
    show(dateISO, cell);
}

function onFocusOut(e: Event) {
    const target = e.target as Element | null;
    const cell = target?.closest?.(CELL_SELECTOR) as HTMLElement | null;
    if (!cell) return;
    const dateISO = cell.getAttribute("data-date");
    if (!dateISO || !props.entries[dateISO]) return;
    hide();
}

function onScrollOrResize() {
    if (!visible.value || !activeDateISO) return;
    const cell = document.querySelector(
        `${CELL_SELECTOR}[data-date="${activeDateISO}"]`,
    ) as HTMLElement | null;
    if (!cell) return;
    // Snap to the new position without transitioning so the note stays
    // glued to its cell while the page scrolls; re-enable the glide
    // shortly after scrolling settles.
    snap.value = true;
    positionFor(cell);
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
        snapTimer = undefined;
        snap.value = false;
    }, 120);
}

let boundCalendar: Element | null = null;

function bind() {
    unbind();
    const calendar = document.querySelector(CALENDAR_SELECTOR);
    if (!calendar) return;
    boundCalendar = calendar;
    calendar.addEventListener("mouseover", onPointerOver);
    calendar.addEventListener("mouseout", onPointerOut);
    calendar.addEventListener("focusin", onFocusIn);
    calendar.addEventListener("focusout", onFocusOut);
}

function unbind() {
    if (boundCalendar) {
        boundCalendar.removeEventListener("mouseover", onPointerOver);
        boundCalendar.removeEventListener("mouseout", onPointerOut);
        boundCalendar.removeEventListener("focusin", onFocusIn);
        boundCalendar.removeEventListener("focusout", onFocusOut);
        boundCalendar = null;
    }
}

function onPageLoad() {
    bind();
}

function onBeforeSwap() {
    unbind();
    clearShowTimer();
    clearHideTimer();
    visible.value = false;
    activeDateISO = null;
    pendingDateISO = null;
    pendingShow.value = false;
    if (snapTimer) {
        clearTimeout(snapTimer);
        snapTimer = undefined;
    }
    snap.value = false;
}

onMounted(() => {
    bind();
    window.addEventListener("astro:page-load", onPageLoad);
    window.addEventListener("astro:before-swap", onBeforeSwap);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
});

onUnmounted(() => {
    unbind();
    window.removeEventListener("astro:page-load", onPageLoad);
    window.removeEventListener("astro:before-swap", onBeforeSwap);
    window.removeEventListener("scroll", onScrollOrResize);
    window.removeEventListener("resize", onScrollOrResize);
    clearShowTimer();
    clearHideTimer();
    if (snapTimer) {
        clearTimeout(snapTimer);
        snapTimer = undefined;
    }
});
</script>

<template>
    <Transition name="preview">
        <div
            v-if="visible"
            ref="noteEl"
            aria-hidden="true"
            class="preview-note fixed z-50 w-72 min-h-72 border-2 border-accent bg-surface p-5 wrap-break-word"
            :class="{ 'preview-snap': snap }"
            :style="style"
            @mouseenter="onNoteEnter"
            @mouseleave="onNoteLeave"
        >
            <div class="mb-2 flex items-center justify-between gap-2">
                <span class="text-xs text-ink-soft">{{ dateLabel }}</span>
                <div class="flex gap-1.5">
                    <span
                        v-for="i in 5"
                        :key="i"
                        :class="i <= rating ? 'bg-accent' : 'bg-line'"
                        class="h-1.5 w-1.5"
                    />
                </div>
            </div>
            <p
                class="line-clamp-[8] whitespace-pre-wrap text-sm leading-relaxed text-ink"
            >
                {{ content }}
            </p>
        </div>
    </Transition>
</template>

<style scoped>
/* Base: glide the note between cells. Declared before the enter/leave
 * rules so those override `transition` (opacity/transform only) while the
 * note is appearing/disappearing — the first placement thus won't slide. */
.preview-note {
    transition:
        top 0.28s cubic-bezier(0.22, 1, 0.36, 1),
        left 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
/* Suppress the glide while repositioning on scroll/resize so the note
 * stays attached to its cell instead of lagging behind. */
.preview-snap {
    transition: none;
}
.preview-enter-active,
.preview-leave-active {
    transition:
        opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
        transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.preview-enter-from,
.preview-leave-to {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
}
</style>
