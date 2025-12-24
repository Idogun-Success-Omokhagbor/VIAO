"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Comment {
  id: string
  content: string
  author: string
  authorId: string
  authorAvatar?: string
  timestamp: string
  likes: number
  isLiked: boolean
}

interface CommunityPost {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  authorAvatar?: string
  timestamp: string
  type: string
  likes: number
  isLiked: boolean
  tags?: string[]
  image?: string
  comments?: Comment[]
}

interface CommunityContextType {
  posts: CommunityPost[]
  addPost: (post: Omit<CommunityPost, "id" | "timestamp" | "likes" | "isLiked" | "comments">) => void
  likePost: (postId: string) => void
  likeComment: (postId: string, commentId: string) => void
  addComment: (postId: string, content: string) => Promise<void>
  deleteComment: (postId: string, commentId: string) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  updatePost: (postId: string, updates: Partial<CommunityPost>) => void
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined)

const samplePosts: CommunityPost[] = [
  {
    id: "post1",
    title: "Great coffee shop discovery!",
    content:
      "Just found this amazing little coffee shop on Main Street. The barista makes incredible latte art and they have the best pastries in town. Highly recommend checking it out!",
    author: "Sarah Chen",
    authorId: "user1",
    authorAvatar: "/placeholder.svg?height=40&width=40&text=SC",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    type: "general",
    likes: 12,
    isLiked: false,
    tags: ["coffee", "food", "recommendation"],
    image: "/placeholder.svg?height=300&width=400&text=Coffee+Shop",
    comments: [
      {
        id: "comment1",
        content: "I love that place! Their cappuccino is amazing too.",
        author: "Mike Johnson",
        authorId: "user2",
        authorAvatar: "/placeholder.svg?height=32&width=32&text=MJ",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        likes: 3,
        isLiked: false,
      },
      {
        id: "comment2",
        content: "Thanks for the recommendation! I'll definitely check it out this weekend.",
        author: "Emma Wilson",
        authorId: "user3",
        authorAvatar: "/placeholder.svg?height=32&width=32&text=EW",
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        likes: 1,
        isLiked: true,
      },
    ],
  },
  {
    id: "post2",
    title: "Community Garden Volunteer Day",
    content:
      "We're organizing a volunteer day at the community garden this Saturday from 9 AM to 2 PM. Come help us plant new vegetables and flowers for the spring season. All skill levels welcome!",
    author: "Mike Johnson",
    authorId: "user2",
    authorAvatar: "/placeholder.svg?height=40&width=40&text=MJ",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    type: "event",
    likes: 8,
    isLiked: true,
    tags: ["volunteer", "gardening", "community"],
    comments: [
      {
        id: "comment3",
        content: "Count me in! I'll bring some gardening tools.",
        author: "Sarah Chen",
        authorId: "user1",
        authorAvatar: "/placeholder.svg?height=32&width=32&text=SC",
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        likes: 2,
        isLiked: false,
      },
    ],
  },
  {
    id: "post3",
    title: "Lost cat - please help!",
    content:
      "My orange tabby cat 'Whiskers' went missing yesterday evening near Oak Park. He's very friendly and responds to his name. Please contact me if you see him. Thank you!",
    author: "Emma Wilson",
    authorId: "user3",
    authorAvatar: "/placeholder.svg?height=40&width=40&text=EW",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    type: "general",
    likes: 15,
    isLiked: false,
    tags: ["lost-pet", "help", "urgent"],
    image: "/placeholder.svg?height=300&width=400&text=Orange+Cat",
    comments: [
      {
        id: "comment4",
        content: "I'll keep an eye out during my morning walks. Hope you find Whiskers soon!",
        author: "Mike Johnson",
        authorId: "user2",
        authorAvatar: "/placeholder.svg?height=32&width=32&text=MJ",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        likes: 4,
        isLiked: true,
      },
      {
        id: "comment5",
        content: "I shared this on my social media. Sending positive thoughts! 🙏",
        author: "Sarah Chen",
        authorId: "user1",
        authorAvatar: "/placeholder.svg?height=32&width=32&text=SC",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        likes: 2,
        isLiked: false,
      },
    ],
  },
]

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<CommunityPost[]>(samplePosts)

  const addPost = (newPost: Omit<CommunityPost, "id" | "timestamp" | "likes" | "isLiked" | "comments">) => {
    const post: CommunityPost = {
      ...newPost,
      id: `post_${Date.now()}`,
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      comments: [],
    }
    setPosts((prev) => [post, ...prev])
  }

  const likePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
              isLiked: !post.isLiked,
            }
          : post,
      ),
    )
  }

  const likeComment = (postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: post.comments?.map((comment) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
                      isLiked: !comment.isLiked,
                    }
                  : comment,
              ),
            }
          : post,
      ),
    )
  }

  const addComment = async (postId: string, content: string): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      content,
      author: "Current User",
      authorId: "currentUser",
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false,
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [...(post.comments || []), newComment],
            }
          : post,
      ),
    )
  }

  const deleteComment = async (postId: string, commentId: string): Promise<void> => {
    // Simulate API delay for realistic user experience
    await new Promise((resolve) => setTimeout(resolve, 800))

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: post.comments?.filter((comment) => comment.id !== commentId) || [],
            }
          : post,
      ),
    )
  }

  const deletePost = async (postId: string): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setPosts((prev) => prev.filter((post) => post.id !== postId))
  }

  const updatePost = (postId: string, updates: Partial<CommunityPost>) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...updates } : post)))
  }

  return (
    <CommunityContext.Provider
      value={{
        posts,
        addPost,
        likePost,
        likeComment,
        addComment,
        deleteComment,
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
