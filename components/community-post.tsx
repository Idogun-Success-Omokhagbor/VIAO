"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Heart, MessageCircle, MoreHorizontal, Send, Trash2, Edit, MessageSquare, Bold, Italic, Underline, List, Smile, Upload, File as FileIcon, Download, X } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useCommunity, type Post } from "@/context/community-context"
import { formatTimeAgo, getAvatarSrc } from "@/lib/utils"
import { useMessaging } from "@/context/messaging-context"
import { useRouter } from "next/navigation"
import MessagingModal from "@/components/messaging-modal"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "sonner"
import Picker from "@emoji-mart/react"
import data from "@emoji-mart/data"

interface CommunityPostProps {
  post: Post
}

export default function CommunityPost({ post: initialPost }: CommunityPostProps) {
  const { user, isAuthenticated, showAuthModal } = useAuth()
  const { posts, likePost, addComment, likeComment, deletePost, updatePost } = useCommunity()
  const { getOrCreateConversation, conversations, setActiveConversation } = useMessaging()
  const router = useRouter()
  const goToUser = (targetUserId: string) => {
    router.push(user?.id === targetUserId ? "/account" : `/profile/${targetUserId}`)
  }
  const post = useMemo(() => posts.find((p) => p.id === initialPost.id) ?? initialPost, [posts, initialPost])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [messageConversation, setMessageConversation] = useState<any>(null)
  const [commentPage, setCommentPage] = useState(0)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title || "")
  const [editContent, setEditContent] = useState(post.content || "")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showTitleEmojiPicker, setShowTitleEmojiPicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string>(post.mediaUrl || post.images?.[0] || "")
  const [resolvedMediaType, setResolvedMediaType] = useState<string>(post.mediaType || "")
  const [isMediaLoading, setIsMediaLoading] = useState(false)
  const mediaRef = useRef<HTMLDivElement | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string>(post.mediaUrl || post.images?.[0] || "")
  const [editImageData, setEditImageData] = useState<string>(post.mediaUrl || post.images?.[0] || "")
  const [editMediaType, setEditMediaType] = useState<string>(post.mediaType || "")
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const editTitleRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!post?.id) return
    setResolvedMediaUrl(post.mediaUrl || post.images?.[0] || "")
    setResolvedMediaType(post.mediaType || "")
  }, [post?.id, post?.images, post?.mediaType, post?.mediaUrl])

  useEffect(() => {
    if (resolvedMediaUrl) return
    if (!post.hasMedia) return

    const node = mediaRef.current
    if (!node) return

    let cancelled = false

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        observer.disconnect()

        void (async () => {
          setIsMediaLoading(true)
          try {
            const res = await fetch(`/api/community/posts/${post.id}/media`, { credentials: "include", cache: "no-store" })
            if (!res.ok) return
            const data = (await res.json().catch(() => null)) as { mediaUrl?: string; mediaType?: string } | null
            if (cancelled) return
            if (data?.mediaUrl) {
              setResolvedMediaUrl(data.mediaUrl)
              setResolvedMediaType(data.mediaType || "")
            }
          } catch {
            // ignore
          } finally {
            if (!cancelled) setIsMediaLoading(false)
          }
        })()
      },
      { rootMargin: "250px" },
    )

    observer.observe(node)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [post.hasMedia, post.id, resolvedMediaUrl])

  const handleDeletePost = async () => {
    if (!isAuthenticated || !user) {
      showAuthModal("login")
      return
    }
    if (!isPostAuthor) return
    setIsDeleteOpen(true)
  }

  const handleLike = () => {
    if (!isAuthenticated || !user) {
      showAuthModal("login")
      return
    }
    void likePost(post.id, post.likedBy.includes(user.id))
  }

  const handleComment = async () => {
    if (!isAuthenticated || !user) {
      showAuthModal("login")
      return
    }

    if (!newComment.trim()) return

    setIsPosting(true)
    try {
      await addComment(post.id, newComment.trim())
      setNewComment("")
    } catch (error) {
      console.error("Failed to add comment:", error)
      alert("Failed to add comment. Please try again.")
    } finally {
      setIsPosting(false)
    }
  }

  const handleLikeComment = (commentId: string) => {
    if (!isAuthenticated || !user) {
      showAuthModal("login")
      return
    }
    const comment = post.comments.find((c) => c.id === commentId)
    const isLiked = comment ? comment.likedBy.includes(user.id) : false
    void likeComment(post.id, commentId, isLiked)
  }

  const pageSize = 3
  const totalComments = post.comments?.length ?? 0
  const maxPage = totalComments > 0 ? Math.max(Math.ceil(totalComments / pageSize) - 1, 0) : 0
  const currentComments = post.comments.slice(commentPage * pageSize, commentPage * pageSize + pageSize)
  const canShowMore = commentPage < maxPage
  const canShowLess = commentPage > 0

  const findConversationWith = (targetUserId: string) =>
    conversations.find((conv) => conv.participants.some((p) => p.id === targetUserId))

  const handleMessageUser = (userId: string, userName: string) => {
    if (!isAuthenticated) {
      showAuthModal("login")
      return
    }
    if (userId === user?.id) return

    void (async () => {
      try {
        const existing = findConversationWith(userId)
        if (existing) {
          setActiveConversation(existing)
          router.push("/messages")
          return
        }

        const conv = await getOrCreateConversation(userId)
        setMessageConversation(conv)
        setIsMessageModalOpen(true)
      } catch (error) {
        console.error("Failed to open conversation:", error)
        const message = error instanceof Error ? error.message : "Unable to start conversation."
        toast.error(message)
      }
    })()
  }

  const hasConversationWith = (targetUserId: string) => !!findConversationWith(targetUserId)

  const handleCloseMessaging = () => {
    setIsMessageModalOpen(false)
    setMessageConversation(null)
  }

  const applyEditTitleFormatting = (wrap: string, wrapEnd: string = wrap) => {
    const input = editTitleRef.current
    if (!input) return
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const before = editTitle.slice(0, start)
    const selected = editTitle.slice(start, end)
    const after = editTitle.slice(end)
    const newValue = `${before}${wrap}${selected || "Title"}${wrapEnd}${after}`
    setEditTitle(newValue)
    const cursor = (before + wrap + (selected || "Title") + wrapEnd).length
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(cursor, cursor)
    })
  }

  const applyEditFormatting = (wrap: string, wrapEnd: string = wrap) => {
    const textarea = editTextareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const before = editContent.slice(0, start)
    const selected = editContent.slice(start, end)
    const after = editContent.slice(end)
    const newValue = `${before}${wrap}${selected || "text"}${wrapEnd}${after}`
    setEditContent(newValue)
    const cursor = (before + wrap + (selected || "text") + wrapEnd).length
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleEditEmojiSelect = (emoji: any) => {
    setEditContent((prev) => `${prev}${emoji.native}`)
    setShowEmojiPicker(false)
    editTextareaRef.current?.focus()
  }

  const handleEditTitleEmojiSelect = (emoji: any) => {
    setEditTitle((prev) => `${prev}${emoji.native}`)
    setShowTitleEmojiPicker(false)
    editTitleRef.current?.focus()
  }

  const handleEditImageUpload = async (file: File) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) return
    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result?.toString() || ""
        setEditImagePreview(result)
        setEditImageData(result)
        setEditMediaType(file.type)
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploading(false)
    }
  }

  const formatContent = (raw?: string) => {
    if (!raw) return { __html: "" }
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

    // Escape everything first
    let formatted = escapeHtml(raw)

    // Basic markdown-like replacements on escaped text
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    formatted = formatted.replace(/\*(.+?)\*/g, "<em>$1</em>")
    formatted = formatted.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, "<u>$1</u>")
    formatted = formatted.replace(/(?:\r\n|\r|\n)/g, "<br />")
    return { __html: formatted }
  }

  const openEditModal = () => {
    if (!isPostAuthor) return
    setEditTitle(post.title || "")
    setEditContent(post.content || "")
    setEditImagePreview(post.mediaUrl || post.images?.[0] || "")
    setEditImageData(post.mediaUrl || post.images?.[0] || "")
    setEditMediaType(post.mediaType || "")
    setShowEmojiPicker(false)
    setShowTitleEmojiPicker(false)
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return
    setIsSavingEdit(true)
    try {
      await updatePost(post.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        imageUrl: editImageData || "",
        mediaType: editMediaType || undefined,
      })
      setIsEditOpen(false)
    } catch (err) {
      console.error("Failed to update post:", err)
      toast.error("Failed to update post.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const isPostAuthor = Boolean(isAuthenticated && user?.id && post.author?.id && user.id === post.author.id)
  const isLiked = user ? post.likedBy.includes(user.id) : false
  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await deletePost(post.id)
      setIsDeleteOpen(false)
    } catch (error) {
      console.error("Failed to delete post:", error)
      toast.error("Failed to delete post.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <button type="button" className="shrink-0" onClick={() => goToUser(post.author.id)}>
                <Avatar className="h-10 w-10 cursor-pointer">
                  <AvatarImage
                    src={getAvatarSrc(post.author.name, (post.author as any).avatarUrl ?? post.author.avatar)}
                  />
                  <AvatarFallback>
                    {(post.author.name || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToUser(post.author.id)}
                    className="font-semibold hover:text-purple-600 transition-colors"
                  >
                    {post.author.name || "Unknown User"}
                  </button>
                  {user && user.id !== post.author.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMessageUser(post.author.id, post.author.name)}
                      className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      aria-label={hasConversationWith(post.author.id) ? "Open chat" : "Request to PM"}
                      title={hasConversationWith(post.author.id) ? "Open chat" : "Request to PM"}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {!hasConversationWith(post.author.id) && "Request to PM"}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500">{formatTimeAgo(post.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPostAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={openEditModal}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleDeletePost}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {(resolvedMediaUrl || post.hasMedia || (post.images && post.images.length > 0)) && (
            <div ref={mediaRef} className="mb-4">
              {resolvedMediaUrl ? (
                resolvedMediaType?.startsWith("video") ? (
                  <video
                    src={resolvedMediaUrl}
                    className="w-full h-64 object-cover rounded-lg"
                    controls
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : resolvedMediaType?.startsWith("image") ? (
                  <img
                    src={resolvedMediaUrl}
                    alt="Post media"
                    className="w-full h-64 object-cover rounded-lg"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex items-center justify-between rounded-lg p-3 border bg-white">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Attachment</p>
                        <p className="text-xs text-gray-500">{resolvedMediaType || "file"}</p>
                      </div>
                    </div>
                    <a
                      href={resolvedMediaUrl}
                      download="attachment"
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                )
              ) : post.images?.[0] ? (
                <img
                  src={post.images?.[0] || "/placeholder.svg"}
                  alt="Post image"
                  className="w-full h-64 object-cover rounded-lg"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-64 rounded-lg bg-gray-100 flex items-center justify-center">
                  {isMediaLoading ? (
                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-gray-100 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          )}

          <div className="text-gray-700 mb-4 whitespace-pre-wrap" dangerouslySetInnerHTML={formatContent(post.content)} />

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-700">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`${isLiked ? "text-red-500" : "text-gray-500"} hover:text-red-500`}
              >
                <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
                {post.likes || 0}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowComments((prev) => !prev)
                  setCommentPage(0)
                }}
                className="text-gray-500 hover:text-purple-600"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {post.comments?.length || 0}
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="w-full mt-4 pt-4 border-t max-h-80 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Existing Comments */}
              {post.comments && post.comments.length > 0 && (
                <div className="space-y-2.5 mb-3 text-sm">
                  {canShowLess && (
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <button
                        className="text-purple-600 hover:text-purple-700 font-medium"
                        onClick={() => setCommentPage((p) => Math.max(p - 1, 0))}
                      >
                        Show previous
                      </button>
                      <span>
                        Showing {commentPage * pageSize + 1}-{Math.min((commentPage + 1) * pageSize, totalComments)} of {totalComments}
                      </span>
                    </div>
                  )}
                  {currentComments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-md p-2.5">
                      <div className="flex items-start gap-2.5">
                        <button type="button" className="shrink-0" onClick={() => goToUser(comment.author.id)}>
                          <Avatar className="h-8 w-8 cursor-pointer">
                            <AvatarImage
                              src={getAvatarSrc(comment.author.name, (comment.author as any).avatarUrl ?? comment.author.avatar)}
                            />
                            <AvatarFallback className="text-[10px]">
                              {(comment.author.name || "U").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <button
                              type="button"
                              onClick={() => goToUser(comment.author.id)}
                              className="font-medium text-[13px] hover:text-purple-600 transition-colors"
                            >
                              {comment.author.name || "Unknown User"}
                            </button>
                            {user && user.id !== comment.author.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMessageUser(comment.author.id, comment.author.name)}
                                className="h-5 px-1 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                aria-label={hasConversationWith(comment.author.id) ? "Open chat" : "Request to PM"}
                                title={hasConversationWith(comment.author.id) ? "Open chat" : "Request to PM"}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {!hasConversationWith(comment.author.id) && "Request to PM"}
                              </Button>
                            )}
                            <span className="text-[11px] text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-[13px] text-gray-700 whitespace-pre-wrap mb-1.5">{comment.content}</p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLikeComment(comment.id)}
                              className={`h-6 px-2 text-xs ${
                                user && comment.likedBy.includes(user.id) ? "text-red-500" : "text-gray-500"
                              } hover:text-red-500`}
                            >
                              <Heart
                                className={`h-3 w-3 mr-1 ${
                                  user && comment.likedBy.includes(user.id) ? "fill-current" : ""
                                }`}
                              />
                              {comment.likes || 0}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {canShowMore && (
                    <div className="flex justify-between items-center text-xs text-gray-600">
                      <span>
                        Showing {commentPage * pageSize + 1}-{Math.min((commentPage + 1) * pageSize, totalComments)} of {totalComments}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50 h-8"
                        onClick={() => setCommentPage((p) => Math.min(p + 1, maxPage))}
                      >
                        Show more
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Add Comment Form */}
              {isAuthenticated ? (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={getAvatarSrc(user?.name, user?.avatarUrl)}
                    />
                    <AvatarFallback className="text-xs">
                      {(user?.name || "U").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                      disabled={isPosting}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          handleComment()
                        }
                      }}
                    />
                    <Button
                      onClick={handleComment}
                      disabled={!newComment.trim() || isPosting}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isPosting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">Sign in to join the conversation</p>
                  <Button onClick={() => showAuthModal("login")} variant="outline" size="sm">
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardFooter>
      </Card>

      <MessagingModal isOpen={isMessageModalOpen} onClose={handleCloseMessaging} conversation={messageConversation ?? undefined} />

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="edit-title">
                Title
              </label>
              <Input
                id="edit-title"
                ref={editTitleRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Update title"
                className="pr-24"
              />
              <div className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1 text-sm text-gray-600">
                <span className="text-xs text-gray-500">Format</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => applyEditTitleFormatting("**", "**")}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => applyEditTitleFormatting("*", "*")}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => applyEditTitleFormatting("<u>", "</u>")}
                >
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
                      <Picker data={data} onEmojiSelect={handleEditTitleEmojiSelect} theme="light" />
                    </div>
                  )}
                </div>
                <span className="ml-auto text-xs text-gray-400">Keep it concise</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="edit-content">
                Content
              </label>
              <div className="flex flex-wrap items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                <Button type="button" variant="ghost" size="icon" onClick={() => applyEditFormatting("**", "**")}>
                  <Bold className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => applyEditFormatting("*", "*")}>
                  <Italic className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => applyEditFormatting("<u>", "</u>")}>
                  <Underline className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setEditContent((prev) => `${prev}\n• `)}>
                  <List className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmojiPicker((prev) => !prev)}>
                    <Smile className="h-4 w-4" />
                  </Button>
                  {showEmojiPicker && (
                    <div className="absolute z-10 mt-2">
                      <Picker data={data} onEmojiSelect={handleEditEmojiSelect} theme="light" />
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
                    if (file) void handleEditImageUpload(file)
                  }}
                />
              </div>
              <Textarea
                id="edit-content"
                ref={editTextareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[140px]"
              />
              {editImagePreview && (
                <div className="relative mt-3">
                  {editMediaType?.startsWith("video") ? (
                    <video
                      src={editImagePreview}
                      className="w-full h-48 object-cover rounded-lg"
                      muted
                      playsInline
                      controls
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause()
                        e.currentTarget.currentTime = 0
                      }}
                    />
                  ) : editMediaType?.startsWith("image") ? (
                    <img
                      src={editImagePreview}
                      alt="Attachment preview"
                    className="w-full h-48 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="flex items-center justify-between bg-gray-100 border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">Attachment</p>
                          <p className="text-xs text-gray-500">{editMediaType || "file"}</p>
                        </div>
                      </div>
                      <a
                        href={editImagePreview}
                        download="attachment"
                        className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
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
                      setEditImagePreview("")
                      setEditImageData("")
                      setEditMediaType("")
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editTitle.trim() || !editContent.trim()}>
              {isSavingEdit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete post?"
        description="This will permanently remove your post for everyone in your city."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />
    </>
  )
}
