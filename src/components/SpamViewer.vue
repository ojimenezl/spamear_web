<template>
  <div class="viewer-overlay" :class="mode" @click.self="$emit('close')">
    <div class="flash" aria-hidden="true" />
    <button type="button" class="nav prev" :disabled="!canPrev" @click="$emit('prev')" aria-label="Anterior">
      ‹
    </button>

    <div class="stage" :class="mode">
      <p v-if="label" class="tag">{{ label }}</p>
      <div class="card-wrap">
        <SpamCard :spam="spam" :alive="false" />
      </div>
      <div class="meta">
        <h2>{{ spam.title }}</h2>
        <p v-if="spam.country" class="country">{{ spam.country }}</p>
        <p class="desc">{{ spam.description }}</p>
        <div class="links">
          <a v-if="spam.socials?.instagram" :href="ig" target="_blank" rel="noopener">IG</a>
          <a v-if="spam.socials?.twitter" :href="x" target="_blank" rel="noopener">X</a>
          <a v-if="spam.socials?.tiktok" :href="tt" target="_blank" rel="noopener">TT</a>
          <a v-if="spam.socials?.youtube" :href="yt" target="_blank" rel="noopener">YT</a>
          <a v-if="spam.socials?.web" :href="spam.socials.web" target="_blank" rel="noopener">WEB</a>
          <a v-if="spam.links?.[0]" :href="spam.links[0]" target="_blank" rel="noopener">↗</a>
        </div>
        <p class="counter">{{ index + 1 }} / {{ total }}</p>
      </div>
      <button type="button" class="x" @click="$emit('close')" aria-label="Cerrar">×</button>
    </div>

    <button type="button" class="nav next" :disabled="!canNext" @click="$emit('next')" aria-label="Siguiente">
      ›
    </button>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import SpamCard from './SpamCard.vue'

const props = defineProps({
  spam: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  /** kof = top10 dramático · soft = muro */
  mode: { type: String, default: 'kof' },
  label: { type: String, default: '' },
})

const emit = defineEmits(['close', 'prev', 'next'])

const canPrev = computed(() => props.index > 0)
const canNext = computed(() => props.index < props.total - 1)

function socialHref(handle, base) {
  if (!handle) return '#'
  if (/^https?:\/\//i.test(handle)) return handle
  return `${base}${String(handle).replace(/^@/, '')}`
}

const ig = computed(() =>
  socialHref(props.spam.socials?.instagram, 'https://instagram.com/')
)
const x = computed(() => socialHref(props.spam.socials?.twitter, 'https://x.com/'))
const tt = computed(() =>
  socialHref(props.spam.socials?.tiktok, 'https://tiktok.com/@')
)
const yt = computed(() => {
  const y = props.spam.socials?.youtube
  if (!y) return '#'
  if (/^https?:\/\//i.test(y)) return y
  return `https://youtube.com/${String(y)}`
})

function onKey(e) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') emit('prev')
  if (e.key === 'ArrowRight') emit('next')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(8, 8, 8, 0.82);
  backdrop-filter: blur(8px);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
}

.flash {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    transparent 40%,
    rgba(227, 93, 90, 0.35) 50%,
    transparent 60%
  );
  opacity: 0;
}

.viewer-overlay.kof .flash {
  animation: kofSlash 0.55s ease-out both;
}

.viewer-overlay.soft .flash {
  animation: softFlash 0.35s ease-out both;
}

@keyframes kofSlash {
  0% {
    opacity: 0;
    transform: translateX(-40%) skewX(-18deg);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(40%) skewX(-18deg);
  }
}

@keyframes softFlash {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 0;
  }
}

.stage {
  position: relative;
  width: min(720px, 100%);
  justify-self: center;
  display: grid;
  grid-template-columns: minmax(160px, 240px) 1fr;
  gap: 1rem;
  padding: 1.1rem;
  border: 1.5px solid rgba(227, 93, 90, 0.45);
  border-radius: 0.85rem;
  background: var(--surface);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
}

.stage.kof {
  animation: kofReveal 0.55s cubic-bezier(0.16, 1.2, 0.3, 1) both;
}

.stage.soft {
  animation: softReveal 0.32s ease both;
}

@keyframes kofReveal {
  0% {
    opacity: 0;
    transform: scale(0.35) translateY(80px) rotate(-4deg);
    filter: brightness(2.2) contrast(1.4);
  }
  55% {
    opacity: 1;
    transform: scale(1.08) translateY(-6px) rotate(1deg);
    filter: brightness(1.15);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0) rotate(0);
    filter: none;
  }
}

@keyframes softReveal {
  from {
    opacity: 0;
    transform: scale(0.88) translateY(18px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.tag {
  position: absolute;
  top: -0.7rem;
  left: 1rem;
  margin: 0;
  padding: 0.15rem 0.55rem;
  background: var(--red-deep);
  color: #f5ecea;
  font-family: var(--display);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-radius: 0.3rem;
}

.card-wrap :deep(.tile) {
  max-height: 260px;
}

.meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta h2 {
  margin: 0.4rem 0 0;
  font-family: var(--display);
  font-size: clamp(1.3rem, 3vw, 1.9rem);
  font-weight: 800;
  line-height: 1.1;
}

.country {
  margin: 0;
  color: var(--red);
  font-size: 0.8rem;
  font-weight: 700;
}

.desc {
  margin: 0;
  color: var(--ink);
  font-size: 0.9rem;
  line-height: 1.4;
  max-height: 9rem;
  overflow: auto;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.links a {
  font-family: var(--display);
  font-size: 0.75rem;
  font-weight: 750;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
  color: var(--black);
}

.counter {
  margin: 0.4rem 0 0;
  color: var(--muted);
  font-family: var(--display);
  font-weight: 700;
  letter-spacing: 0.06em;
}

.x {
  position: absolute;
  top: 0.45rem;
  right: 0.55rem;
  font-size: 1.6rem;
  line-height: 1;
  width: 2rem;
  height: 2rem;
  font-weight: 800;
  color: var(--muted);
}

.nav {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: 1.5px solid var(--line-strong);
  background: var(--surface);
  color: var(--black);
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: var(--shadow);
}

.nav:hover:not(:disabled) {
  border-color: rgba(227, 93, 90, 0.55);
  background: var(--red-soft);
}

.nav:disabled {
  opacity: 0.3;
  cursor: default;
}

@media (max-width: 700px) {
  .stage {
    grid-template-columns: 1fr;
  }

  .card-wrap {
    max-width: 220px;
    margin: 0 auto;
  }

  .nav {
    width: 2.4rem;
    height: 2.4rem;
    font-size: 1.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage.kof,
  .stage.soft,
  .flash {
    animation: none;
  }
}
</style>
