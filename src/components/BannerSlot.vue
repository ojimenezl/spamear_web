<template>
  <section class="banner" :class="[shape, size]">
    <div v-if="banner?.imageUrl" class="filled-wrap">
      <button
        class="filled"
        type="button"
        :aria-label="banner.title || 'Ver anuncio'"
        @click="$emit('view', banner)"
      >
        <img :src="banner.imageUrl" alt="" />
      </button>
      <button
        type="button"
        class="ver-btn"
        @click.stop="$emit('view', banner)"
      >
        ver
      </button>
    </div>
    <button v-else class="empty" type="button" @click="$emit('buy')">
      <strong>{{ emptyTitle }}</strong>
      <span v-if="emptyHint">{{ emptyHint }}</span>
    </button>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  banner: { type: Object, default: null },
  slotKey: { type: String, required: true },
  shape: { type: String, default: 'rect' },
  size: { type: String, default: 'md' },
})
defineEmits(['buy', 'view'])

const emptyTitle = computed(() => {
  if (props.size === 'mini') return 'Ad'
  return '+'
})

const emptyHint = computed(() => {
  if (props.size === 'mini') return ''
  return 'tu ad'
})
</script>

<style scoped>
.banner {
  position: relative;
  width: 100%;
}

.filled-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.filled,
.empty {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
  padding: 0;
  cursor: pointer;
}

.filled img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.filled:hover img {
  transform: scale(1.04);
}

.ver-btn {
  position: absolute;
  right: 0.28rem;
  bottom: 0.28rem;
  z-index: 2;
  font-family: var(--display);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.14rem 0.4rem;
  border-radius: 0.3rem;
  border: 1px solid var(--line-strong);
  background: rgba(30, 30, 30, 0.88);
  color: var(--ink);
}

.ver-btn:hover {
  border-color: rgba(227, 93, 90, 0.5);
  color: var(--black);
  background: var(--red-soft);
}

.banner.mini .ver-btn {
  font-size: 0.55rem;
  padding: 0.1rem 0.28rem;
  right: 0.15rem;
  bottom: 0.12rem;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  color: var(--muted);
  border: 1.5px dashed rgba(255, 255, 255, 0.28);
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 6px,
      rgba(255, 255, 255, 0.03) 6px,
      rgba(255, 255, 255, 0.03) 12px
    ),
    var(--surface);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.empty:hover {
  border-color: rgba(227, 93, 90, 0.55);
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 6px,
      rgba(227, 93, 90, 0.08) 6px,
      rgba(227, 93, 90, 0.08) 12px
    ),
    var(--red-soft);
  color: var(--black);
}

.empty strong {
  font-family: var(--display);
  font-size: 0.95rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  position: relative;
  z-index: 1;
}

.empty span:last-child {
  font-size: 0.58rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
}

.rect .filled,
.rect .empty,
.rect .filled-wrap {
  border-radius: 0.55rem;
  min-height: 44px;
  aspect-ratio: 2.2 / 1;
}

.rect.tall .filled,
.rect.tall .empty,
.rect.tall .filled-wrap {
  min-height: 80px;
  aspect-ratio: auto;
  height: 100%;
  border-radius: 0.5rem;
}

.rect.mini .filled,
.rect.mini .empty,
.rect.mini .filled-wrap {
  min-height: 28px;
  aspect-ratio: 2.6 / 1;
  border-radius: 0.4rem;
}

.rect.mini .empty strong {
  font-size: 0.65rem;
}

.rect.foot .filled,
.rect.foot .empty,
.rect.foot .filled-wrap {
  min-height: 0;
  aspect-ratio: auto;
  height: 100%;
}
</style>
