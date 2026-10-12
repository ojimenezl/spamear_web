<template>
  <div class="page">
    <aside class="edge-left" aria-label="Banners izquierda">
      <BannerSlot :banner="slot('left-1')" slot-key="left-1" shape="rect" size="tall" @buy="openForm('banner', 'left-1')" @view="openBannerView" />
      <BannerSlot :banner="slot('left-2')" slot-key="left-2" shape="rect" size="tall" @buy="openForm('banner', 'left-2')" @view="openBannerView" />
      <BannerSlot :banner="slot('left-3')" slot-key="left-3" shape="rect" size="tall" @buy="openForm('banner', 'left-3')" @view="openBannerView" />
    </aside>

    <div class="center">
      <aside class="top10 alive">
        <div class="panel-head">
          <div>
            <p class="eyebrow">spamears</p>
            <h1>Top 10</h1>
          </div>
        </div>
        <ol class="rank">
          <li
            v-for="item in feed.top10"
            :key="item.rank"
            :class="{
              empty: !item.spam,
              podium: item.rank <= 3,
              open: !item.spam,
              cover: !!rankMedia(item.spam),
            }"
            @click="!item.spam && openForm('top10')"
          >
            <img
              v-if="rankMedia(item.spam)"
              class="rank-cover"
              :src="rankMedia(item.spam)"
              alt=""
            />
            <span class="n">{{ item.rank }}</span>
            <template v-if="item.spam">
              <div class="rank-body">
                <strong>{{ item.spam.title }}</strong>
              </div>
              <button type="button" class="ver-btn" @click.stop="openTopViewer(item.rank)">
                ver
              </button>
            </template>
            <button v-else type="button" class="rank-claim" @click.stop="openForm('top10')">
              <span>Libre — clica para spam</span>
            </button>
          </li>
        </ol>
      </aside>

      <div class="main-col">
        <div class="nav-block">
          <header class="top">
            <div class="brand-row">
              <LogoMark />
              <BannerSlot
                class="logo-ad"
                :banner="slot('strip-top')"
                slot-key="strip-top"
                shape="rect"
                size="mini"
                @buy="openForm('banner', 'strip-top')"
                @view="openBannerView"
              />
            </div>

            <form class="search" @submit.prevent="loadFeed">
              <input
                v-model="filters.q"
                type="search"
                placeholder="Buscar…"
                aria-label="Buscador"
              />
            </form>

            <div class="top-actions">
              <button
                type="button"
                class="btn-line"
                :class="{ on: filtersOpen }"
                @click="filtersOpen = !filtersOpen"
              >
                Filtro
              </button>
              <div class="auth">
                <template v-if="user">
                  <button type="button" class="member" @click="menuOpen = !menuOpen" title="Perfil">
                    <img v-if="user.avatar" :src="user.avatar" alt="" />
                    <span v-else class="avatar-fallback">{{ userInitial }}</span>
                  </button>
                  <div v-if="menuOpen" class="menu">
                    <div class="menu-meta">
                      <strong>{{ user.name }}</strong>
                      <small>{{ formatUsd(user.creditsCents) }}</small>
                    </div>
                    <button type="button" @click="openWallet(); menuOpen = false">Monedero</button>
                    <button type="button" @click="buyUnlimited(); menuOpen = false">VIP</button>
                    <button type="button" @click="buyVerified(); menuOpen = false">Verificado</button>
                    <button type="button" class="danger" @click="logout(); menuOpen = false">Salir</button>
                  </div>
                </template>
                <template v-else>
                  <button type="button" class="btn-red" @click="askLogin">Entrar</button>
                </template>
              </div>
            </div>
          </header>

          <div v-if="filtersOpen" class="filters">
            <input v-model="filters.category" list="cat-suggest" placeholder="Categoría" />
            <datalist id="cat-suggest">
              <option v-for="c in categoryHints" :key="c" :value="c" />
            </datalist>
            <input v-model.number="filters.minPrice" type="number" min="0" placeholder="Min $" />
            <input v-model.number="filters.maxPrice" type="number" min="0" placeholder="Max $" />
            <button type="button" class="btn-line" @click="loadFeed">Buscar</button>
          </div>
        </div>

        <main class="wall">
          <div class="wall-bar">
            <div>
              <p class="eyebrow">Muro</p>
              <h2>Publicaciones</h2>
            </div>
            <button type="button" class="btn-red" @click="openForm('live')">Spamear +</button>
          </div>

          <div class="wall-layout">
            <BannerSlot
              class="foot-slot f1"
              :banner="slot('foot-1')"
              slot-key="foot-1"
              shape="rect"
              size="foot"
              @buy="openForm('banner', 'foot-1')"
              @view="openBannerView"
            />
            <div class="wall-core">
              <div v-if="wallItems.length" class="wall-stage">
                <button
                  type="button"
                  class="wall-nav"
                  :disabled="wallPage <= 0 || wallLoading"
                  @click="shiftWall(-1)"
                  aria-label="Página anterior"
                >
                  ‹
                </button>
                <div class="tiles">
                  <SpamCard
                    v-for="s in wallItems"
                    :key="s.id"
                    :spam="s"
                    :featured="s._zone === 'featured'"
                    @view="openWallViewer(s.id)"
                  />
                </div>
                <button
                  type="button"
                  class="wall-nav"
                  :disabled="!canWallNext || wallLoading"
                  @click="shiftWall(1)"
                  aria-label="Página siguiente"
                >
                  ›
                </button>
              </div>
              <p v-else class="empty-zone">El muro está vacío. Sé el primero en hacer spam.</p>
              <p v-if="wallTotal > 0" class="wall-page">
                {{ wallPage + 1 }} / {{ wallPageCount }}
              </p>
            </div>
            <BannerSlot
              class="foot-slot f4"
              :banner="slot('foot-4')"
              slot-key="foot-4"
              shape="rect"
              size="foot"
              @buy="openForm('banner', 'foot-4')"
              @view="openBannerView"
            />
            <BannerSlot
              class="foot-slot f2"
              :banner="slot('foot-2')"
              slot-key="foot-2"
              shape="rect"
              size="foot"
              @buy="openForm('banner', 'foot-2')"
              @view="openBannerView"
            />
            <BannerSlot
              class="foot-slot f3"
              :banner="slot('foot-3')"
              slot-key="foot-3"
              shape="rect"
              size="foot"
              @buy="openForm('banner', 'foot-3')"
              @view="openBannerView"
            />
          </div>
        </main>
      </div>
    </div>

    <aside class="edge-right" aria-label="Banners derecha">
      <BannerSlot :banner="slot('circle-a')" slot-key="circle-a" shape="rect" size="tall" @buy="openForm('banner', 'circle-a')" @view="openBannerView" />
      <BannerSlot :banner="slot('circle-b')" slot-key="circle-b" shape="rect" size="tall" @buy="openForm('banner', 'circle-b')" @view="openBannerView" />
      <BannerSlot :banner="slot('circle-c')" slot-key="circle-c" shape="rect" size="tall" @buy="openForm('banner', 'circle-c')" @view="openBannerView" />
      <BannerSlot :banner="slot('circle-d')" slot-key="circle-d" shape="rect" size="tall" @buy="openForm('banner', 'circle-d')" @view="openBannerView" />
    </aside>

    <SpamForm
      v-if="formOpen"
      :destination="formDestination"
      :prices="config.prices"
      :user="user"
      :banner-slot="bannerSlotTarget"
      :banner-slots="config.bannerSlots || []"
      @close="formOpen = false"
      @done="onFormDone"
      @wallet="openWallet"
    />

    <SpamViewer
      v-if="viewer.open && viewerSpam"
      :spam="viewerSpam"
      :index="viewer.index"
      :total="viewerList.length"
      :mode="viewer.mode"
      :label="viewer.label"
      @close="closeViewer"
      @prev="viewerStep(-1)"
      @next="viewerStep(1)"
    />

    <div v-if="authGateOpen" class="overlay" @click.self="authGateOpen = false">
      <div class="auth-gate" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
        <p class="eyebrow">Cuenta</p>
        <h3 id="auth-gate-title">Entra para publicar</h3>
        <p class="auth-copy">
          SPAMEAR es un muro para que personas reales den a conocer sus proyectos.
          Pedimos registro con Google para evitar cuentas automáticas que saturen
          el muro y arruinen el beneficio para todos.
        </p>
        <ul class="auth-points">
          <li>Publicas tú, no un robot</li>
          <li>El muro se mantiene útil para proyectos reales</li>
          <li>Si se llena de basura automática, la comunidad pierde</li>
        </ul>
        <div class="auth-actions">
          <div class="google-wrap">
            <button type="button" class="btn-google" tabindex="-1">
              <span class="g-mark" aria-hidden="true">G</span>
              Continuar con Google
            </button>
            <div id="google-btn-gate" class="gbtn-hit" aria-hidden="true" />
          </div>
        </div>
        <button type="button" class="btn-line ghost-close" @click="authGateOpen = false">
          Ahora no
        </button>
      </div>
    </div>

    <div v-if="walletOpen" class="overlay" @click.self="walletOpen = false">
      <div class="wallet-modal">
        <p class="eyebrow">Cuenta</p>
        <h3>Monedero</h3>
        <p v-if="user" class="wallet-balance">
          Saldo: <strong>{{ formatUsd(user.creditsCents) }}</strong>
        </p>

        <label class="wallet-amount">
          ¿Cuánto quieres cargar?
          <div class="price-smart">
            <span class="currency">$</span>
            <input
              :value="walletDisplay"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="0.00"
              aria-label="Monto a cargar"
              @keydown="onWalletKeydown"
              @beforeinput="onWalletBeforeInput"
              @paste.prevent="onWalletPaste"
            />
          </div>
          <small class="hint" :class="{ bad: walletBelowMin }">
            Mínimo {{ formatUsd(walletMinCents) }}
            (anuncio de pago más barato{{
              cheapestPaidAdCents < walletMinCents ? ' · mín. Stripe' : ''
            }}).
            Escribe dígitos: 50 → $0.50 · 100 → $1.00 · 500 → $5.00
          </small>
        </label>

        <div class="packs">
          <button
            v-for="p in config.prices.wallet"
            :key="p.id"
            type="button"
            class="pack"
            @click="setWalletDigits(String(p.amountCents))"
          >
            {{ formatUsd(p.amountCents) }}
          </button>
        </div>

        <button
          type="button"
          class="btn-red"
          style="width: 100%; margin-bottom: 0.55rem"
          :disabled="walletBelowMin || walletLoading"
          @click="buyWalletAmount"
        >
          {{ walletLoading ? 'Abriendo Stripe…' : `Pagar ${walletDisplayLabel}` }}
        </button>

        <p v-if="toast" class="toast">{{ toast }}</p>
        <button type="button" class="btn-line" @click="walletOpen = false">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import LogoMark from './components/LogoMark.vue'
import SpamCard from './components/SpamCard.vue'
import SpamForm from './components/SpamForm.vue'
import SpamViewer from './components/SpamViewer.vue'
import BannerSlot from './components/BannerSlot.vue'
import { api, formatUsd, getToken, setToken } from './api'

const WALL_PAGE_SIZE = 8

const config = ref({
  prices: { durations: [], pins: [], banners: [], wallet: [] },
  bannerSlots: [],
  googleClientId: '',
})
const user = ref(null)
const feed = reactive({ top10: [], banners: [], wall: [] })
const wallTotal = ref(0)
const wallPage = ref(0)
const wallLoading = ref(false)
const wallCache = reactive({})
const filters = reactive({ q: '', category: '', minPrice: null, maxPrice: null })
const categoryHints = ref([])
const formOpen = ref(false)
const formDestination = ref('live')
const bannerSlotTarget = ref('left-1')
const walletOpen = ref(false)
const walletDigits = ref('')
const walletLoading = ref(false)
const authGateOpen = ref(false)
const menuOpen = ref(false)
const filtersOpen = ref(false)
const toast = ref('')
const viewer = reactive({
  open: false,
  mode: 'kof',
  label: '',
  source: 'top10',
  index: 0,
})
let pollTimer
let googleReady = false

const userInitial = computed(() => (user.value?.name || '?').slice(0, 1).toUpperCase())

const wallItems = computed(() => wallCache[wallPage.value] || feed.wall || [])

const wallPageCount = computed(() =>
  Math.max(1, Math.ceil((wallTotal.value || 0) / WALL_PAGE_SIZE))
)

const canWallNext = computed(() => wallPage.value + 1 < wallPageCount.value)

const topFilled = computed(() =>
  (feed.top10 || []).filter((item) => item.spam).map((item) => item.spam)
)

const bannerFilled = computed(() =>
  (feed.banners || [])
    .filter((b) => b?.imageUrl)
    .map((b) => bannerAsSpam(b))
)

const viewerList = computed(() => {
  if (viewer.source === 'top10') return topFilled.value
  if (viewer.source === 'banner') return bannerFilled.value
  // muro: lista acumulada de páginas cargadas, en orden
  const pages = Object.keys(wallCache)
    .map(Number)
    .sort((a, b) => a - b)
  return pages.flatMap((p) => wallCache[p] || [])
})

const viewerSpam = computed(() => viewerList.value[viewer.index] || null)

function rankMedia(spam) {
  if (!spam?.imageUrl || !/^https?:\/\//i.test(spam.imageUrl)) return null
  return spam.imageUrl
}

function bannerAsSpam(b) {
  const links = Array.isArray(b.links) ? b.links.filter(Boolean) : []
  const linkUrl = b.linkUrl || links[0] || ''
  return {
    id: `banner:${b.slotKey}`,
    title: b.title || 'Anuncio',
    description: b.description || '',
    category: b.category || '',
    country: b.country || '',
    imageUrl: b.imageUrl,
    priceCents: b.priceCents ?? null,
    isFree: !!b.isFree,
    socials: b.socials || {},
    links: links.length ? links : linkUrl ? [linkUrl] : [],
    cardLayout: 'image',
    expiresAt: b.expiresAt,
    pinUntil: null,
    owner: b.owner || null,
    _slotKey: b.slotKey,
  }
}

function slot(key) {
  return feed.banners.find((b) => b.slotKey === key) || null
}

async function loadConfig() {
  config.value = await api('/config')
  const cats = await api('/categories?q=')
  categoryHints.value = cats.items
}

async function fetchWallPage(page, { keepTop = true } = {}) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.minPrice != null && filters.minPrice !== '') {
    params.set('minPrice', String(filters.minPrice))
  }
  if (filters.maxPrice != null && filters.maxPrice !== '') {
    params.set('maxPrice', String(filters.maxPrice))
  }
  params.set('wallLimit', String(WALL_PAGE_SIZE))
  params.set('wallOffset', String(page * WALL_PAGE_SIZE))

  const data = await api(`/feed?${params}`)
  if (keepTop) {
    feed.top10 = data.top10 || []
    feed.banners = data.banners || []
  }
  wallTotal.value = data.wallTotal || 0
  wallCache[page] = data.wall || []
  if (page === wallPage.value) feed.wall = wallCache[page]
  return data
}

async function loadFeed() {
  Object.keys(wallCache).forEach((k) => delete wallCache[k])
  wallPage.value = 0
  await fetchWallPage(0)
}

async function softRefresh() {
  const page = wallPage.value
  await fetchWallPage(page)
}

async function shiftWall(dir) {
  const next = wallPage.value + dir
  if (next < 0 || next >= wallPageCount.value || wallLoading.value) return
  wallLoading.value = true
  try {
    if (!wallCache[next]) {
      await fetchWallPage(next, { keepTop: false })
    }
    wallPage.value = next
    feed.wall = wallCache[next] || []
  } finally {
    wallLoading.value = false
  }
}

function openTopViewer(rank) {
  const filled = (feed.top10 || []).filter((t) => t.spam)
  const index = filled.findIndex((t) => t.rank === rank)
  if (index < 0) return
  viewer.open = true
  viewer.mode = 'kof'
  viewer.label = 'TOP 10'
  viewer.source = 'top10'
  viewer.index = index
}

function openWallViewer(id) {
  wallCache[wallPage.value] = wallItems.value
  const items = Object.keys(wallCache)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((p) => wallCache[p] || [])
  const index = items.findIndex((s) => s.id === id)
  if (index < 0) return
  viewer.open = true
  viewer.mode = 'soft'
  viewer.label = 'MURO'
  viewer.source = 'wall'
  viewer.index = index
}

function closeViewer() {
  viewer.open = false
}

async function viewerStep(dir) {
  const next = viewer.index + dir
  if (next < 0) return

  if (viewer.source === 'top10') {
    if (next >= topFilled.value.length) return
    viewer.index = next
    return
  }

  if (viewer.source === 'banner') {
    if (next >= bannerFilled.value.length) return
    viewer.index = next
    return
  }

  // muro: si nos salimos de lo cargado, pedir la siguiente página
  const loaded = Object.keys(wallCache)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((p) => wallCache[p] || [])
  if (next < loaded.length) {
    viewer.index = next
    return
  }
  if (!canWallNext.value || wallLoading.value) return
  wallLoading.value = true
  try {
    const page = wallPage.value + 1
    if (!wallCache[page]) await fetchWallPage(page, { keepTop: false })
    wallPage.value = page
    feed.wall = wallCache[page] || []
    const again = Object.keys(wallCache)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((p) => wallCache[p] || [])
    if (next < again.length) viewer.index = next
  } finally {
    wallLoading.value = false
  }
}

async function loadMe() {
  if (!getToken()) return
  try {
    const data = await api('/me')
    user.value = data.user
  } catch {
    setToken('')
    user.value = null
  }
}

function renderGoogleButtons() {
  if (!window.google?.accounts?.id) return
  const el = document.getElementById('google-btn-gate')
  if (!el) return
  el.innerHTML = ''
  const width = Math.max(el.parentElement?.clientWidth || 280, 240)
  window.google.accounts.id.renderButton(el, {
    theme: 'filled_black',
    size: 'large',
    shape: 'rectangular',
    text: 'continue_with',
    logo_alignment: 'left',
    width,
  })
}

function initGoogle() {
  const clientId = config.value.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId || !window.google?.accounts?.id) return
  if (!googleReady) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        const data = await api('/auth/google', {
          method: 'POST',
          body: { idToken: response.credential },
        })
        setToken(data.token)
        user.value = data.user
        authGateOpen.value = false
        toast.value = 'Sesión iniciada'
      },
    })
    googleReady = true
  }
  renderGoogleButtons()
}

function logout() {
  setToken('')
  user.value = null
}

function askLogin() {
  authGateOpen.value = true
  nextTick(() => initGoogle())
}

function openForm(destination, bannerSlot = 'left-1') {
  if (!user.value) {
    askLogin()
    return
  }
  formDestination.value = destination
  bannerSlotTarget.value = bannerSlot
  formOpen.value = true
}

function openBannerView(banner) {
  if (!banner?.imageUrl) return
  const list = bannerFilled.value
  const index = list.findIndex((s) => s._slotKey === banner.slotKey)
  if (index < 0) return
  viewer.open = true
  viewer.mode = 'kof'
  viewer.label = 'BANNER'
  viewer.source = 'banner'
  viewer.index = index
}

function onFormDone(data) {
  if (data.user) user.value = data.user
  formOpen.value = false
  toast.value = 'Publicado'
  loadFeed()
}

const walletMinCents = computed(
  () => Number(config.value.prices?.walletMinCents) || 50
)
const cheapestPaidAdCents = computed(
  () => Number(config.value.prices?.cheapestPaidAdCents) || walletMinCents.value
)
const walletCents = computed(() => {
  if (!walletDigits.value) return 0
  return Number(walletDigits.value)
})
const walletBelowMin = computed(
  () => !walletDigits.value || walletCents.value < walletMinCents.value
)
const walletDisplay = computed(() => {
  const cents = Number(walletDigits.value || '0')
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
})
const walletDisplayLabel = computed(() =>
  walletBelowMin.value ? formatUsd(walletMinCents.value) : formatUsd(walletCents.value)
)

function setWalletDigits(next) {
  const clean = String(next || '').replace(/\D/g, '')
  if (!clean) {
    walletDigits.value = ''
    return
  }
  const asNum = Number(clean)
  if (asNum > 50000) {
    walletDigits.value = '50000'
    return
  }
  walletDigits.value = String(asNum)
}

function onWalletKeydown(e) {
  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    setWalletDigits(walletDigits.value + e.key)
    return
  }
  if (e.key === 'Backspace') {
    e.preventDefault()
    setWalletDigits(walletDigits.value.slice(0, -1))
    return
  }
  if (e.key === 'Delete') {
    e.preventDefault()
    walletDigits.value = ''
    return
  }
  if (['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  e.preventDefault()
}

function onWalletBeforeInput(e) {
  if (e.inputType === 'insertText' && e.data && /^\d+$/.test(e.data)) {
    e.preventDefault()
    setWalletDigits(walletDigits.value + e.data)
  }
  if (e.inputType === 'deleteContentBackward') {
    e.preventDefault()
    setWalletDigits(walletDigits.value.slice(0, -1))
  }
}

function onWalletPaste(e) {
  const text = e.clipboardData?.getData('text') || ''
  setWalletDigits(text.replace(/\D/g, ''))
}

function openWallet() {
  if (!user.value) {
    askLogin()
    return
  }
  if (!walletDigits.value) setWalletDigits(String(walletMinCents.value))
  walletOpen.value = true
}

async function buyWalletAmount() {
  if (walletBelowMin.value) {
    toast.value = `Mínimo ${formatUsd(walletMinCents.value)}`
    return
  }
  walletLoading.value = true
  toast.value = ''
  try {
    const data = await api('/wallet/checkout', {
      method: 'POST',
      body: { amountCents: walletCents.value },
    })
    if (data.url) {
      window.location.href = data.url
      return
    }
    if (data.user) user.value = data.user
    toast.value = data.message || 'Crédito añadido'
  } catch (e) {
    toast.value = e.message
  } finally {
    walletLoading.value = false
  }
}

async function buyUnlimited() {
  if (!user.value) return openWallet()
  try {
    const data = await api('/shop/unlimited', { method: 'POST', body: {} })
    if (data.url) {
      window.location.href = data.url
      return
    }
    if (data.user) user.value = data.user
    toast.value = 'VIP activado'
  } catch (e) {
    toast.value = e.message
  }
}

async function buyVerified() {
  if (!user.value) return openWallet()
  try {
    const data = await api('/shop/verified', { method: 'POST', body: {} })
    if (data.url) {
      window.location.href = data.url
      return
    }
    if (data.user) user.value = data.user
    toast.value = 'Verificado activado'
  } catch (e) {
    toast.value = e.message
  }
}

async function confirmStripeReturn() {
  const params = new URLSearchParams(window.location.search)
  const sessionId = params.get('session_id')
  const wallet = params.get('wallet')
  const shop = params.get('shop')
  if (!sessionId || (!wallet && !shop)) return
  if (!getToken()) return
  try {
    const data = await api('/stripe/confirm', {
      method: 'POST',
      body: { sessionId },
    })
    if (data.user) user.value = data.user
    toast.value =
      shop === 'verified'
        ? 'Verificado activado'
        : shop === 'unlimited'
          ? 'VIP activado'
          : 'Pago recibido · crédito actualizado'
    walletOpen.value = true
  } catch (e) {
    toast.value = e.message
    walletOpen.value = true
  }
  window.history.replaceState({}, '', window.location.pathname)
}

function onDocClick(e) {
  if (!menuOpen.value) return
  if (e.target?.closest?.('.auth')) return
  menuOpen.value = false
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  await loadConfig()
  await loadMe()
  await confirmStripeReturn()
  await loadFeed()
  setTimeout(initGoogle, 400)
  pollTimer = setInterval(softRefresh, 20000)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  clearInterval(pollTimer)
})
</script>

<style scoped>
.page {
  width: 100%;
  max-width: 1480px;
  height: 100%;
  max-height: 100dvh;
  margin: 0 auto;
  padding: 0.45rem 0.6rem;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: var(--banner-edge-w) minmax(0, 1fr) var(--banner-edge-w);
  gap: 0.7rem;
  overflow: hidden;
}

.center {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: var(--top10-w) minmax(0, 1fr);
  gap: 0.7rem;
  overflow: hidden;
}

.main-col {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.35rem;
  overflow: hidden;
}

.nav-block {
  display: grid;
  gap: 0.35rem;
  flex-shrink: 0;
}

.edge-left,
.edge-right {
  display: grid;
  min-height: 0;
  height: 100%;
  align-content: stretch;
  justify-items: center;
  grid-auto-rows: minmax(0, 1fr);
  gap: var(--banner-edge-gap);
  width: 100%;
  margin-top: 0;
  align-self: stretch;
}

.edge-left :deep(.banner),
.edge-right :deep(.banner) {
  width: 100%;
  height: 100%;
  min-height: 0;
  max-width: 100%;
}

.edge-left :deep(.filled-wrap),
.edge-left :deep(.filled),
.edge-left :deep(.empty),
.edge-right :deep(.filled-wrap),
.edge-right :deep(.filled),
.edge-right :deep(.empty) {
  width: 100%;
  height: 100%;
  min-height: 0;
  aspect-ratio: auto;
}

.top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.55rem;
  align-items: center;
  z-index: 30;
  padding: 0.15rem 0 0.25rem;
  background: transparent;
  min-height: 0;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-ad {
  width: var(--banner-mini-w);
}

.search input {
  width: 100%;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.55rem;
  padding: 0.48rem 0.85rem;
  background: var(--surface);
  outline: none;
}

.search input:focus {
  border-color: rgba(227, 93, 90, 0.45);
  box-shadow: 0 0 0 3px var(--red-soft);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.btn-line,
.btn-red {
  border: 1.5px solid var(--line-strong);
  border-radius: 0.45rem;
  padding: 0.52rem 0.8rem;
  font-family: var(--display);
  font-weight: 750;
  font-size: 0.92rem;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.btn-line {
  background: var(--surface);
  color: var(--ink);
}

.btn-line.on,
.btn-line:hover {
  background: var(--surface-2);
}

.btn-red {
  background: var(--red-deep);
  color: #f5ecea;
  border-color: transparent;
}

.btn-red.sm,
.btn-line.sm {
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
}

.auth {
  position: relative;
}

.member {
  display: grid;
  place-items: center;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.45rem;
  background: var(--surface);
  padding: 0.15rem;
}

.member img,
.avatar-fallback {
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: 0.3rem;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--red-deep);
  color: #f5ecea;
  font-family: var(--display);
  font-weight: 800;
}

.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  min-width: 170px;
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 0.55rem;
  box-shadow: var(--shadow);
  display: grid;
  z-index: 40;
  overflow: hidden;
}

.menu-meta {
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid var(--line);
}

.menu-meta strong {
  display: block;
  font-size: 0.88rem;
}

.menu-meta small {
  color: var(--muted);
}

.menu button {
  text-align: left;
  padding: 0.65rem 0.8rem;
  font-weight: 600;
  border-bottom: 1px solid var(--line);
}

.menu button:last-child {
  border-bottom: none;
}

.menu button:hover {
  background: var(--red-soft);
}

.menu .danger {
  color: var(--red);
}

.filters {
  display: grid;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
  padding: 0.65rem;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.55rem;
  background: var(--surface);
}

@media (min-width: 720px) {
  .filters {
    grid-template-columns: 1.2fr 0.6fr 0.6fr auto;
  }
}

.filters input {
  border: 1.5px solid var(--line-strong);
  border-radius: 0.4rem;
  padding: 0.5rem 0.65rem;
  background: var(--bg-2);
}

.top10 {
  border: 1.5px solid var(--line-strong);
  border-radius: 0.75rem;
  background: var(--surface);
  padding: 0.45rem 0.5rem;
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  width: 100%;
  max-width: none;
  display: flex;
  flex-direction: column;
  animation: rise 0.35s ease both;
}

.top10.alive {
  animation: top10Pulse 5.5s ease-in-out infinite;
}

@keyframes top10Pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(227, 93, 90, 0);
    border-color: var(--line-strong);
    transform: translateY(0);
  }
  50% {
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.32);
    border-color: rgba(227, 93, 90, 0.45);
    transform: translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .top10.alive {
    animation: none;
  }
}

.panel-head,
.wall-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--line-strong);
  flex-shrink: 0;
}

.wall-actions {
  display: flex;
  gap: 0.35rem;
}

.eyebrow {
  margin: 0;
  font-family: var(--display);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--red);
}

.panel-head h1,
.wall-bar h2 {
  margin: 0.05rem 0 0;
  font-family: var(--display);
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
}

.panel-head {
  margin-bottom: 0.4rem;
  padding-bottom: 0.3rem;
  flex-shrink: 0;
}

.panel-head h1 {
  font-size: 1.15rem;
}

.wall-bar h2 {
  font-size: 1.2rem;
}

.rank {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.18rem;
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.rank li {
  display: grid;
  grid-template-columns: 1rem 1fr auto;
  gap: 0.3rem;
  align-items: center;
  padding: 0.35rem 0.3rem;
  border-bottom: 1px solid var(--line);
  position: relative;
  overflow: hidden;
  min-height: 2.4rem;
  border-radius: 0.4rem;
}

.rank-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.rank li.cover::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    90deg,
    rgba(12, 12, 12, 0.82) 0%,
    rgba(12, 12, 12, 0.55) 55%,
    rgba(12, 12, 12, 0.35) 100%
  );
}

.rank li.cover > *:not(.rank-cover) {
  position: relative;
  z-index: 2;
}

.rank li.cover .rank-body strong,
.rank li.cover .n,
.rank li.cover .ver-btn {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.rank li:last-child {
  border-bottom: none;
}

.rank li.podium .n {
  color: var(--red);
}

.rank li.open {
  border: 1.5px dashed rgba(255, 255, 255, 0.28);
  border-radius: 0.45rem;
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 5px,
      rgba(255, 255, 255, 0.03) 5px,
      rgba(255, 255, 255, 0.03) 10px
    ),
    var(--surface-2);
  cursor: pointer;
  padding: 0.35rem 0.3rem;
  border-bottom: 1.5px dashed rgba(255, 255, 255, 0.28);
}

.rank li.open:hover {
  border-color: rgba(227, 93, 90, 0.55);
  background:
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 5px,
      rgba(227, 93, 90, 0.08) 5px,
      rgba(227, 93, 90, 0.08) 10px
    ),
    var(--red-soft);
}

.rank .n {
  font-family: var(--display);
  font-weight: 800;
  font-size: 0.9rem;
}

.rank-body {
  min-width: 0;
}

.rank-body strong {
  display: block;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-body p {
  margin: 0.02rem 0 0;
  font-size: 0.62rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-claim {
  grid-column: 2 / -1;
  text-align: left;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.1rem 0;
}

.rank li.open:hover .rank-claim {
  color: var(--black);
}

.ver-btn {
  font-family: var(--display);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.18rem 0.45rem;
  border-radius: 0.35rem;
  border: 1px solid var(--line-strong);
  background: rgba(30, 30, 30, 0.85);
  color: var(--ink);
}

.ver-btn:hover {
  border-color: rgba(227, 93, 90, 0.5);
  color: var(--black);
}

.wall {
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.wall-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr) var(--banner-foot-h);
  grid-template-areas:
    'core core core core'
    'f1 f2 f3 f4';
  gap: 0.45rem;
}

.wall-core {
  grid-area: core;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.foot-slot {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.foot-slot.f1 { grid-area: f1; }
.foot-slot.f2 { grid-area: f2; }
.foot-slot.f3 { grid-area: f3; }
.foot-slot.f4 { grid-area: f4; }

.wall-layout :deep(.banner),
.wall-layout :deep(.filled-wrap),
.wall-layout :deep(.filled),
.wall-layout :deep(.empty) {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.wall-layout :deep(.rect.foot .filled-wrap),
.wall-layout :deep(.rect.foot .filled),
.wall-layout :deep(.rect.foot .empty) {
  height: 100%;
  min-height: 0;
  aspect-ratio: auto;
}

.wall-stage {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.4rem;
  align-items: stretch;
  min-height: 0;
  flex: 1;
}

.wall-nav {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  border: 1.5px solid var(--line-strong);
  background: var(--surface);
  color: var(--black);
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
}

.wall-nav:hover:not(:disabled) {
  border-color: rgba(227, 93, 90, 0.5);
  background: var(--red-soft);
}

.wall-nav:disabled {
  opacity: 0.3;
  cursor: default;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--card-w));
  gap: 0.55rem 0.65rem;
  align-content: start;
  justify-content: start;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.tiles > * {
  width: var(--card-w);
  height: var(--card-h);
  max-width: var(--card-w);
  max-height: var(--card-h);
  min-width: 0;
}

.tiles :deep(.tile) {
  width: var(--card-w);
  height: var(--card-h);
  max-width: var(--card-w);
  max-height: var(--card-h);
}

.wall-page {
  margin: 0.25rem 0 0;
  text-align: center;
  color: var(--muted);
  font-family: var(--display);
  font-weight: 700;
  letter-spacing: 0.06em;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.empty-zone {
  margin: 0;
  padding: 1rem 0.2rem;
  color: var(--muted);
  border: 1px dashed var(--line-strong);
  border-radius: 0.75rem;
  text-align: center;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  z-index: 60;
  padding: 1rem;
}

.wallet-modal {
  width: min(390px, 100%);
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 0.7rem;
  box-shadow: var(--shadow);
  padding: 1.1rem;
  position: relative;
  display: grid;
  gap: 0.65rem;
}

.wallet-modal h3,
.auth-gate h3 {
  margin: 0.1rem 0 0.15rem;
  font-family: var(--display);
  font-size: 1.7rem;
  font-weight: 800;
}

.wallet-balance {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.wallet-balance strong {
  color: var(--black);
}

.wallet-amount {
  display: grid;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.wallet-modal .price-smart {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.4rem;
  padding: 0 0.7rem;
  background: var(--bg-2);
}

.wallet-modal .price-smart .currency {
  font-family: var(--display);
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--red);
}

.wallet-modal .price-smart input {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0.65rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  width: 100%;
  text-transform: none;
  letter-spacing: 0.02em;
  color: var(--black);
}

.wallet-modal .hint {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--muted);
  line-height: 1.35;
}

.wallet-modal .hint.bad {
  color: var(--red);
}

.wallet-modal .btn-red:disabled {
  opacity: 0.45;
  cursor: default;
}

.auth-gate {
  width: min(420px, 100%);
  background: var(--surface);
  border: 1.5px solid var(--line-strong);
  border-radius: 0.7rem;
  box-shadow: var(--shadow);
  padding: 1.2rem;
}

.auth-copy {
  margin: 0 0 0.85rem;
  color: var(--ink);
  font-size: 0.92rem;
  line-height: 1.45;
}

.auth-points {
  margin: 0 0 1rem;
  padding-left: 1.1rem;
  color: var(--muted);
  font-size: 0.86rem;
  line-height: 1.5;
}

.auth-points li {
  margin-bottom: 0.25rem;
}

.auth-actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-bottom: 0.85rem;
}

.google-wrap {
  position: relative;
  width: 100%;
  border-radius: 0.45rem;
  overflow: hidden;
}

.btn-google {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 1.5px solid var(--line-strong);
  border-radius: 0.45rem;
  padding: 0.72rem 1rem;
  background: var(--surface-2);
  color: var(--black);
  font-family: var(--display);
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  pointer-events: none;
}

.google-wrap:hover .btn-google {
  border-color: rgba(227, 93, 90, 0.5);
  background: var(--red-soft);
}

.g-mark {
  display: grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 0.3rem;
  background: #fff;
  color: #ea4335;
  font-family: Arial, sans-serif;
  font-weight: 800;
  font-size: 0.85rem;
  line-height: 1;
}

.gbtn-hit {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0.02;
  overflow: hidden;
  cursor: pointer;
}

.gbtn-hit :deep(div),
.gbtn-hit :deep(iframe) {
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
}

.ghost-close {
  width: 100%;
}

.packs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
}

.pack {
  border: 1.5px solid var(--line-strong);
  border-radius: 0.45rem;
  padding: 0.75rem;
  font-family: var(--display);
  font-weight: 800;
  background: var(--bg-2);
}

.pack:hover {
  background: var(--red-soft);
}

.toast {
  color: var(--red);
  font-weight: 700;
}

@media (max-width: 979px) {
  /* Dos pantallas: 1) nav+top10+laterales  2) muro+banners pie */
  .page {
    height: 200dvh;
    max-height: 200dvh;
    overflow: visible;
    padding: 0.45rem 0.55rem;
    box-sizing: border-box;
    grid-template-columns: 64px minmax(0, 1fr) 72px;
    grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'nav nav nav'
      'left top10 right'
      'wall wall wall';
    gap: 0.4rem;
  }

  .center,
  .main-col {
    display: contents;
  }

  .nav-block {
    grid-area: nav;
    scroll-snap-align: start;
  }

  .edge-left {
    grid-area: left;
    height: 100%;
    min-height: 0;
    max-height: 100%;
    margin: 0;
    overflow: hidden;
  }

  .top10 {
    grid-area: top10;
    height: 100%;
    min-height: 0;
    max-height: 100%;
    overflow: auto;
  }

  .edge-right {
    grid-area: right;
    height: 100%;
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
  }

  .wall {
    grid-area: wall;
    height: 100%;
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    padding: 0.25rem 0 0.35rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .wall-bar {
    flex-shrink: 0;
    margin-bottom: 0;
  }

  .wall-layout {
    flex: 1;
    min-height: 0;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: minmax(0, 1fr) 72px 72px;
    grid-template-areas:
      'core core'
      'f1 f2'
      'f3 f4';
    gap: 0.35rem;
  }

  .wall-core {
    min-height: 0;
    overflow: hidden;
  }

  .wall-stage {
    min-height: 0;
    height: 100%;
  }

  .foot-slot.f1,
  .foot-slot.f2,
  .foot-slot.f3,
  .foot-slot.f4 {
    height: 100%;
    min-height: 0;
  }

  .top {
    grid-template-columns: 1fr auto;
  }

  .search {
    grid-column: 1 / -1;
    order: 3;
  }

  .tiles {
    overflow: auto;
    height: 100%;
    min-height: 0;
    align-content: start;
  }
}

@media (max-width: 520px) {
  .page {
    grid-template-columns: 56px minmax(0, 1fr) 62px;
  }

  .wall-layout {
    grid-template-rows: minmax(0, 1fr) 64px 64px;
  }
}

</style>
