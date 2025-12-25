export interface CommunityPost {
  id: string
  title: string
  content: string
  author: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
  images?: string[]
  tags?: string[]
  likes: number
  likedBy: string[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
  isLiked?: boolean
  location?: string
  category?: string
}

export interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
  postId: string
  createdAt: string
  likes: number
  likedBy: string[]
  isLiked?: boolean
  replies?: Comment[]
}

export interface CommunityUser {
  id: string
  name: string
  avatar?: string
  bio?: string
  location?: string
  joinedAt: Date
  postsCount: number
  followersCount: number
  followingCount: number
  isFollowing?: boolean
}

export interface CreatePostData {
  content: string
  images?: string[]
  tags?: string[]
}

export interface CreateCommentData {
  content: string
  postId: string
}

export interface CommunityStats {
  totalPosts: number
  totalUsers: number
  totalComments: number
  activeUsers: number
}

export interface CommunityContextType {
  posts: CommunityPost[]
  loading: boolean
  createPost: (post: CreatePostData) => Promise<void>
  likePost: (postId: string) => Promise<void>
  addComment: (commentData: CreateCommentData) => Promise<void>
  likeComment: (postId: string, commentId: string) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  editPost: (postId: string, content: string, tags: string[]) => Promise<void>
}
