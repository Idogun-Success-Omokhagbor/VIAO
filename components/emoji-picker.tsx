"use client"

import { useState } from "react"
import { Smile } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LazyEmojiMartPicker } from "@/components/lazy-emoji-mart-picker"

export function EmojiPicker({ disabled, onSelect }: { disabled?: boolean; onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled}>
          <Smile className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[352px] p-0">
        <LazyEmojiMartPicker
          onEmojiSelect={(emoji) => {
            const value = emoji.native
            if (typeof value === "string" && value.length > 0) {
              onSelect(value)
            }
            setOpen(false)
          }}
          theme="light"
          previewPosition="none"
          skinTonePosition="search"
          searchPosition="sticky"
        />
      </PopoverContent>
    </Popover>
  )
}

export default EmojiPicker
