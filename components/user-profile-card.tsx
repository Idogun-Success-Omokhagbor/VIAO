"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Users } from "lucide-react"
import { getAvatarSrc } from "@/lib/utils"

interface UserProfileCardProps {
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string
    avatar?: string
    bio?: string
    location?: string
    interests?: string[]
    eventsCreated?: number
    eventsAttended?: number
  }
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const avatarSrc = getAvatarSrc(user.name, user.avatarUrl ?? user.avatar)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarSrc} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold">{user.name}</h3>
            {user.bio && <p className="text-sm text-muted-foreground">{user.bio}</p>}
            {user.location && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                {user.location}
              </div>
            )}
            <div className="flex space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {user.eventsCreated || 0} events created
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {user.eventsAttended || 0} events attended
              </div>
            </div>
            {user.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {user.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
