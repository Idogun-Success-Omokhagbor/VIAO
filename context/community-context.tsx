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
    avatarUrl?: string | null
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
    avatarUrl?: string | null
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
  hasMedia?: boolean
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
      const data = await handleJson<{ posts: Post[] }>(fetch("/api/community/posts", { cache: "no-store", credentials: "include" }))
      setPosts(data.posts)
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
      const res = await handleJson<{ post: Post }>(
        fetch("/api/community/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(postData),
        }),
      )
      setPosts((prev) => [res.post, ...prev])
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
      const res = await handleJson<{ post: Post }>(
        fetch(`/api/community/posts/${postId}/like`, {
          method: isLiked ? "DELETE" : "POST",
          credentials: "include",
        }),
      )
      const mapped = res.post
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
      const res = await handleJson<{ post: Post }>(
        fetch(`/api/community/posts/${postId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        }),
      )
      const mapped = res.post
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
      const res = await handleJson<{ post: Post }>(
        fetch(`/api/community/posts/${postId}/comments/${commentId}/like`, {
          method: isLiked ? "DELETE" : "POST",
          credentials: "include",
        }),
      )
      const mapped = res.post
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
      const res = await handleJson<{ post: Post }>(
        fetch(`/api/community/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        }),
      )
      const mapped = res.post
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
