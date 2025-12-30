"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Bold, Italic, Underline, List, Smile, Upload, File as FileIcon, Video } from "lucide-react"
import { useCommunity } from "@/context/community-context"
import Picker from "@emoji-mart/react"
import data from "@emoji-mart/data"

interface CommunityPostFormProps {
  onClose: () => void
}

export default function CommunityPostForm({ onClose }: CommunityPostFormProps) {
  const { createPost } = useCommunity()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [mediaPreview, setMediaPreview] = useState<string>("")
  const [mediaData, setMediaData] = useState<string>("")
  const [mediaType, setMediaType] = useState<string>("")
  const [mediaName, setMediaName] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showTitleEmojiPicker, setShowTitleEmojiPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const applyFormatting = (wrap: string, wrapEnd: string = wrap) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const before = content.slice(0, start)
    const selected = content.slice(start, end)
    const after = content.slice(end)
    const newValue = `${before}${wrap}${selected || "text"}${wrapEnd}${after}`
    setContent(newValue)
    const cursor = (before + wrap + (selected || "text") + wrapEnd).length
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const applyTitleFormatting = (wrap: string, wrapEnd: string = wrap) => {
    const input = titleRef.current
    if (!input) return
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const before = title.slice(0, start)
    const selected = title.slice(start, end)
    const after = title.slice(end)
    const newValue = `${before}${wrap}${selected || "Title"}${wrapEnd}${after}`
    setTitle(newValue)
    const cursor = (before + wrap + (selected || "Title") + wrapEnd).length
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(cursor, cursor)
    })
  }

  const handleEmojiSelect = (emoji: any) => {
    setContent((prev) => `${prev}${emoji.native}`)
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  const handleTitleEmojiSelect = (emoji: any) => {
    setTitle((prev) => `${prev}${emoji.native}`)
    setShowTitleEmojiPicker(false)
    titleRef.current?.focus()
  }

  const handleMediaUpload = async (file: File) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) return
    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result?.toString() || ""
        setMediaPreview(result)
        setMediaData(result)
        setMediaType(file.type)
        setMediaName(file.name || "attachment")
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setIsSubmitting(true)
    try {
      await createPost({
        title: title.trim(),
        content: content.trim(),
        imageUrl: mediaData || undefined,
        mediaType: mediaType || undefined,
      })
      onClose()
    } catch (error) {
      console.error("Failed to create post:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Create New Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              ref={titleRef}
              placeholder="What's on your mind?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="pr-24"
              required
            />
            <div className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1 text-sm text-gray-600">
              <span className="text-xs text-gray-500">Format</span>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => applyTitleFormatting("**", "**")}>
                <Bold className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => applyTitleFormatting("*", "*")}>
                <Italic className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => applyTitleFormatting("<u>", "</u>")}>
                <Underline className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setShowTitleEmojiPicker((prev) => !prev)}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                {showTitleEmojiPicker && (
                  <div className="absolute z-10 mt-2">
                    <Picker data={data} onEmojiSelect={handleTitleEmojiSelect} theme="light" />
                  </div>
                )}
              </div>
              <span className="ml-auto text-xs text-gray-400">Keep it concise</span>
            </div>
          </div>

          {/* Composer */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              <Button type="button" variant="ghost" size="icon" onClick={() => applyFormatting("**", "**")}>
                <Bold className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => applyFormatting("*", "*")}>
                <Italic className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => applyFormatting("<u>", "</u>")}>
                <Underline className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setContent((prev) => `${prev}\n• `)}>
                <List className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmojiPicker((prev) => !prev)}>
                  <Smile className="h-4 w-4" />
                </Button>
                {showEmojiPicker && (
                  <div className="absolute z-10 mt-2">
                    <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
                  </div>
                )}
              </div>
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Add media"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleMediaUpload(file)
                }}
              />
            </div>

            <Textarea
              id="content"
              ref={textareaRef}
              placeholder="Share your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[160px] resize-none"
              required
            />

            {mediaPreview && (
              <div className="relative">
                {mediaType?.startsWith("video") ? (
                  <video
                    src={mediaPreview}
                    className="w-full h-48 object-cover rounded-lg"
                    muted
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause()
                      e.currentTarget.currentTime = 0
                    }}
                    controls
                  />
                ) : mediaType?.startsWith("image") ? (
                  <img
                    src={mediaPreview}
                    alt="Attachment preview"
                  className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex items-center justify-between bg-gray-100 border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{mediaName || "Attachment"}</p>
                        <p className="text-xs text-gray-500">{mediaType || "file"}</p>
                      </div>
                    </div>
                    <a
                      href={mediaPreview}
                      download={mediaName || "attachment"}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      Download
                    </a>
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-3 right-3 bg-white/80 hover:bg-white"
                  onClick={() => {
                    setMediaPreview("")
                    setMediaData("")
                    setMediaType("")
                    setMediaName("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                "Create Post"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
