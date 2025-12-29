"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Plus, Search, TrendingUp, Users, MessageSquare, Heart } from "lucide-react"
import { useCommunity } from "@/context/community-context"
import { useAuth } from "@/context/auth-context"
import CommunityPost from "@/components/community-post"
import CommunityPostForm from "@/components/community-post-form"

const categories = [
  { id: "all", label: "All Posts", color: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
  { id: "general", label: "General", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { id: "event", label: "Events", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
  { id: "question", label: "Questions", color: "bg-green-100 text-green-800 hover:bg-green-200" },
  { id: "announcement", label: "Announcements", color: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
  { id: "recommendation", label: "Recommendations", color: "bg-pink-100 text-pink-800 hover:bg-pink-200" },
]

export default function CommunityPage() {
  const { posts, isLoading, error, refreshPosts } = useCommunity()
  const { isAuthenticated, showAuthModal } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState("all")
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

  const filteredPosts = posts.filter((post) => {
    if (!post) return false

    const postType = (post.type || "general").toLowerCase()
    const matchesCategory = selectedCategory === "all" || postType === selectedCategory

    const searchLower = (searchQuery || "").toLowerCase()
    const matchesSearch =
      !searchQuery ||
      (post.title && post.title.toLowerCase().includes(searchLower)) ||
      (post.content && post.content.toLowerCase().includes(searchLower)) ||
      (post.author?.name && post.author.name.toLowerCase().includes(searchLower)) ||
      (post.tags && post.tags.some((tag) => tag && tag.toLowerCase().includes(searchLower)))

    return matchesCategory && matchesSearch
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

  const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0)
  const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0)

  return (
    <div className="w-full h-full min-h-0 px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
          <p className="text-gray-600">Connect, share, and engage with your local community</p>
        </div>
        <Button onClick={handleCreatePost} className="mt-4 md:mt-0 bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Comments</p>
                <p className="text-2xl font-bold text-gray-900">{totalComments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900">{totalLikes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    posts.filter((post) => {
                      if (!post || !post.createdAt) return false
                      const postDate = new Date(post.createdAt)
                      const today = new Date()
                      return postDate.toDateString() === today.toDateString()
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              className={`cursor-pointer ${
                selectedCategory === category.id ? "bg-purple-600 hover:bg-purple-700" : category.color
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </Badge>
          ))}
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
      ) : sortedPosts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No posts found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || selectedCategory !== "all"
              ? "Try adjusting your search or filters"
              : "Be the first to start a conversation!"}
          </p>
          {!searchQuery && selectedCategory === "all" && (
            <Button onClick={handleCreatePost} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create First Post
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedPosts.map((post) => (
            <CommunityPost key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Popular Tags */}
      {posts.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Popular Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(posts.flatMap((post) => post.tags || []).filter(Boolean)))
                .slice(0, 10)
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-purple-100 hover:text-purple-700 transition-colors"
                    onClick={() => setSearchQuery(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Post Modal */}
      {showPostForm && (
        <Dialog open={showPostForm} onOpenChange={setShowPostForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <CommunityPostForm onClose={() => setShowPostForm(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
