export const USER_INTEREST_OPTIONS = [
  "Technology",
  "Art & Culture",
  "Music",
  "Sports",
  "Food & Drink",
  "Business",
  "Health & Wellness",
  "Education",
  "Travel",
  "Photography",
] as const

export type UserInterestOption = (typeof USER_INTEREST_OPTIONS)[number]
