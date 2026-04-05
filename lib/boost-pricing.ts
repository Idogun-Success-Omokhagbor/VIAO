export type BoostLevel = 1 | 2

type BoostPlan = {
  level: BoostLevel
  name: string
  amountChf: number
  amountMinor: number
  durationHours: number
  durationLabel: string
  features: string[]
}

const BOOST_PLANS: Record<BoostLevel, BoostPlan> = {
  1: {
    level: 1,
    name: "Basic Boost",
    amountChf: 10,
    amountMinor: 1000,
    durationHours: 24,
    durationLabel: "24 hours",
    features: ["Top placement", "Boost badge", "Increased visibility"],
  },
  2: {
    level: 2,
    name: "Premium Boost",
    amountChf: 30,
    amountMinor: 3000,
    durationHours: 72,
    durationLabel: "72 hours",
    features: ["All Basic features", "Crown badge", "Trending section", "Priority searches", "Social media promotion"],
  },
}

export const BOOST_PLANS_LIST = [BOOST_PLANS[1], BOOST_PLANS[2]] as const

export function getBoostPlan(level?: number | null): BoostPlan {
  return level === 2 ? BOOST_PLANS[2] : BOOST_PLANS[1]
}
