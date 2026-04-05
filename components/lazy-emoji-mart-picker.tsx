"use client"

import { useEffect, useState, type ComponentType } from "react"

export type EmojiSelection = {
  native?: string
}

export interface LazyEmojiMartPickerProps {
  onEmojiSelect: (emoji: EmojiSelection) => void
  theme?: "light" | "dark" | "auto"
  previewPosition?: "none"
  skinTonePosition?: "search" | "preview" | "none"
  searchPosition?: "sticky" | "static" | "none"
}

type EmojiMartPickerComponent = ComponentType<
  LazyEmojiMartPickerProps & {
    data: unknown
  }
>

export function LazyEmojiMartPicker({
  onEmojiSelect,
  theme = "light",
  previewPosition = "none",
  skinTonePosition = "search",
  searchPosition = "sticky",
}: LazyEmojiMartPickerProps) {
  const [Picker, setPicker] = useState<EmojiMartPickerComponent | null>(null)
  const [emojiData, setEmojiData] = useState<unknown>(null)

  useEffect(() => {
    let active = true

    void Promise.all([import("@emoji-mart/react"), import("@emoji-mart/data")])
      .then(([pickerModule, dataModule]) => {
        if (!active) return
        setPicker(() => pickerModule.default as EmojiMartPickerComponent)
        setEmojiData(dataModule.default)
      })
      .catch(() => {
        if (!active) return
        setPicker(null)
        setEmojiData(null)
      })

    return () => {
      active = false
    }
  }, [])

  if (!Picker || !emojiData) {
    return (
      <div className="flex h-[435px] w-full items-center justify-center bg-white text-sm text-gray-500">
        Loading emojis...
      </div>
    )
  }

  return (
    <Picker
      data={emojiData}
      onEmojiSelect={onEmojiSelect}
      previewPosition={previewPosition}
      searchPosition={searchPosition}
      skinTonePosition={skinTonePosition}
      theme={theme}
    />
  )
}

export default LazyEmojiMartPicker
