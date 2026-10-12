import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true, sparse: true },
    email: { type: String, required: true, unique: true },
    name: String,
    avatar: String,
    creditsCents: { type: Number, default: 0 },
    vipUntil: { type: Date, default: null },
    verifiedUntil: { type: Date, default: null },
    verifiedMerit: { type: Boolean, default: false },
    spamCount: { type: Number, default: 0 },
    activeDays: [{ type: String }],
    stripeCustomerId: String,
    stripeCustomerIdTest: String,
  },
  { timestamps: true }
)

userSchema.methods.isVip = function isVip() {
  return this.vipUntil && this.vipUntil > new Date()
}

userSchema.methods.isVerified = function isVerified() {
  if (this.verifiedMerit) return true
  return this.verifiedUntil && this.verifiedUntil > new Date()
}

userSchema.methods.touchActiveDay = function touchActiveDay() {
  const day = new Date().toISOString().slice(0, 10)
  if (!this.activeDays.includes(day)) {
    this.activeDays.push(day)
    if (this.activeDays.length > 400) {
      this.activeDays = this.activeDays.slice(-400)
    }
  }
}

userSchema.methods.checkMeritVerified = function checkMeritVerified() {
  if (this.spamCount < 1000) return false
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const recent = this.activeDays.filter((d) => new Date(d) >= cutoff)
  if (recent.length >= 90) {
    this.verifiedMerit = true
    return true
  }
  return false
}

const spamSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true, maxlength: 80 },
    description: { type: String, required: true, maxlength: 2000 },
    links: [{ type: String, maxlength: 500 }],
    country: { type: String, maxlength: 80 },
    socials: {
      instagram: String,
      twitter: String,
      tiktok: String,
      youtube: String,
      web: String,
    },
    imageUrl: { type: String, maxlength: 1000 },
    category: { type: String, required: true, index: true },
    priceCents: { type: Number, default: null },
    isFree: { type: Boolean, default: false },
    cardLayout: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },
    zone: {
      type: String,
      enum: ['live', 'featured', 'top10'],
      default: 'live',
      index: true,
    },
    expiresAt: { type: Date, required: true },
    pinUntil: { type: Date, default: null },
    bidCents: { type: Number, default: 0 },
  },
  { timestamps: true }
)

spamSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
spamSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  country: 'text',
})

const topSlotSchema = new mongoose.Schema(
  {
    rank: { type: Number, required: true, unique: true, min: 1, max: 10 },
    spamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Spam' },
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bidCents: { type: Number, default: 0 },
    since: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

const bannerSlotSchema = new mongoose.Schema(
  {
    slotKey: { type: String, required: true, unique: true },
    imageUrl: String,
    linkUrl: String,
    title: String,
    description: String,
    category: String,
    country: String,
    priceCents: { type: Number, default: null },
    isFree: { type: Boolean, default: false },
    socials: {
      instagram: String,
      twitter: String,
      tiktok: String,
      youtube: String,
      web: String,
    },
    links: [String],
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
)

const ledgerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      enum: [
        'wallet_topup',
        'duration',
        'pin',
        'top10_bid',
        'banner',
        'verified',
        'unlimited',
        'refund',
      ],
    },
    amountCents: Number,
    balanceAfter: Number,
    meta: mongoose.Schema.Types.Mixed,
    stripeSessionId: String,
  },
  { timestamps: true }
)

const rateBucketSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now },
})

function model(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema)
}

export const User = () => model('User', userSchema)
export const Spam = () => model('Spam', spamSchema)
export const TopSlot = () => model('TopSlot', topSlotSchema)
export const BannerSlot = () => model('BannerSlot', bannerSlotSchema)
export const Ledger = () => model('Ledger', ledgerSchema)
export const RateBucket = () => model('RateBucket', rateBucketSchema)
