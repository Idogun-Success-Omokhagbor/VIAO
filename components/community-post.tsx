"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Trash2, User, Edit, MessageSquare } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useCommunity, type Post } from "@/context/community-context"
import { formatTimeAgo } from "@/lib/utils"
import { useMessaging } from "@/context/messaging-context"
import MessagingModal from "@/components/messaging-modal"

interface CommunityPostProps {
  post: Post
}

export default function CommunityPost({ post }: CommunityPostProps) {
  const { user, isAuthenticated, showAuthModal } = useAuth()
  const { likePost, addComment, likeComment, deletePost } = useCommunity()
  const { getOrCreateConversation } = useMessaging()
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [messageConversation, setMessageConversation] = useState<any>(null)

  if (!post || !post.author) {
    return null
  }

  const handleDeletePost = async () => {
    if (!isAuthenticated || !user) {
      showAuthModal("login")
      return
    }
    if (user.id !== post.author.id) return
    const ok = window.confirm("Delete this post?")
    if (!ok) return
    try {
      await deletePost(post.id)
    } catch (error) {
      console.error("Failed to delete post:", error)
      alert("Failed to delete post. Please try again.")
    }
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

  const handleMessageUser = (userId: string, userName: string) => {
    if (!isAuthenticated) {
      showAuthModal("login")
      return
    }
    if (userId === user?.id) return

    void (async () => {
      try {
        const conv = await getOrCreateConversation(userId)
        setMessageConversation(conv)
        setIsMessageModalOpen(true)
      } catch (error) {
        console.error("Failed to open conversation:", error)
      }
    })()
  }

  const handleCloseMessaging = () => {
    setIsMessageModalOpen(false)
    setMessageConversation(null)
  }

  const handleShare = async () => {
    const shareData = {
      title: `Post by ${post.author.name}`,
      text: post.content,
      url: window.location.href,
    }

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(`${post.content}\n\n${window.location.href}`)
        alert("Post copied to clipboard!")
      } catch (error) {
        console.error("Failed to copy to clipboard:", error)
      }
    }
  }

  const isPostAuthor = user?.id === post.author.id
  const isLiked = user ? post.likedBy.includes(user.id) : false

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all">
                <AvatarImage
                  src={
                    post.author.avatar ||
                    `/placeholder.svg?height=40&width=40&text=${post.author.name?.substring(0, 2) || "U"}`
                  }
                />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold cursor-pointer hover:text-purple-600 transition-colors">
                    {post.author.name || "Unknown User"}
                  </h3>
                  {user && user.id !== post.author.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMessageUser(post.author.id, post.author.name)}
                      className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Message
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500">{formatTimeAgo(post.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.location && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {post.location}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isPostAuthor && (
                    <>
                      <DropdownMenuItem className="cursor-pointer">
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
                    </>
                  )}
                  <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

          {post.images && post.images.length > 0 && (
            <div className="mb-4">
              <img
                src={post.images[0] || "/placeholder.svg"}
                alt="Post image"
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

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
                onClick={() => setShowComments(!showComments)}
                className="text-gray-500 hover:text-purple-600"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {post.comments?.length || 0}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare} className="text-gray-500 hover:text-blue-600">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="w-full mt-4 pt-4 border-t">
              {/* Existing Comments */}
              {post.comments && post.comments.length > 0 && (
                <div className="space-y-3 mb-4">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all">
                          <AvatarImage
                            src={
                              comment.author.avatar ||
                              `/placeholder.svg?height=32&width=32&text=${comment.author.name?.substring(0, 2) || "U"}`
                            }
                          />
                          <AvatarFallback className="text-xs">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm cursor-pointer hover:text-purple-600 transition-colors">
                              {comment.author.name || "Unknown User"}
                            </span>
                            {user && user.id !== comment.author.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMessageUser(comment.author.id, comment.author.name)}
                                className="h-5 px-1 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Message
                              </Button>
                            )}
                            <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{comment.content}</p>
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
                </div>
              )}

              {/* Add Comment Form */}
              {isAuthenticated ? (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        user?.avatarUrl || `/placeholder.svg?height=32&width=32&text=${user?.name?.substring(0, 2) || "U"}`
                      }
                    />
                    <AvatarFallback className="text-xs">
                      <User className="h-3 w-3" />
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
    </>
  )
}
