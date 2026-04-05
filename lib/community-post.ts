import { Prisma } from "@prisma/client"

export const communityPostClientSelect = Prisma.validator<Prisma.CommunityPostSelect>()({
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
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      location: true,
    },
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

export type CommunityPostWithRelations = Prisma.CommunityPostGetPayload<{
  select: typeof communityPostClientSelect
}>

export async function mapPost(post: CommunityPostWithRelations, sessionUserId?: string) {
  const location = post.location ?? post.author?.location ?? null

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    tags: post.tags ?? [],
    images: post.imageUrl ? [post.imageUrl] : [],
    mediaUrl: post.imageUrl ?? undefined,
    mediaType: post.mediaType ?? undefined,
    hasMedia: Boolean(post.mediaType),
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
    comments:
      post.comments?.map((comment) => ({
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
      })) ?? [],
  }
}
