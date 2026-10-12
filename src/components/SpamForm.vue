<template>
  <div class="overlay" @click.self="$emit('close')">
    <div ref="sheetEl" class="sheet" role="dialog" aria-modal="true">
      <header class="sheet-head">
        <div>
          <p class="eyebrow">{{ destinationLabel }}</p>
          <h2>PUBLICAR</h2>
        </div>
        <button type="button" class="x" @click="$emit('close')" aria-label="Cerrar">×</button>
      </header>

      <form class="grid" @submit.prevent="submit">
        <div class="main">
          <label>
            Título
            <input
              v-model="form.title"
              :minlength="TITLE_MIN"
              :maxlength="TITLE_MAX"
              required
              placeholder="Lo que quieres gritar"
            />
            <small class="hint count" :class="{ bad: form.title.trim().length < TITLE_MIN }">
              {{ form.title.trim().length }}/{{ TITLE_MIN }} mín · máx {{ TITLE_MAX }}
            </small>
          </label>
          <label>
            Descripción
            <textarea
              v-model="form.description"
              :minlength="DESC_MIN"
              :maxlength="DESC_MAX"
              rows="5"
              required
              placeholder="Cuenta tu cosa sin rodeos"
            />
            <small class="hint count" :class="{ bad: form.description.trim().length < DESC_MIN }">
              {{ form.description.trim().length }}/{{ DESC_MIN }} mín · máx {{ DESC_MAX }}
            </small>
            <small v-if="destination === 'banner'" class="hint">
              En la home del banner solo se ve la imagen; la descripción se muestra al pulsar «ver».
            </small>
          </label>
          <label>
            Categoría
            <input
              v-model="catQuery"
              placeholder="Buscar categoría…"
              @focus="catOpen = true"
              @input="searchCats"
            />
            <ul v-if="catOpen" class="cat-list">
              <li
                v-for="c in categories"
                :key="c"
                @mousedown.prevent="pickCat(c)"
              >
                {{ c }}
              </li>
            </ul>
            <span v-if="form.category" class="picked">{{ form.category }}</span>
          </label>
          <label>
            País
            <select v-model="form.country" required>
              <option disabled value="">Selecciona un país</option>
              <option v-for="c in COUNTRIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <div class="price-row">
            <span class="price-label">Precio (USD)</span>
            <div class="price-line">
              <div class="price-smart" :class="{ off: form.isFree }">
                <span class="currency">$</span>
                <input
                  :value="priceDisplay"
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  :disabled="form.isFree"
                  placeholder="0.00"
                  aria-label="Precio en USD"
                  @keydown="onPriceKeydown"
                  @beforeinput="onPriceBeforeInput"
                  @paste.prevent="onPricePaste"
                />
              </div>
              <label class="free-check">
                <input v-model="form.isFree" type="checkbox" @change="onFreeToggle" />
                <span>Gratis</span>
              </label>
            </div>
            <small class="hint">Escribe dígitos: 4 → $0.04 · 40 → $0.40 · 400 → $4.00</small>
          </div>

          <p class="links-head">Enlaces <small>(máx. 6)</small></p>
          <div class="row3">
            <label>
              Instagram
              <input v-model="form.socials.instagram" placeholder="@user" />
            </label>
            <label>
              X / Twitter
              <input v-model="form.socials.twitter" placeholder="@user" />
            </label>
            <label>
              TikTok
              <input v-model="form.socials.tiktok" placeholder="@user" />
            </label>
          </div>
          <div class="row3">
            <label>
              YouTube
              <input v-model="form.socials.youtube" placeholder="https://youtube.com/…" />
            </label>
            <label>
              Web
              <input v-model="form.socials.web" placeholder="https://" />
            </label>
            <label>
              Link
              <input v-model="form.link" placeholder="https://…" />
            </label>
          </div>
          <label>
            Link de imagen
            <input
              v-model="form.imageUrl"
              placeholder="https://drive.google.com/… o Imgur"
              :required="destination === 'banner'"
            />
            <small class="hint">
              No subimos archivos. Sube tu imagen a Drive, Imgur, Cloudinary… y pega aquí el link público.
            </small>
            <small class="hint dims">
              <template v-if="destination === 'banner'">
                Tamaño recomendado para este banner:
                <strong>{{ activeBannerSpec.label }}</strong>
                — {{ activeBannerSpec.hint }}
              </template>
              <template v-else-if="destination === 'top10'">
                Tamaño recomendado Top 10:
                <strong>{{ TOP10_IMAGE_SPEC.label }}</strong>
                — {{ TOP10_IMAGE_SPEC.hint }}
              </template>
              <template v-else>
                Foto en pantalla: <strong>~{{ CARD_IMAGE_SPEC.displayW }}×{{ CARD_IMAGE_SPEC.displayH }} px</strong>
                · Sube al menos <strong>{{ CARD_IMAGE_SPEC.label }}</strong>
              </template>
            </small>
          </label>

          <div
            v-if="hasImagePreview && destination !== 'top10' && destination !== 'banner'"
            ref="layoutPickEl"
            class="layout-pick"
          >
            <p class="layout-title">Elige el diseño de tu card</p>
            <p class="hint dims">
              Misma card que en el muro ({{ CARD_IMAGE_SPEC.displayW }}×{{ CARD_IMAGE_SPEC.displayH }} px la foto).
              Sube <strong>{{ CARD_IMAGE_SPEC.label }}</strong>.
            </p>
            <div class="previews">
              <button
                type="button"
                class="preview-opt card-live"
                :class="{ on: form.cardLayout === 'text' }"
                @click="form.cardLayout = 'text'"
              >
                <span class="opt-label">Texto + links</span>
                <SpamCard :spam="previewSpam" force-layout="text" :show-ver="false" />
              </button>
              <button
                type="button"
                class="preview-opt card-live"
                :class="{ on: form.cardLayout === 'image' }"
                @click="form.cardLayout = 'image'"
              >
                <span class="opt-label">Título + imagen</span>
                <SpamCard :spam="previewSpam" force-layout="image" :show-ver="false" />
              </button>
            </div>
          </div>

          <div
            v-if="destination === 'top10' && hasImagePreview"
            ref="layoutPickEl"
            class="layout-pick"
          >
            <p class="layout-title">Así se verá en tu puesto del Top 10</p>
            <p class="hint">Misma caja que en la lista Top 10 de la home.</p>
            <div class="top10-live">
              <div class="top10-preview">
                <span class="n">#</span>
                <img :src="form.imageUrl" alt="" />
                <strong>{{ form.title || 'Tu título' }}</strong>
                <span class="ver">ver</span>
              </div>
            </div>
            <small class="hint">
              Solo se ve la imagen de fondo + título. Ideal {{ TOP10_IMAGE_SPEC.label }}.
            </small>
          </div>

          <div
            v-if="destination === 'banner'"
            ref="layoutPickEl"
            class="layout-pick"
          >
            <p class="layout-title">Así se verá tu banner en pantalla</p>
            <p class="hint">
              Misma caja que en la home (tamaño real, no a escala).
            </p>
            <div class="banner-live" :class="activeBannerSpec.preview">
              <BannerSlot
                :banner="previewBanner"
                :slot-key="form.slotKey"
                shape="rect"
                :size="activeBannerSpec.size"
              />
            </div>
            <small class="hint dims">
              Sube al menos <strong>{{ activeBannerSpec.label }}</strong>
              — {{ activeBannerSpec.hint }}
            </small>
          </div>
        </div>

        <aside class="side">
          <template v-if="destination === 'top10'">
            <h3>Puja Top 10</h3>
            <p class="hint">
              Mínimo 1 céntimo del monedero. Misma puja = el primero se queda arriba.
              Supera la puja para trepar.
            </p>
            <label>
              Tu puja (céntavos USD)
              <input v-model.number="form.bidCents" type="number" min="1" required />
            </label>
          </template>

          <template v-else-if="destination === 'banner'">
            <h3>Espacio del salón</h3>
            <label>
              Ubicación
              <select v-model="form.slotKey">
                <option v-for="s in bannerSlots" :key="s.key" :value="s.key">
                  {{ s.label }} · {{ s.width || bannerSpec(s.key).width }}×{{
                    s.height || bannerSpec(s.key).height
                  }}
                </option>
              </select>
            </label>
            <p class="hint dims">
              Imagen obligatoria ·
              <strong>{{ activeBannerSpec.label }}</strong>
            </p>
            <label>
              Duración
              <select v-model="form.bannerDurationId">
                <option v-for="d in prices.banners" :key="d.id" :value="d.id">
                  {{ d.label }} — {{ formatUsd(d.priceCents) }}
                </option>
              </select>
            </label>
          </template>

          <template v-else>
            <h3>Duración</h3>
            <div class="opts">
              <label v-for="d in prices.durations" :key="d.id" class="opt">
                <input v-model="form.durationId" type="radio" :value="d.id" />
                <span>
                  <strong>{{ d.label }}</strong>
                  <em>{{ d.free ? 'Gratis' : formatUsd(d.priceCents) }}</em>
                </span>
              </label>
            </div>
            <h3>Fijar (opcional)</h3>
            <div class="opts">
              <label class="opt">
                <input v-model="form.pinId" type="radio" value="" />
                <span><strong>Sin fijar</strong></span>
              </label>
              <label v-for="p in prices.pins" :key="p.id" class="opt">
                <input v-model="form.pinId" type="radio" :value="p.id" />
                <span>
                  <strong>{{ p.label }}</strong>
                  <em>{{ formatUsd(p.priceCents) }}</em>
                </span>
              </label>
            </div>
          </template>

          <div class="wallet-box">
            <p>Tu crédito: <strong>{{ formatUsd(user?.creditsCents || 0) }}</strong></p>
            <button type="button" class="ghost" @click="$emit('wallet')">Recargar monedero</button>
          </div>

          <p v-if="error" class="error">{{ error }}</p>
          <button class="cta" type="submit" :disabled="loading">
            {{ loading ? 'Publicando…' : 'Spamear +' }}
          </button>
        </aside>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { api, formatUsd } from '../api'
import SpamCard from './SpamCard.vue'
import BannerSlot from './BannerSlot.vue'
import {
  COUNTRIES,
  TITLE_MIN,
  TITLE_MAX,
  DESC_MIN,
  DESC_MAX,
  PRICE_MAX_CENTS,
} from '../data/countries'
import {
  CARD_IMAGE_SPEC,
  TOP10_IMAGE_SPEC,
  bannerSpec,
} from '../data/imageSpecs'

const props = defineProps({
  destination: { type: String, default: 'live' },
  prices: { type: Object, required: true },
  user: { type: Object, default: null },
  bannerSlot: { type: String, default: 'strip-mid' },
  bannerSlots: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'done', 'wallet'])

const defaultSlots = [
  { key: 'strip-top', label: 'Junto al logo', priceHint: 'mini' },
  { key: 'left-1', label: 'Izq. 1', priceHint: 'vertical' },
  { key: 'left-2', label: 'Izq. 2', priceHint: 'vertical' },
  { key: 'left-3', label: 'Izq. 3', priceHint: 'vertical' },
  { key: 'circle-a', label: 'Der. 1', priceHint: 'vertical' },
  { key: 'circle-b', label: 'Der. 2', priceHint: 'vertical' },
  { key: 'circle-c', label: 'Der. 3', priceHint: 'vertical' },
  { key: 'circle-d', label: 'Der. 4', priceHint: 'vertical' },
  { key: 'foot-1', label: 'Pie 1', priceHint: 'franja' },
  { key: 'foot-2', label: 'Pie 2', priceHint: 'franja' },
  { key: 'foot-3', label: 'Pie 3', priceHint: 'franja' },
  { key: 'foot-4', label: 'Pie 4', priceHint: 'franja' },
]

const bannerSlots = computed(() =>
  props.bannerSlots?.length ? props.bannerSlots : defaultSlots
)

const form = reactive({
  title: '',
  description: '',
  category: '',
  country: '',
  isFree: false,
  imageUrl: '',
  cardLayout: 'text',
  link: '',
  socials: { instagram: '', twitter: '', tiktok: '', youtube: '', web: '' },
  durationId: '30m',
  pinId: '',
  bidCents: 1,
  slotKey: props.bannerSlot || 'left-1',
  bannerDurationId: '1h',
})

const activeBannerSpec = computed(() => bannerSpec(form.slotKey))

/** Dígitos crudos del precio (en céntimos), estilo cajero */
const priceDigits = ref('')
const sheetEl = ref(null)
const layoutPickEl = ref(null)
const catQuery = ref('')
const categories = ref([])
const catOpen = ref(false)
const loading = ref(false)
const error = ref('')

const priceCentsValue = computed(() => {
  if (form.isFree) return 0
  if (!priceDigits.value) return null
  return Number(priceDigits.value)
})

const priceDisplay = computed(() => {
  const cents = Number(priceDigits.value || '0')
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
})

function setPriceDigits(next) {
  const clean = String(next || '').replace(/\D/g, '')
  if (!clean) {
    priceDigits.value = ''
    return
  }
  const asNum = Number(clean)
  if (asNum > PRICE_MAX_CENTS) {
    priceDigits.value = String(PRICE_MAX_CENTS)
    return
  }
  // quita ceros a la izquierda pero deja al menos lo escrito útil
  priceDigits.value = String(asNum)
}

function onPriceKeydown(e) {
  if (form.isFree) return
  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    setPriceDigits(priceDigits.value + e.key)
    return
  }
  if (e.key === 'Backspace') {
    e.preventDefault()
    setPriceDigits(priceDigits.value.slice(0, -1))
    return
  }
  if (e.key === 'Delete') {
    e.preventDefault()
    priceDigits.value = ''
    return
  }
  // permitir tabs/flechas
  if (['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  e.preventDefault()
}

function onPriceBeforeInput(e) {
  // refuerzo para móviles
  if (form.isFree) return
  if (e.inputType === 'insertText' && e.data && /^\d+$/.test(e.data)) {
    e.preventDefault()
    setPriceDigits(priceDigits.value + e.data)
  }
  if (e.inputType === 'deleteContentBackward') {
    e.preventDefault()
    setPriceDigits(priceDigits.value.slice(0, -1))
  }
}

function onPricePaste(e) {
  if (form.isFree) return
  const text = e.clipboardData?.getData('text') || ''
  setPriceDigits(text.replace(/\D/g, ''))
}

const destinationLabel = computed(() => {
  if (props.destination === 'top10') return 'Top 10'
  if (props.destination === 'banner') return 'Espacio publicitario'
  if (props.destination === 'featured') return 'Destacado'
  return 'Muro · 30 min'
})

const hasImagePreview = computed(() => {
  const u = String(form.imageUrl || '').trim()
  return /^https?:\/\//i.test(u)
})

const previewBanner = computed(() => {
  if (!hasImagePreview.value) return null
  return {
    imageUrl: form.imageUrl.trim(),
    title: form.title.trim() || 'Tu anuncio',
    linkUrl: form.socials.web || form.link.trim() || '',
  }
})

const previewSpam = computed(() => ({
  id: 'preview',
  title: form.title || 'Tu título',
  description: form.description || 'Tu descripción aparecerá aquí…',
  category: form.category || 'Categoría',
  country: form.country,
  imageUrl: form.imageUrl,
  links: form.link.trim() ? [form.link.trim()] : [],
  socials: { ...form.socials },
  priceCents: form.isFree ? 0 : priceCentsValue.value,
  isFree: form.isFree,
  cardLayout: form.cardLayout,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  pinUntil: null,
  owner: null,
}))

watch(
  () => props.bannerSlot,
  (v) => {
    if (v) form.slotKey = v
  }
)

watch(
  () => form.imageUrl,
  async (v) => {
    if (!String(v || '').trim()) {
      form.cardLayout = 'text'
      return
    }
    if (!/^https?:\/\//i.test(String(v).trim())) return
    await nextTick()
    layoutPickEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
)

watch(
  () => form.slotKey,
  async () => {
    if (props.destination !== 'banner') return
    await nextTick()
    layoutPickEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
)

watch(
  () => form.isFree,
  (free) => {
    if (free) priceDigits.value = ''
  }
)

function onFreeToggle() {
  if (form.isFree) priceDigits.value = ''
}

async function searchCats() {
  const data = await api(`/categories?q=${encodeURIComponent(catQuery.value)}`)
  categories.value = data.items
  catOpen.value = true
}

function pickCat(c) {
  form.category = c
  catQuery.value = c
  catOpen.value = false
}

searchCats()

async function submit() {
  error.value = ''
  if (!props.user) {
    error.value = 'Inicia sesión con Google primero'
    return
  }
  if (form.title.trim().length < TITLE_MIN) {
    error.value = `Título: mínimo ${TITLE_MIN} caracteres`
    return
  }

  if (!form.category) {
    error.value = 'Elige una categoría'
    return
  }
  if (!form.country) {
    error.value = 'Elige un país'
    return
  }
  if (form.description.trim().length < DESC_MIN) {
    error.value = `Descripción: mínimo ${DESC_MIN} caracteres`
    return
  }
  if (
    !form.isFree &&
    priceCentsValue.value != null &&
    priceCentsValue.value > PRICE_MAX_CENTS
  ) {
    error.value = `Precio máximo: ${formatUsd(PRICE_MAX_CENTS)}`
    return
  }

  if (props.destination === 'banner') {
    if (!hasImagePreview.value) {
      error.value = 'La imagen es obligatoria para el banner'
      return
    }
    loading.value = true
    try {
      const data = await api('/banners', {
        method: 'POST',
        body: {
          slotKey: form.slotKey,
          durationId: form.bannerDurationId,
          imageUrl: form.imageUrl.trim(),
          linkUrl: form.socials.web || form.link.trim() || '',
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          country: form.country,
          priceCents: form.isFree ? 0 : priceCentsValue.value,
          isFree: form.isFree,
          socials: form.socials,
          links: form.link.trim() ? [form.link.trim()] : [],
        },
      })
      emit('done', data)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
    return
  }

  loading.value = true
  try {
    const data = await api('/spam', {
      method: 'POST',
      body: {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        country: form.country,
        priceCents: form.isFree ? 0 : priceCentsValue.value,
        isFree: form.isFree,
        imageUrl: form.imageUrl,
        cardLayout:
          props.destination === 'top10' && hasImagePreview.value
            ? 'image'
            : hasImagePreview.value && form.cardLayout === 'image'
              ? 'image'
              : 'text',
        socials: form.socials,
        links: form.link.trim() ? [form.link.trim()] : [],
        destination: props.destination === 'featured' ? 'featured' : props.destination,
        durationId: form.durationId,
        pinId: form.pinId || null,
        bidCents: form.bidCents,
      },
    })
    emit('done', data)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(11, 11, 11, 0.45);
  display: grid;
  place-items: end center;
  padding: 0;
}

@media (min-width: 900px) {
  .overlay {
    place-items: center;
    padding: 1.5rem;
  }
}

.sheet {
  width: min(960px, 100%);
  max-height: min(92vh, 960px);
  overflow: auto;
  background: var(--cream-soft);
  border: 1.5px solid var(--line-strong);
  border-radius: 0.5rem 0.5rem 0 0;
  box-shadow: var(--shadow);
  animation: rise 0.25s ease both;
  color: var(--black);
}

@media (min-width: 900px) {
  .sheet {
    border-radius: 0.5rem;
  }
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.2rem;
  border-bottom: 1.5px solid var(--line-strong);
  position: sticky;
  top: 0;
  background: var(--cream-soft);
  z-index: 2;
}

.eyebrow {
  margin: 0;
  color: var(--red);
  font-family: var(--display);
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.14em;
}

h2 {
  margin: 0.1rem 0 0;
  font-family: var(--display);
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.x {
  font-size: 1.6rem;
  line-height: 1;
  width: 2rem;
  height: 2rem;
  font-weight: 800;
}

.grid {
  display: grid;
  gap: 1.15rem;
  padding: 1.15rem;
}

@media (min-width: 860px) {
  .grid {
    grid-template-columns: 1.4fr 0.9fr;
  }
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

input,
textarea,
select {
  border: 1.5px solid var(--line-strong);
  border-radius: 0.4rem;
  padding: 0.6rem 0.7rem;
  background: var(--surface);
  font-weight: 500;
  outline: none;
  text-transform: none;
  letter-spacing: 0;
}

input:disabled {
  opacity: 0.45;
}

input:focus,
textarea:focus,
select:focus {
  border-color: rgba(196, 30, 26, 0.4);
  box-shadow: 0 0 0 3px var(--red-soft);
}

.hint {
  font-weight: 500;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.35;
  text-transform: none;
  letter-spacing: 0;
}

.hint.count.bad {
  color: var(--red);
}

.links-head {
  margin: 0 0 0.45rem;
  font-family: var(--display);
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.links-head small {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.75rem;
}

.price-row {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.price-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.price-line {
  display: flex;
  align-items: stretch;
  gap: 0.65rem;
}

.price-smart {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.4rem;
  padding: 0 0.7rem;
  background: var(--surface);
}

.price-smart.off {
  opacity: 0.45;
}

.price-smart .currency {
  font-family: var(--display);
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--red);
}

.price-smart input {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0.6rem 0;
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.price-smart input:focus {
  border: none;
  box-shadow: none;
}

.free-check {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin: 0;
  padding: 0 0.85rem;
  border: 1.5px dashed var(--line-strong);
  border-radius: 0.4rem;
  background: var(--surface);
  cursor: pointer;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.85rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.free-check span {
  font-weight: 700;
  color: var(--ink);
}

.layout-pick {
  margin: 0.5rem 0 1rem;
  padding: 0.85rem;
  border: 1.5px dashed rgba(255, 255, 255, 0.22);
  border-radius: 0.55rem;
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 7px,
      rgba(255, 255, 255, 0.025) 7px,
      rgba(255, 255, 255, 0.025) 14px
    ),
    var(--surface);
}

.layout-title {
  margin: 0 0 0.7rem;
  font-family: var(--display);
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.04em;
}

.top10-live {
  width: var(--top10-w);
  max-width: 100%;
  margin: 0.45rem 0 0.25rem;
}

.top10-preview {
  position: relative;
  display: grid;
  grid-template-columns: 1rem 1fr auto;
  gap: 0.3rem;
  align-items: center;
  min-height: 2.4rem;
  padding: 0.35rem 0.3rem;
  border-radius: 0.4rem;
  overflow: hidden;
  border: 1.5px solid var(--line-strong);
}

.top10-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.top10-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(12, 12, 12, 0.85), rgba(12, 12, 12, 0.35));
}

.top10-preview > * {
  position: relative;
  z-index: 1;
}

.top10-preview .n,
.top10-preview strong,
.top10-preview .ver {
  color: #f2f2f2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.75);
}

.top10-preview .n {
  font-family: var(--display);
  font-weight: 800;
}

/* Misma caja CSS que en App.vue (vars globales) */
.banner-live {
  margin: 0.55rem auto 0.35rem;
  flex-shrink: 0;
  pointer-events: none;
}

.banner-live.tall {
  width: var(--banner-edge-w);
  height: var(--banner-tall-h);
}

.banner-live.mini {
  width: var(--banner-mini-w);
  height: auto;
}

.banner-live.foot {
  width: var(--banner-foot-w);
  height: var(--banner-foot-h);
  max-width: 100%;
}

.banner-live :deep(.banner),
.banner-live :deep(.filled-wrap),
.banner-live :deep(.filled),
.banner-live :deep(.empty) {
  width: 100%;
  height: 100%;
  min-height: 0;
  aspect-ratio: auto;
}

.banner-live.mini :deep(.filled-wrap),
.banner-live.mini :deep(.filled),
.banner-live.mini :deep(.empty) {
  aspect-ratio: 2.6 / 1;
  height: auto;
  min-height: 28px;
}

.banner-live :deep(.ver-btn) {
  display: none;
}

.hint.dims {
  display: block;
  margin-top: 0.25rem;
  color: var(--ink);
}

.hint.dims strong {
  color: var(--red);
  font-weight: 750;
}

.top10-preview strong {
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top10-preview .ver {
  font-family: var(--display);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.3rem;
}

.previews {
  display: grid;
  gap: 0.75rem;
}

@media (min-width: 560px) {
  .previews {
    grid-template-columns: 1fr 1fr;
  }
}

.preview-opt {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.55rem;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.55rem;
  background: var(--surface-2);
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.preview-opt.on {
  border-color: rgba(227, 93, 90, 0.65);
  box-shadow: 0 0 0 3px var(--red-soft);
}

.opt-label {
  font-family: var(--display);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.preview-opt.on .opt-label {
  color: var(--red);
}

.preview-opt.card-live {
  align-items: flex-start;
}

.preview-opt.card-live :deep(.tile) {
  width: var(--card-w);
  height: var(--card-h);
  max-width: var(--card-w);
  max-height: var(--card-h);
}

.preview-opt :deep(.tile) {
  pointer-events: none;
}

.row3 {
  display: grid;
  gap: 0.45rem;
}

@media (min-width: 600px) {
  .row3 {
    grid-template-columns: repeat(3, 1fr);
  }
}

.cat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 150px;
  overflow: auto;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.4rem;
  background: var(--surface);
}

.cat-list li {
  padding: 0.5rem 0.65rem;
  cursor: pointer;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  border-bottom: 1px solid var(--line);
}

.cat-list li:hover {
  background: var(--red-soft);
}

.picked {
  color: var(--red);
  font-size: 0.78rem;
}

.side {
  border-top: 1.5px solid var(--line-strong);
  padding-top: 0.75rem;
}

@media (min-width: 860px) {
  .side {
    border-top: none;
    border-left: 1.5px solid var(--line-strong);
    padding-left: 1.1rem;
    padding-top: 0;
  }
}

.side h3 {
  margin: 0 0 0.5rem;
  font-family: var(--display);
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.opts {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.9rem;
}

.opt {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.5rem 0.55rem;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.4rem;
  cursor: pointer;
  background: var(--surface);
  text-transform: none;
  letter-spacing: 0;
}

.opt span {
  display: flex;
  justify-content: space-between;
  width: 100%;
  gap: 0.5rem;
  font-weight: 600;
}

.opt em {
  font-style: normal;
  color: var(--muted);
}

.wallet-box {
  margin: 0.9rem 0;
  padding: 0.75rem;
  border: 1.5px dashed var(--line-strong);
  border-radius: 0.4rem;
  background: var(--surface);
}

.wallet-box p {
  margin: 0 0 0.5rem;
  text-transform: none;
  letter-spacing: 0;
}

.ghost {
  border: 1.5px solid var(--line-strong);
  border-radius: 0.4rem;
  padding: 0.4rem 0.7rem;
  font-family: var(--display);
  font-weight: 800;
  letter-spacing: 0.06em;
  background: var(--surface);
  font-size: 0.85rem;
}

.cta {
  width: 100%;
  background: var(--red-deep);
  color: #f5ecea;
  border: 1.5px solid rgba(233, 237, 239, 0.1);
  border-radius: 0.45rem;
  padding: 0.85rem 1rem;
  font-weight: 800;
  font-family: var(--display);
  font-size: 1.2rem;
  letter-spacing: 0.06em;
}

.cta:disabled {
  opacity: 0.6;
}

.error {
  color: var(--red);
  font-family: var(--display);
  font-weight: 800;
  letter-spacing: 0.04em;
  font-size: 0.9rem;
}
</style>
