import { Prisma } from "@prisma/client"

const communityPostAuthorSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  location: true,
} satisfies Prisma.UserSelect

export const communityPostListSelect = Prisma.validator<Prisma.CommunityPostSelect>()({
  id: true,
  title: true,
  content: true,
  tags: true,
  imageUrl: true,
  mediaType: true,
  category: true,
  likedBy: true,
  location: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: communityPostAuthorSelect,
  },
  _count: {
    select: {
      comments: true,
    },
  },
})

export const communityPostDetailSelect = Prisma.validator<Prisma.CommunityPostSelect>()({
  id: true,
  title: true,
  content: true,
  tags: true,
  imageUrl: true,
  mediaType: true,
  category: true,
  likedBy: true,
  location: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: communityPostAuthorSelect,
  },
  comments: {
    select: {
      id: true,
      content: true,
      likedBy: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  },
})

export const communityPostClientSelect = communityPostDetailSelect

export type CommunityPostListRecord = Prisma.CommunityPostGetPayload<{
  select: typeof communityPostListSelect
}>

export type CommunityPostDetailRecord = Prisma.CommunityPostGetPayload<{
  select: typeof communityPostDetailSelect
}>

export type CommunityPostRecord = CommunityPostListRecord | CommunityPostDetailRecord

function hasDetailedComments(post: CommunityPostRecord): post is CommunityPostDetailRecord {
  return "comments" in post
}

function hasCommentCount(post: CommunityPostRecord): post is CommunityPostListRecord {
  return "_count" in post
}

export function mapPost(post: CommunityPostRecord, sessionUserId?: string) {
  const location = post.location ?? post.author?.location ?? null
  const hasMedia = Boolean(post.imageUrl || post.mediaType)
  const comments = hasDetailedComments(post)
    ? post.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        likes: comment.likedBy?.length ?? 0,
        likedBy: comment.likedBy ?? [],
        isLiked: sessionUserId ? comment.likedBy?.includes(sessionUserId) ?? false : false,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
          avatar: comment.author.avatarUrl ?? undefined,
        },
      }))
    : []
  const commentsCount = hasDetailedComments(post) ? comments.length : hasCommentCount(post) ? post._count.comments : 0

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    tags: post.tags ?? [],
    images: [],
    mediaUrl: undefined,
    mediaType: post.mediaType ?? undefined,
    hasMedia,
    category: post.category ?? undefined,
    likes: post.likedBy?.length ?? 0,
    likedBy: post.likedBy ?? [],
    isLiked: sessionUserId ? post.likedBy?.includes(sessionUserId) ?? false : false,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    location: location ?? undefined,
    author: {
      id: post.author.id,
      name: post.author.name,
      email: post.author.email,
      avatar: post.author.avatarUrl ?? undefined,
      location: post.author.location ?? undefined,
    },
    commentsCount,
    comments,
  }
}
