<template>
  <div class="logo" :class="{ compact }">
    <span class="badge">SPAMEAR</span>
  </div>
</template>

<script setup>
defineProps({
  compact: { type: Boolean, default: false },
})
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  background: var(--red-deep);
  color: #f5ecea;
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(1.25rem, 2.5vw, 1.65rem);
  letter-spacing: 0.06em;
  line-height: 1;
  padding: 0.38rem 0.65rem 0.32rem;
  border: 1.5px solid rgba(233, 237, 239, 0.12);
  border-radius: 0.35rem;
  text-transform: uppercase;
}

.compact .badge {
  font-size: 0.95rem;
  padding: 0.26rem 0.45rem 0.22rem;
}
</style>
