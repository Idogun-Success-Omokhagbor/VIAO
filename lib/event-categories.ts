export const EVENT_CATEGORY_COLORS: Record<string, string> = {
  Technology: "bg-blue-500",
  "Arts & Culture": "bg-purple-500",
  "Sports & Outdoors": "bg-emerald-500",
  Music: "bg-pink-500",
  "Food & Drink": "bg-amber-500",
  "Health & Wellness": "bg-teal-500",
  Business: "bg-indigo-500",
  Education: "bg-sky-500",
}

export const EVENT_CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "All Categories", color: "bg-gray-400" },
  { value: "Technology", label: "Technology", color: EVENT_CATEGORY_COLORS["Technology"] },
  { value: "Arts & Culture", label: "Arts & Culture", color: EVENT_CATEGORY_COLORS["Arts & Culture"] },
  { value: "Sports & Outdoors", label: "Sports & Outdoors", color: EVENT_CATEGORY_COLORS["Sports & Outdoors"] },
  { value: "Music", label: "Music", color: EVENT_CATEGORY_COLORS["Music"] },
  { value: "Food & Drink", label: "Food & Drink", color: EVENT_CATEGORY_COLORS["Food & Drink"] },
  { value: "Health & Wellness", label: "Health & Wellness", color: EVENT_CATEGORY_COLORS["Health & Wellness"] },
  { value: "Business", label: "Business", color: EVENT_CATEGORY_COLORS["Business"] },
  { value: "Education", label: "Education", color: EVENT_CATEGORY_COLORS["Education"] },
] as const

export const EVENT_FORM_CATEGORY_OPTIONS = [
  { id: "Technology", label: "Technology", color: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
  { id: "Arts & Culture", label: "Arts & Culture", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
  { id: "Sports & Outdoors", label: "Sports & Outdoors", color: "bg-green-100 text-green-800 hover:bg-green-200" },
  { id: "Music", label: "Music", color: "bg-pink-100 text-pink-800 hover:bg-pink-200" },
  { id: "Food & Drink", label: "Food & Drink", color: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
  { id: "Health & Wellness", label: "Health & Wellness", color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" },
  { id: "Business", label: "Business", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { id: "Education", label: "Education", color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" },
] as const

export function getEventCategoryColor(category?: string | null): string {
  if (!category) return "bg-gray-400"
  return EVENT_CATEGORY_COLORS[category] || "bg-gray-400"
}
