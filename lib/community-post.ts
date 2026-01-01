export async function mapPost(post: any, sessionUserId?: string) {
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
      post.comments?.map((comment: any) => ({
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
