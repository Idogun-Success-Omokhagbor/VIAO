"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Smile } from "lucide-react"
import data from "@emoji-mart/data"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const Picker = dynamic(() => import("@emoji-mart/react").then((m: any) => m.default), { ssr: false }) as any

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
        <Picker
          data={data}
          onEmojiSelect={(e: any) => {
            const value = e?.native
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
