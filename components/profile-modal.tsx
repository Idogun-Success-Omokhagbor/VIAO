"use client"

import { useEffect, useMemo, useState } from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BadgeCheck, EyeOff } from "lucide-react"

import CommunityPost from "@/components/community-post"
import type { Post } from "@/context/community-context"
import { getAvatarSrc } from "@/lib/utils"

type PublicProfileUser = {
  id: string
  name: string
  role?: "USER" | "ORGANIZER" | "ADMIN"
  avatarUrl: string | null
  location?: string | null
  bio?: string | null
  interests?: string[]
  createdAt?: string
  lastSeenAt?: string | null
  isOnline?: boolean
  isCollaborator?: boolean
}

type PublicProfileResponse = {
  user: PublicProfileUser
  stats?: {
    posts: number
    comments: number
    events: number
  }
  isProfilePublic?: boolean
  canViewFullProfile?: boolean
}

type UserPostsResponse = {
  page: number
  take: number
  total: number
  hasMore: boolean
  posts: Post[]
}

export default function ProfileModal({
  isOpen,
  userId,
  onClose,
}: {
  isOpen: boolean
  userId: string | null
  onClose: () => void
}) {
  const [data, setData] = useState<PublicProfileResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [postsPage, setPostsPage] = useState(0)
  const [postsData, setPostsData] = useState<UserPostsResponse | null>(null)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setData(null)
      setError(null)
      setPostsPage(0)
      setPostsData(null)
      setPostsError(null)
      return
    }
  }, [isOpen])

  useEffect(() => {
    const run = async () => {
      if (!isOpen || !userId) return
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(String(userId))}/public-profile`, {
          credentials: "include",
        })
        const json = (await res.json().catch(() => null)) as PublicProfileResponse | { error?: string } | null
        if (!res.ok) {
          setError((json as any)?.error || "Failed to load profile")
          setData(null)
          return
        }
        setData(json as PublicProfileResponse)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile")
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [isOpen, userId])

  const profile = data?.user
  const canViewFullProfile = data?.canViewFullProfile ?? true

  const joinedLabel = useMemo(() => {
    if (!profile?.createdAt) return null
    const date = new Date(profile.createdAt)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })
  }, [profile?.createdAt])

  const lastSeenLabel = useMemo(() => {
    if (!profile?.lastSeenAt) return null
    const date = new Date(profile.lastSeenAt)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }, [profile?.lastSeenAt])

  useEffect(() => {
    if (!userId) return
    setPostsPage(0)
    setPostsData(null)
    setPostsError(null)
  }, [userId])

  useEffect(() => {
    const run = async () => {
      if (!isOpen || !userId) return
      if (!canViewFullProfile) return
      setIsLoadingPosts(true)
      setPostsError(null)
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(String(userId))}/posts?page=${postsPage}&take=5`, {
          credentials: "include",
        })
        const json = (await res.json().catch(() => null)) as UserPostsResponse | { error?: string } | null
        if (!res.ok) {
          setPostsError((json as any)?.error || "Failed to load posts")
          setPostsData(null)
          return
        }
        setPostsData(json as UserPostsResponse)
      } catch (e) {
        setPostsError(e instanceof Error ? e.message : "Failed to load posts")
        setPostsData(null)
      } finally {
        setIsLoadingPosts(false)
      }
    }

    void run()
  }, [isOpen, userId, postsPage, canViewFullProfile])

  const postsLabel = useMemo(() => {
    if (!postsData) return null
    const start = postsData.total ? postsData.page * postsData.take + 1 : 0
    const end = Math.min(postsData.total, (postsData.page + 1) * postsData.take)
    return postsData.total ? `Showing ${start}-${end} of ${postsData.total}` : ""
  }, [postsData])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-none w-[100vw] h-[100dvh] p-0 overflow-hidden rounded-none border-0">
        <div className="h-[100dvh] bg-gray-50 flex flex-col">
          <div className="shrink-0 bg-white border-b">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <Button variant="outline" className="bg-transparent" onClick={onClose}>
                Back
              </Button>
              <div className="text-sm font-medium text-gray-900">Profile</div>
              <div className="w-[72px]" />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 h-28" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
              <Card className="-mt-12 overflow-hidden border-gray-200 shadow-sm">
                <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="relative shrink-0">
                    <Avatar className="h-24 w-24 ring-4 ring-white shadow-sm">
                      <AvatarImage src={getAvatarSrc(profile?.name, profile?.avatarUrl)} alt={profile?.name || "User"} />
                      <AvatarFallback className="text-xl">{(profile?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {profile?.isOnline ? (
                      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 ring-4 ring-white" />
                    ) : null}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-2xl font-bold text-gray-900">{profile?.name || (isLoading ? "Loading..." : "User")}</h1>
                          {profile?.isCollaborator ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center">
                                    <BadgeCheck className="h-5 w-5 text-purple-600" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Collaborator</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {canViewFullProfile ? (
                            <>
                              {profile?.location ? <span>{profile.location}</span> : <span> </span>}
                              {joinedLabel ? <span className="ml-2">Joined {joinedLabel}</span> : null}
                            </>
                          ) : (
                            <span className="italic text-gray-500 inline-flex items-center gap-2">
                              <EyeOff className="h-4 w-4" />
                              This profile is private
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                      </div>
                    </div>

                    {canViewFullProfile ? (
                      <>
                        {profile?.bio ? <p className="mt-4 text-gray-700 leading-relaxed">{profile.bio}</p> : null}
                        {lastSeenLabel ? <p className="mt-2 text-xs text-gray-500">Last seen {lastSeenLabel}</p> : null}
                      </>
                    ) : null}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600">Posts</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-semibold text-gray-900">
                      {canViewFullProfile ? data?.stats?.posts ?? 0 : <EyeOff className="h-5 w-5 text-gray-500" />}
                    </CardContent>
                  </Card>
                  <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600">Comments</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-semibold text-gray-900">
                      {canViewFullProfile ? data?.stats?.comments ?? 0 : <EyeOff className="h-5 w-5 text-gray-500" />}
                    </CardContent>
                  </Card>
                  <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600">Events</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-2xl font-semibold text-gray-900">
                      {canViewFullProfile ? data?.stats?.events ?? 0 : <EyeOff className="h-5 w-5 text-gray-500" />}
                    </CardContent>
                  </Card>
                </div>

                <Separator className="my-6" />
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-3">Interests</div>
                  {!canViewFullProfile ? (
                    <p className="text-sm italic text-gray-500 inline-flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      This profile is private
                    </p>
                  ) : profile?.interests?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.slice(0, 20).map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No interests yet.</p>
                  )}
                </div>

                <Separator className="my-6" />
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">Posts</div>
                    {canViewFullProfile && postsLabel ? <div className="text-xs text-gray-500">{postsLabel}</div> : null}
                  </div>

                  {!canViewFullProfile ? (
                    <p className="mt-3 text-sm italic text-gray-500 inline-flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      This profile is private
                    </p>
                  ) : isLoadingPosts ? (
                    <div className="mt-3 text-sm text-gray-500">Loading posts...</div>
                  ) : postsError ? (
                    <div className="mt-3 text-sm text-red-600">{postsError}</div>
                  ) : postsData?.posts?.length ? (
                    <div className="mt-4 space-y-3">
                      {postsData.posts.map((post) => (
                        <CommunityPost key={post.id} post={post} />
                      ))}

                      <div className="flex items-center justify-between pt-1">
                        <Button
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => setPostsPage((p) => Math.max(0, p - 1))}
                          disabled={postsPage === 0 || isLoadingPosts}
                        >
                          Show previous
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => setPostsPage((p) => p + 1)}
                          disabled={!postsData.hasMore || isLoadingPosts}
                        >
                          See more
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-gray-500">No posts yet.</div>
                  )}
                </div>

                {error ? <div className="mt-6 text-sm text-red-600">{error}</div> : null}
              </CardContent>
            </Card>

              {isLoading ? <div className="mt-6 text-sm text-gray-500">Loading profile...</div> : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
