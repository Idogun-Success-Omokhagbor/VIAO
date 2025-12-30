"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

export interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    email?: string
    avatar?: string
  }
  createdAt: string
  likes: number
  likedBy: string[]
  isLiked?: boolean
}

export interface Post {
  id: string
  title: string
  content: string
  author: {
    id: string
    name: string
    email?: string
    avatar?: string
    location?: string
  }
  createdAt: string
  updatedAt: string
  type?: string
  tags: string[]
  images: string[]
  imageUrl?: string
  mediaUrl?: string
  mediaType?: string
  likes: number
  likedBy: string[]
  isLiked?: boolean
  location?: string
  category?: string
  comments: Comment[]
}

interface CommunityContextType {
  posts: Post[]
  isLoading: boolean
  error: string | null
  refreshPosts: () => Promise<void>
  createPost: (post: {
    title: string
    content: string
    tags?: string[]
    imageUrl?: string
    mediaType?: string
    type?: string
    category?: string
  }) => Promise<void>
  likePost: (postId: string, isLiked: boolean) => Promise<void>
  addComment: (postId: string, content: string) => Promise<void>
  likeComment: (postId: string, commentId: string, isLiked: boolean) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  updatePost: (postId: string, updates: Partial<Post>) => Promise<void>
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined)

function mapPost(data: any): Post {
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    author: {
      id: data.author?.id ?? "",
      name: data.author?.name ?? "Unknown",
      email: data.author?.email,
      avatar: data.author?.avatar ?? data.author?.avatarUrl ?? undefined,
      location: data.author?.location ?? undefined,
    },
    createdAt: typeof data.createdAt === "string" ? data.createdAt : data.createdAt?.toString() ?? new Date().toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : data.updatedAt?.toString() ?? new Date().toISOString(),
    type: data.type,
    tags: data.tags ?? [],
    images: data.images ?? (data.imageUrl ? [data.imageUrl] : []),
    mediaUrl: data.mediaUrl ?? data.imageUrl ?? undefined,
    mediaType: data.mediaType ?? undefined,
    likes: data.likes ?? data.likedBy?.length ?? 0,
    likedBy: data.likedBy ?? [],
    isLiked: data.isLiked ?? false,
    location: data.location ?? data.author?.location ?? undefined,
    category: data.category,
    comments:
      data.comments?.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author?.id ?? "",
          name: comment.author?.name ?? "Unknown",
          email: comment.author?.email,
          avatar: comment.author?.avatar ?? comment.author?.avatarUrl ?? undefined,
        },
        createdAt:
          typeof comment.createdAt === "string" ? comment.createdAt : comment.createdAt?.toString() ?? new Date().toISOString(),
        likes: comment.likes ?? comment.likedBy?.length ?? 0,
        likedBy: comment.likedBy ?? [],
        isLiked: comment.isLiked ?? false,
      })) ?? [],
  }
}

async function handleJson<T>(resPromise: Promise<Response> | Response): Promise<T> {
  const res = await resPromise
  if (!res.ok) {
    let message = "Request failed"
    try {
      const data = await res.json()
      message = data.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshPosts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await handleJson<{ posts: any[] }>(fetch("/api/community/posts", { cache: "no-store", credentials: "include" }))
      setPosts(data.posts.map(mapPost))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load posts"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshPosts()
  }, [refreshPosts])

  const createPost = async (post: {
    title: string
    content: string
    tags?: string[]
    imageUrl?: string
    type?: string
    category?: string
    mediaType?: string
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      const postData = post
      const res = await handleJson<{ post: any }>(
        fetch("/api/community/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(postData),
        }),
      )
      setPosts((prev) => [mapPost(res.post), ...prev])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create post"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const likePost = async (postId: string, isLiked: boolean) => {
    try {
      const res = await handleJson<{ post: any }>(
        fetch(`/api/community/posts/${postId}/like`, {
          method: isLiked ? "DELETE" : "POST",
          credentials: "include",
        }),
      )
      const mapped = mapPost(res.post)
      setPosts((prev) => {
        const exists = prev.some((p) => p.id === postId)
        if (!exists) return [mapped, ...prev]
        return prev.map((p) => (p.id === postId ? mapped : p))
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to like post"
      setError(message)
      throw err
    }
  }

  const addComment = async (postId: string, content: string) => {
    try {
      const res = await handleJson<{ post: any }>(
        fetch(`/api/community/posts/${postId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        }),
      )
      const mapped = mapPost(res.post)
      setPosts((prev) => {
        const exists = prev.some((p) => p.id === postId)
        if (!exists) return [mapped, ...prev]
        return prev.map((p) => (p.id === postId ? mapped : p))
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add comment"
      setError(message)
      throw err
    }
  }

  const likeComment = async (postId: string, commentId: string, isLiked: boolean) => {
    try {
      const res = await handleJson<{ post: any }>(
        fetch(`/api/community/posts/${postId}/comments/${commentId}/like`, {
          method: isLiked ? "DELETE" : "POST",
          credentials: "include",
        }),
      )
      const mapped = mapPost(res.post)
      setPosts((prev) => {
        const exists = prev.some((p) => p.id === postId)
        if (!exists) return [mapped, ...prev]
        return prev.map((p) => (p.id === postId ? mapped : p))
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to like comment"
      setError(message)
      throw err
    }
  }

  const deletePost = async (postId: string) => {
    try {
      await handleJson(fetch(`/api/community/posts/${postId}`, { method: "DELETE", credentials: "include" }))
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete post"
      setError(message)
      throw err
    }
  }

  const updatePost = async (postId: string, updates: Partial<Post>) => {
    try {
      const res = await handleJson<{ post: any }>(
        fetch(`/api/community/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        }),
      )
      const mapped = mapPost(res.post)
      setPosts((prev) => {
        const exists = prev.some((p) => p.id === postId)
        if (!exists) return [mapped, ...prev]
        return prev.map((p) => (p.id === postId ? mapped : p))
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update post"
      setError(message)
      throw err
    }
  }

  return (
    <CommunityContext.Provider
      value={{
        posts,
        isLoading,
        error,
        refreshPosts,
        createPost,
        likePost,
        addComment,
        likeComment,
        deletePost,
        updatePost,
      }}
    >
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (!context) {
    throw new Error("useCommunity must be used within a CommunityProvider")
  }
  return context
}
