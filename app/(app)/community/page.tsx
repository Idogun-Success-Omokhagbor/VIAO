"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Plus, Search, MessageSquare } from "lucide-react"
import { useCommunity } from "@/context/community-context"
import { useAuth } from "@/context/auth-context"
import CommunityPost from "@/components/community-post"
import CommunityPostForm from "@/components/community-post-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

export default function CommunityPage() {
  const { posts, isLoading, error, refreshPosts } = useCommunity()
  const { isAuthenticated, showAuthModal, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showPostForm, setShowPostForm] = useState(false)
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    void refreshPosts()
  }, [refreshPosts])

  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden) {
        void refreshPosts()
      }
    }
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleFocus)
    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleFocus)
    }
  }, [refreshPosts])

  const userLocation = user?.location?.trim() || ""

  const locationFilteredPosts = userLocation
    ? posts.filter((post) => {
        const normalizedUserLoc = userLocation.toLowerCase()
        const postLoc = post.location?.toLowerCase().trim()
        const authorLoc = post.author?.location?.toLowerCase().trim()

        const matchesUser =
          (postLoc && postLoc === normalizedUserLoc) || (authorLoc && authorLoc === normalizedUserLoc)

        const hasNoLocation = !postLoc && !authorLoc

        return matchesUser || hasNoLocation
      })
    : posts

  const filteredPosts = locationFilteredPosts.filter((post) => {
    if (!post) return false

    const searchLower = (searchQuery || "").toLowerCase()
    const matchesSearch =
      !searchQuery ||
      (post.title && post.title.toLowerCase().includes(searchLower)) ||
      (post.content && post.content.toLowerCase().includes(searchLower)) ||
      (post.author?.name && post.author.name.toLowerCase().includes(searchLower)) ||
      (post.tags && post.tags.some((tag) => tag && tag.toLowerCase().includes(searchLower)))

    return matchesSearch
  })

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    } else if (sortBy === "popular") {
      return (b.likes || 0) - (a.likes || 0)
    } else if (sortBy === "comments") {
      return (b.comments?.length || 0) - (a.comments?.length || 0)
    }
    return 0
  })

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      showAuthModal("login")
      return
    }
    setShowPostForm(true)
  }

  const postsToDisplay = sortedPosts

  return (
    <div className="w-full h-full min-h-0 px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
          <p className="text-gray-600">Connect, share, and engage with your local community</p>
        </div>
        <Button
          onClick={handleCreatePost}
          className="mt-4 md:mt-0 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      <>
      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search posts, authors, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="comments">Most Comments</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Posts Feed */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading posts...</div>
      ) : postsToDisplay.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? "Try adjusting your search" : "Be the first to start a conversation!"}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreatePost} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create First Post
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {postsToDisplay.map((post) => (
            <CommunityPost key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      {showPostForm && (
        <Dialog open={showPostForm} onOpenChange={setShowPostForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <CommunityPostForm onClose={() => setShowPostForm(false)} />
          </DialogContent>
        </Dialog>
      )}

      </>
    </div>
  )
}
