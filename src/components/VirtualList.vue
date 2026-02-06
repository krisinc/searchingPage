<template>
  <div ref="root" class="vl" @scroll="onScroll" :style="{ height: rootHeight }">
    <div class="vl__spacer" :style="{ height: totalHeight + 'px' }">
      <div class="vl__inner" :style="{ transform: `translateY(${offsetY}px)` }">
        <slot :items="visibleItems" :start="startIndex" :end="endIndex" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  items: any[]
  itemHeight: number
  overscan?: number
  height?: number | string
}>()

const emit = defineEmits<{
  (e: 'reach-end'): void
}>()

const thresholdPx = 800

const root = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const reachedEndLock = ref(false)

const overscan = computed(() => props.overscan ?? 8)

const rootHeight = computed(() => {
  if (typeof props.height === 'number') return props.height + 'px'
  return props.height ?? '70vh'
})

function updateViewport() {
  if (!root.value) return
  viewportHeight.value = root.value.clientHeight
}

let ro: ResizeObserver | null = null

onMounted(() => {
  updateViewport()
  ro = new ResizeObserver(() => updateViewport())
  if (root.value) ro.observe(root.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

function onScroll() {
  if (!root.value) return
  scrollTop.value = root.value.scrollTop

  const bottom = scrollTop.value + viewportHeight.value
  const hit = bottom >= totalHeight.value - thresholdPx

  if (hit && !reachedEndLock.value) {
    reachedEndLock.value = true
    emit('reach-end')
  } else if (!hit) {
    reachedEndLock.value = false
  }
}

function scrollToTop(behavior: ScrollBehavior = 'auto') {
  if (!root.value) return
  root.value.scrollTo({ top: 0, behavior })
  scrollTop.value = 0
  reachedEndLock.value = false
}

defineExpose({ scrollToTop })

const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  const raw = Math.floor(scrollTop.value / props.itemHeight) - overscan.value
  return Math.max(0, raw)
})

const endIndex = computed(() => {
  const count = Math.ceil(viewportHeight.value / props.itemHeight) + overscan.value * 2
  return Math.min(props.items.length, startIndex.value + count)
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

const visibleItems = computed(() => props.items.slice(startIndex.value, endIndex.value))
</script>

<style scoped lang="scss">
.vl {
  overflow: auto;
  position: relative;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #fff;
}

.vl__spacer {
  position: relative;
  width: 100%;
}

.vl__inner {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
}
</style>
