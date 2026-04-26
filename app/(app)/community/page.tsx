"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { AppSpinner } from "@/components/ui/app-spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Clock3, MapPin, MessageSquare, Plus, Search, Sparkles } from "lucide-react"
import { useCommunity, type Post } from "@/context/community-context"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import type { CommunityPostFormProps } from "@/components/community-post-form"

const CommunityPost = dynamic<{ post: Post }>(() => import("@/components/community-post"), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-[24px] border border-[#ece4ff] bg-white" />,
})
const CommunityPostForm = dynamic<CommunityPostFormProps>(() => import("@/components/community-post-form"), { ssr: false })

type CommunityScope = "nearby" | "all"

export default function CommunityPage() {
  const { posts, isLoading, error, refreshPosts } = useCommunity()
  const { isAuthenticated, openAuthPage, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showPostForm, setShowPostForm] = useState(false)
  const [sortBy, setSortBy] = useState("newest")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const userLocation = user?.location?.trim() || ""
  const [scope, setScope] = useState<CommunityScope>(userLocation ? "nearby" : "all")

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

  useEffect(() => {
    if (!userLocation && scope === "nearby") {
      setScope("all")
    }
  }, [scope, userLocation])

  const locationFilteredPosts = useMemo(() => {
    if (!userLocation) return posts

    return posts.filter((post) => {
      const normalizedUserLocation = userLocation.toLowerCase()
      const postLocation = post.location?.toLowerCase().trim()
      const authorLocation = post.author?.location?.toLowerCase().trim()

      const matchesUser =
        (postLocation && postLocation === normalizedUserLocation) || (authorLocation && authorLocation === normalizedUserLocation)

      const hasNoLocation = !postLocation && !authorLocation

      return matchesUser || hasNoLocation
    })
  }, [posts, userLocation])

  const scopedPosts = useMemo(() => {
    if (scope === "nearby" && userLocation) return locationFilteredPosts
    return posts
  }, [locationFilteredPosts, posts, scope, userLocation])

  const filteredPosts = useMemo(() => {
    const searchLower = deferredSearchQuery.trim().toLowerCase()

    return scopedPosts.filter((post) => {
      if (!post) return false
      if (!searchLower) return true

      return Boolean(
        (post.title && post.title.toLowerCase().includes(searchLower)) ||
          (post.content && post.content.toLowerCase().includes(searchLower)) ||
          (post.author?.name && post.author.name.toLowerCase().includes(searchLower)) ||
          (post.tags && post.tags.some((tag) => tag && tag.toLowerCase().includes(searchLower))),
      )
    })
  }, [deferredSearchQuery, scopedPosts])

  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy === "popular") {
        return (b.likes || 0) - (a.likes || 0)
      }
      if (sortBy === "comments") {
        return (b.commentsCount ?? b.comments?.length ?? 0) - (a.commentsCount ?? a.comments?.length ?? 0)
      }
      return 0
    })
  }, [filteredPosts, sortBy])

  const localDiscussionCount = locationFilteredPosts.length
  const freshThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return posts.filter((post) => new Date(post.createdAt).getTime() >= cutoff).length
  }, [posts])
  const activeThreads = useMemo(() => posts.filter((post) => (post.commentsCount ?? post.comments?.length ?? 0) > 0).length, [posts])

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      openAuthPage("login")
      return
    }
    setShowPostForm(true)
  }

  const hasSearch = deferredSearchQuery.trim().length > 0
  const showingNearby = scope === "nearby" && Boolean(userLocation)

  return (
    <div className="min-h-full w-full bg-[#fcfaff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[28px] border border-[#eadfff] bg-[linear-gradient(135deg,#fff_0%,#f8f4ff_52%,#eef6ff_100%)] shadow-[0_24px_60px_rgba(98,59,188,0.08)]">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-4 rounded-full bg-white/90 px-3 py-1 text-[#5f49be] shadow-sm hover:bg-white">
                People around your plans
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-[#1f1538] sm:text-4xl">Community</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f5679] sm:text-base">
                Ask for local tips, swap recommendations, and stay close to the conversations that actually help you decide where to go next.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {userLocation ? (
                  <Badge variant="secondary" className="rounded-full bg-white/80 px-3 py-1 text-[#5f5679]">
                    <MapPin className="mr-1 h-3.5 w-3.5" />
                    Personalised for {userLocation}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="rounded-full bg-white/80 px-3 py-1 text-[#5f5679]">
                    Add a location so nearby questions and recommendations show up first
                  </Badge>
                )}
                <Badge variant="secondary" className="rounded-full bg-white/80 px-3 py-1 text-[#5f5679]">
                  Useful for plans, recommendations, and local context
                </Badge>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleCreatePost}
                className="h-11 rounded-full bg-[#5b34d6] px-5 text-white shadow-[0_16px_30px_rgba(91,52,214,0.28)] hover:bg-[#4a27bf]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Start a post
              </Button>
              {userLocation ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScope(scope === "nearby" ? "all" : "nearby")}
                  className="h-11 rounded-full border-white/70 bg-white/75 px-5 text-[#4c3a95] hover:bg-white"
                >
                  {scope === "nearby" ? "See everything" : "Focus near me"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/70 bg-white/55 p-4 sm:grid-cols-3 sm:p-6">
            <InsightCard
              icon={MapPin}
              label="Near you"
              value={userLocation ? `${localDiscussionCount}` : "Add location"}
              description={userLocation ? "Conversations matching your area" : "Unlock location-aware discussions"}
            />
            <InsightCard icon={Clock3} label="Fresh this week" value={`${freshThisWeek}`} description="Fresh questions and recommendations from the last week" />
            <InsightCard icon={Sparkles} label="Active threads" value={`${activeThreads}`} description="Posts that already have replies" />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#ece4ff] bg-white p-4 shadow-[0_16px_40px_rgba(98,59,188,0.06)] sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search posts, authors, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-full border-[#e4dafc] pl-10"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {userLocation ? (
                  <div className="flex rounded-full border border-[#e4dafc] bg-[#faf7ff] p-1">
                    <button
                      type="button"
                      onClick={() => setScope("nearby")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                        scope === "nearby" ? "bg-white text-[#4e35cc] shadow-sm" : "text-[#776b9a]",
                      )}
                    >
                      Nearby
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope("all")}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                        scope === "all" ? "bg-white text-[#4e35cc] shadow-sm" : "text-[#776b9a]",
                      )}
                    >
                      All posts
                    </button>
                  </div>
                ) : null}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-11 w-full rounded-full border-[#e4dafc] sm:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="popular">Most liked</SelectItem>
                    <SelectItem value="comments">Most replies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm text-[#675c8d] sm:flex-row sm:items-center sm:justify-between">
              <p>
                {showingNearby
                  ? `${sortedPosts.length} local conversations are active${userLocation ? ` around ${userLocation}` : ""}.`
                  : `${sortedPosts.length} conversations are live across the people and plans around VIAO.`}
              </p>
              {hasSearch ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-left font-medium text-[#4e35cc] transition-colors hover:text-[#351f9c]"
                >
                  Clear search
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <AppSpinner
            label="Loading local conversations..."
            size="lg"
            fullHeight
            className="rounded-[24px] border border-[#ece4ff] bg-white px-6 py-16 shadow-[0_12px_30px_rgba(98,59,188,0.05)]"
          />
        ) : sortedPosts.length === 0 ? (
          <EmptyCommunityState
            searchActive={hasSearch}
            showingNearby={showingNearby}
            userLocation={userLocation}
            onClearSearch={() => setSearchQuery("")}
            onShowAll={() => setScope("all")}
            onCreatePost={handleCreatePost}
          />
        ) : (
          <div className="space-y-5">
            {sortedPosts.map((post) => (
              <CommunityPost key={post.id} post={post} />
            ))}
          </div>
        )}

        {showPostForm ? (
          <Dialog open={showPostForm} onOpenChange={setShowPostForm}>
            <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto p-0">
              <CommunityPostForm onClose={() => setShowPostForm(false)} />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  )
}

function InsightCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof MapPin
  label: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-[20px] border border-white/80 bg-white/80 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8a7eb6]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-[#24183d]">{value}</div>
      <p className="mt-1 text-sm text-[#665d87]">{description}</p>
    </div>
  )
}

function EmptyCommunityState({
  searchActive,
  showingNearby,
  userLocation,
  onClearSearch,
  onShowAll,
  onCreatePost,
}: {
  searchActive: boolean
  showingNearby: boolean
  userLocation: string
  onClearSearch: () => void
  onShowAll: () => void
  onCreatePost: () => void
}) {
  let title = "No posts yet"
  let description = "Be the first to ask a question, share a recommendation, or help someone plan something worth going to."

  if (searchActive) {
    title = "Nothing fits that search"
    description = "Try a different keyword, browse a wider scope, or clear the search to see the latest posts."
  } else if (showingNearby) {
    title = userLocation ? `Nothing nearby in ${userLocation} yet` : "No nearby conversations yet"
    description = "This area is quiet right now. Widen the radius or be the first person to start something useful."
  }

  return (
    <div className="rounded-[24px] border border-dashed border-[#dbcffd] bg-white px-6 py-16 text-center shadow-[0_12px_30px_rgba(98,59,188,0.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ecff] text-[#5b34d6]">
        <MessageSquare className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-[#24183d]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#685f88]">{description}</p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {searchActive ? (
          <Button variant="outline" onClick={onClearSearch} className="rounded-full border-[#d9cdfd] px-5">
            Clear search
          </Button>
        ) : null}
        {showingNearby ? (
          <Button variant="outline" onClick={onShowAll} className="rounded-full border-[#d9cdfd] px-5">
            Widen the radius
          </Button>
        ) : null}
        <Button
          onClick={onCreatePost}
          className="rounded-full bg-[#5b34d6] px-5 text-white shadow-[0_16px_30px_rgba(91,52,214,0.22)] hover:bg-[#4a27bf]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create post
        </Button>
      </div>
    </div>
  )
}
