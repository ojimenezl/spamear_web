<template>
  <article class="tile" :class="{ pinned, featured, image: isImageLayout }">
    <div class="inner">
      <div class="row-title">
        <h3 :title="spam.title">{{ spam.title }}</h3>
        <button v-if="showVer" type="button" class="ver-btn" @click.stop="$emit('view')">
          ver
        </button>
      </div>

      <div class="row-meta">
        <span v-if="priceLabel" class="meta price" :class="{ free: isFree }">{{ priceLabel }}</span>
        <span v-else class="meta muted">—</span>
        <span class="meta time">{{ timeLeft(spam.expiresAt) }}</span>
        <span v-if="pinned" class="meta pin">PIN</span>
        <span v-if="spam.owner?.verified" class="meta ok">✓</span>
      </div>

      <div class="mid">
        <div v-if="isImageLayout" class="photo">
          <img v-if="mediaSrc" :src="mediaSrc" alt="" loading="lazy" />
          <span v-else class="photo-empty">Sin imagen</span>
          <span v-if="isYoutube" class="yt-badge">▶</span>
        </div>
        <p v-else class="desc">{{ spam.description }}</p>
      </div>

      <div class="socials">
        <a v-if="spam.socials?.instagram" :href="igUrl" target="_blank" rel="noopener" title="Instagram">IG</a>
        <a v-if="spam.socials?.twitter" :href="xUrl" target="_blank" rel="noopener" title="X">X</a>
        <a v-if="spam.socials?.tiktok" :href="ttUrl" target="_blank" rel="noopener" title="TikTok">TT</a>
        <a v-if="spam.socials?.youtube" :href="ytUrl" target="_blank" rel="noopener" title="YouTube">YT</a>
        <a v-if="spam.socials?.web" :href="spam.socials.web" target="_blank" rel="noopener" title="Web">WEB</a>
        <a
          v-if="spam.links?.[0]"
          :href="spam.links[0]"
          target="_blank"
          rel="noopener"
          title="Link"
        >↗</a>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { formatUsd, timeLeft } from '../api'

const props = defineProps({
  spam: { type: Object, required: true },
  featured: { type: Boolean, default: false },
  forceLayout: { type: String, default: '' },
  showVer: { type: Boolean, default: true },
})

defineEmits(['view'])

const pinned = computed(
  () => props.spam.pinUntil && new Date(props.spam.pinUntil) > new Date()
)

const isImageLayout = computed(() => {
  if (props.forceLayout === 'image') return true
  if (props.forceLayout === 'text') return false
  return String(props.spam?.cardLayout || '').toLowerCase() === 'image'
})

const isFree = computed(
  () => props.spam.isFree || props.spam.priceCents === 0
)

const priceLabel = computed(() => {
  if (isFree.value) return 'Gratis'
  if (props.spam.priceCents != null && props.spam.priceCents > 0) {
    return formatUsd(props.spam.priceCents)
  }
  return ''
})

function youtubeId(url) {
  if (!url) return null
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/
  )
  return m?.[1] || null
}

const ytFromLinks = computed(() => {
  const pool = [
    props.spam.socials?.youtube,
    props.spam.imageUrl,
    props.spam.socials?.web,
    ...(props.spam.links || []),
  ]
  for (const u of pool) {
    const id = youtubeId(u)
    if (id) return id
  }
  return null
})

const isYoutube = computed(() => !!ytFromLinks.value)

const mediaSrc = computed(() => {
  if (isImageLayout.value && ytFromLinks.value && !props.spam.imageUrl) {
    return `https://i.ytimg.com/vi/${ytFromLinks.value}/hqdefault.jpg`
  }
  if (ytFromLinks.value && isImageLayout.value) {
    const img = props.spam.imageUrl
    if (img && /^https?:\/\//i.test(img) && !youtubeId(img)) return img
    return `https://i.ytimg.com/vi/${ytFromLinks.value}/hqdefault.jpg`
  }
  const img = props.spam.imageUrl
  if (!img || !/^https?:\/\//i.test(img)) return null
  if (youtubeId(img)) {
    return `https://i.ytimg.com/vi/${youtubeId(img)}/hqdefault.jpg`
  }
  return img
})

function socialHref(handle, base) {
  if (!handle) return '#'
  if (/^https?:\/\//i.test(handle)) return handle
  return `${base}${String(handle).replace(/^@/, '')}`
}

const igUrl = computed(() =>
  socialHref(props.spam.socials?.instagram, 'https://instagram.com/')
)
const xUrl = computed(() =>
  socialHref(props.spam.socials?.twitter, 'https://x.com/')
)
const ttUrl = computed(() =>
  socialHref(props.spam.socials?.tiktok, 'https://tiktok.com/@')
)
const ytUrl = computed(() => {
  const y = props.spam.socials?.youtube
  if (!y) return '#'
  if (/^https?:\/\//i.test(y)) return y
  return `https://youtube.com/${String(y).replace(/^@/, '@')}`
})
</script>

<style scoped>
.tile {
  display: block;
  width: var(--card-w, 170px);
  height: var(--card-h, 170px);
  max-width: var(--card-w, 170px);
  max-height: var(--card-h, 170px);
  min-width: 0;
  aspect-ratio: auto;
  border-radius: 0.75rem;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  overflow: hidden;
  animation: rise 0.35s ease both;
  transition: border-color 0.2s ease, transform 0.2s ease;
  box-sizing: border-box;
}

.tile:hover {
  border-color: rgba(227, 93, 90, 0.5);
  transform: translateY(-2px);
}

.tile.featured {
  border-color: rgba(227, 93, 90, 0.4);
}

.tile.pinned {
  outline: 1px solid rgba(227, 93, 90, 0.45);
  outline-offset: -1px;
}

.inner {
  height: 100%;
  padding: 0.4rem 0.45rem 0.35rem;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 0.22rem;
  min-width: 0;
  box-sizing: border-box;
}

.tile.image .inner {
  grid-template-rows: auto auto var(--card-photo-h, 96px) auto;
}

.row-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.row-title h3 {
  flex: 1;
  margin: 0;
  min-width: 0;
  font-family: var(--display);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ver-btn {
  flex-shrink: 0;
  font-family: var(--display);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 0.35rem;
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
  color: var(--ink);
}

.ver-btn:hover {
  border-color: rgba(227, 93, 90, 0.5);
  color: var(--black);
}

.row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.45rem;
  min-width: 0;
}

.meta {
  font-family: var(--display);
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.02em;
  color: var(--muted);
}

.meta.price {
  color: var(--red);
}

.meta.price.free {
  color: #f0a09e;
}

.meta.pin {
  color: #f5ecea;
  background: var(--red-deep);
  padding: 0.05rem 0.3rem;
  border-radius: 999px;
}

.meta.ok {
  color: var(--black);
}

.meta.muted {
  opacity: 0.5;
}

.mid {
  min-height: 0;
  overflow: hidden;
}

.desc {
  margin: 0;
  height: 100%;
  color: var(--ink);
  font-size: 0.78rem;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  word-break: break-word;
}

.photo {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 0.4rem;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #0e0e0e;
}

.tile.image .photo {
  height: var(--card-photo-h, 96px);
  flex-shrink: 0;
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-empty {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--muted);
  font-size: 0.7rem;
  font-family: var(--display);
}

.yt-badge {
  position: absolute;
  top: 0.35rem;
  left: 0.35rem;
  z-index: 2;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--red-deep);
  color: #fff;
  font-size: 0.55rem;
}

.socials {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.2rem;
  min-width: 0;
}

.socials a {
  font-family: var(--display);
  font-size: 0.62rem;
  font-weight: 750;
  text-align: center;
  padding: 0.18rem 0.1rem;
  border-radius: 0.35rem;
  border: 1px solid var(--line-strong);
  background: rgba(0, 0, 0, 0.3);
  color: var(--black);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
