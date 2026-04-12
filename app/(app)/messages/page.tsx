"use client"

import type React from "react"

import Link from "next/link"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmojiPicker } from "@/components/emoji-picker"
import { useAuth } from "@/context/auth-context"
import { useMessaging } from "@/context/messaging-context"
import { cn, formatTimeAgo, getAvatarSrc } from "@/lib/utils"
import { ArrowLeft, Check, CheckCheck, Clock3, Compass, MessageSquare, Search, Send, UserRoundPlus } from "lucide-react"
import { toast } from "sonner"

const ONLINE_WINDOW_MS = 5 * 60 * 1000

function isOnlineStatus(participant?: { isOnline?: boolean; lastSeen?: string | Date | null }) {
  if (!participant) return false
  if (typeof participant.isOnline === "boolean") return participant.isOnline
  if (!participant.lastSeen) return false
  return new Date().getTime() - new Date(participant.lastSeen).getTime() < ONLINE_WINDOW_MS
}

function canShowPresence(participant?: { isOnline?: boolean; lastSeen?: string | Date | null }) {
  if (!participant) return false
  if (typeof participant.isOnline === "boolean") return true
  return Boolean(participant.lastSeen)
}

export default function MessagesPage() {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    sendMessage,
    messages,
    acceptConversation,
    declineConversation,
    markAsRead,
    unreadCount,
    isLoading,
    error,
  } = useMessaging()
  const { user, isAuthenticated, openAuthPage } = useAuth()
  const router = useRouter()
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const goToUser = (targetUserId: string) => {
    router.push(user?.id === targetUserId ? "/account" : `/profile/${targetUserId}`)
  }

  const scrollToBottom = () => {
    const target = messagesEndRef.current
    if (!target) return
    try {
      target.scrollIntoView({ behavior: "smooth", block: "end" })
    } catch {
      try {
        target.scrollIntoView(false)
      } catch {
        // no-op
      }
    }
  }

  const conversationMessages = useMemo(() => {
    if (!activeConversation || !messages) return []

    return messages
      .filter((message) => message.conversationId === activeConversation.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [activeConversation, messages])

  useEffect(() => {
    scrollToBottom()
  }, [conversationMessages.length])

  useEffect(() => {
    if (!activeConversation?.id) return
    void markAsRead(activeConversation.id)
  }, [activeConversation?.id, markAsRead])

  const filteredConversations = useMemo(() => {
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase()
    if (!normalizedSearch) return conversations

    return conversations.filter((conversation) =>
      conversation.participants.some((participant) => participant.name.toLowerCase().includes(normalizedSearch)),
    )
  }, [conversations, deferredSearchQuery])

  const pendingConversations = useMemo(
    () => conversations.filter((conversation) => (conversation.status ?? "ACCEPTED") === "PENDING"),
    [conversations],
  )
  const acceptedConversations = useMemo(
    () => conversations.filter((conversation) => (conversation.status ?? "ACCEPTED") === "ACCEPTED"),
    [conversations],
  )

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md border-[#eadfff] shadow-[0_22px_50px_rgba(76,53,160,0.08)]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ecff] text-[#5b34d6]">
              <MessageSquare className="h-7 w-7" />
            </div>
            <CardTitle>Sign in to keep conversations moving</CardTitle>
            <p className="text-gray-600">Connect with organisers and community members without losing the context of your plans.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => openAuthPage("login")} className="w-full rounded-full bg-[#5b34d6] hover:bg-[#4a27bf]">
              Log in
            </Button>
            <Button onClick={() => openAuthPage("signup")} variant="outline" className="w-full rounded-full">
              Create account
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConversation) return

    try {
      await sendMessage(activeConversation.id, newMessage.trim())
      setNewMessage("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message."
      toast.error(message)
    }
  }

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current
    if (!el) {
      setNewMessage((prev) => prev + emoji)
      return
    }

    const start = el.selectionStart ?? newMessage.length
    const end = el.selectionEnd ?? newMessage.length
    const next = newMessage.slice(0, start) + emoji + newMessage.slice(end)
    setNewMessage(next)

    const run = () => {
      try {
        el.focus()
        const cursor = start + emoji.length
        el.setSelectionRange(cursor, cursor)
      } catch {
        // iOS WebView can reject programmatic selection in some states
      }
    }
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(run)
    } else {
      run()
    }
  }

  const renderStatus = (message: typeof conversationMessages[number]) => {
    const isOwnMessage = message.senderId === user?.id
    if (!isOwnMessage) return null
    if (message.readAt) {
      return <CheckCheck className="h-4 w-4 text-blue-600" />
    }
    if (message.deliveredAt) {
      return <CheckCheck className="h-4 w-4 text-gray-400" />
    }
    return <Check className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#fcfaff_0%,#f5f7fb_100%)]">
      <div className="flex w-full flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex h-full min-h-0 overflow-hidden rounded-[28px] border border-[#ece4ff] bg-white shadow-[0_24px_60px_rgba(76,53,160,0.08)]">
          <div className={`flex w-full flex-col border-r border-[#eee7ff] md:w-[24rem] ${activeConversation ? "hidden md:flex" : "flex"}`}>
            <div className="border-b border-[#eee7ff] bg-[linear-gradient(135deg,#fff_0%,#faf6ff_58%,#f1f7ff_100%)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold text-[#1f1538]">Messages</h1>
                  <p className="mt-1 text-sm leading-6 text-[#62597f]">
                    Keep organiser replies, community chats, and plan details in one calm thread.
                  </p>
                </div>
                <Badge className="rounded-full bg-[#5b34d6] px-3 py-1 hover:bg-[#5b34d6]">
                  {unreadCount} unread
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoTile label="Active chats" value={acceptedConversations.length} />
                <InfoTile label="Requests" value={pendingConversations.length} />
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-full border-[#e4dafc] pl-10"
                />
              </div>

              {error ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
              ) : null}
            </div>

            <ScrollArea className="min-h-0 flex-1 hide-scrollbar">
              <div className="space-y-2 p-3">
                {isLoading && conversations.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#ddd1ff] px-4 py-12 text-center text-sm text-[#6b628d]">
                    Loading conversations...
                  </div>
                ) : filteredConversations.length === 0 && deferredSearchQuery.trim() ? (
                  <div className="rounded-[22px] border border-dashed border-[#ddd1ff] px-4 py-10 text-center">
                    <Search className="mx-auto h-10 w-10 text-[#b0a6d5]" />
                    <h2 className="mt-4 text-base font-semibold text-[#24183d]">No matches for that search</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6d648e]">Try a participant name instead, or clear the search to bring back every active conversation.</p>
                    <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-5 rounded-full border-[#d9cdfd]">
                      Clear search
                    </Button>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#ddd1ff] px-4 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f3ecff] text-[#5b34d6]">
                      <UserRoundPlus className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-[#24183d]">No conversations yet</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6d648e]">
                      Start from an event or profile and VIAO will keep the conversation tied to the person and plan behind it.
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      <Button asChild className="rounded-full bg-[#5b34d6] hover:bg-[#4a27bf]">
                        <Link href="/discover">Discover events</Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-full border-[#d9cdfd]">
                        <Link href="/my-events">View your plans</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const otherParticipant = conversation.participants.find((participant) => participant.id !== user?.id)
                    const lastMessage = conversation.lastMessage
                    const status = conversation.status ?? "ACCEPTED"

                    return (
                      <div
                        key={conversation.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveConversation(conversation)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            setActiveConversation(conversation)
                          }
                        }}
                        className={cn(
                          "w-full rounded-[22px] border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(76,53,160,0.08)] focus:outline-none focus:ring-2 focus:ring-[#bfaeff]",
                          activeConversation?.id === conversation.id
                            ? "border-[#d4c5ff] bg-[#f7f2ff]"
                            : "border-transparent bg-white hover:border-[#ece4ff]",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            {otherParticipant?.id ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  goToUser(otherParticipant.id)
                                }}
                                className="block"
                              >
                                <Avatar className="h-11 w-11 cursor-pointer ring-1 ring-[#ece4ff]">
                                  <AvatarImage src={getAvatarSrc(otherParticipant?.name, otherParticipant?.avatar)} />
                                  <AvatarFallback>{(otherParticipant?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                              </button>
                            ) : (
                              <Avatar className="h-11 w-11 ring-1 ring-[#ece4ff]">
                                <AvatarImage src={getAvatarSrc(otherParticipant?.name, otherParticipant?.avatar)} />
                                <AvatarFallback>{(otherParticipant?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            )}
                            {isOnlineStatus(otherParticipant) ? (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                {otherParticipant?.id ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      goToUser(otherParticipant.id)
                                    }}
                                    className="truncate font-medium text-[#24183d] hover:text-[#4e35cc]"
                                  >
                                    {otherParticipant?.name}
                                  </button>
                                ) : (
                                  <p className="truncate font-medium text-[#24183d]">{otherParticipant?.name}</p>
                                )}
                                <p className="mt-1 truncate text-sm text-[#6c638c]">
                                  {lastMessage ? `${lastMessage.senderId === user?.id ? "You: " : ""}${lastMessage.content}` : "Conversation started"}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <span className="text-xs text-[#8a80ac]">
                                  {lastMessage?.timestamp ? formatTimeAgo(lastMessage.timestamp) : conversation.updatedAt ? formatTimeAgo(conversation.updatedAt) : ""}
                                </span>
                                {status === "PENDING" ? (
                                  <Badge variant="secondary" className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">
                                    Request
                                  </Badge>
                                ) : null}
                                {conversation.unreadCount > 0 ? (
                                  <Badge className="rounded-full bg-[#5b34d6] hover:bg-[#5b34d6]">{conversation.unreadCount}</Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className={`min-h-0 flex-1 flex-col ${activeConversation ? "flex" : "hidden md:flex"}`}>
            {activeConversation ? (
              <>
                <div className="border-b border-[#eee7ff] bg-white/90 px-4 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full md:hidden"
                        aria-label="Back to conversations"
                        onClick={() => setActiveConversation(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      {(() => {
                        const otherParticipant = activeConversation.participants.find((participant) => participant.id !== user?.id)
                        const status = activeConversation.status ?? "ACCEPTED"

                        return (
                          <>
                            {otherParticipant?.id ? (
                              <button type="button" className="shrink-0" onClick={() => goToUser(otherParticipant.id)}>
                                <Avatar className="h-11 w-11 cursor-pointer ring-1 ring-[#ece4ff]">
                                  <AvatarImage src={getAvatarSrc(otherParticipant?.name, otherParticipant?.avatar)} />
                                  <AvatarFallback>{(otherParticipant?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                              </button>
                            ) : (
                              <Avatar className="h-11 w-11 ring-1 ring-[#ece4ff]">
                                <AvatarImage src={getAvatarSrc(otherParticipant?.name, otherParticipant?.avatar)} />
                                <AvatarFallback>{(otherParticipant?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {otherParticipant?.id ? (
                                  <button
                                    type="button"
                                    onClick={() => goToUser(otherParticipant.id)}
                                    className="font-semibold text-[#24183d] hover:text-[#4e35cc]"
                                  >
                                    {otherParticipant?.name}
                                  </button>
                                ) : (
                                  <h2 className="font-semibold text-[#24183d]">{otherParticipant?.name}</h2>
                                )}
                                {status === "PENDING" ? (
                                  <Badge variant="secondary" className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">
                                    Request pending
                                  </Badge>
                                ) : null}
                                {status === "DECLINED" ? (
                                  <Badge variant="secondary" className="rounded-full bg-red-100 text-red-700 hover:bg-red-100">
                                    Closed
                                  </Badge>
                                ) : null}
                              </div>
                              {canShowPresence(otherParticipant) ? (
                                <p className="mt-1 text-sm">
                                  {isOnlineStatus(otherParticipant) ? (
                                    <span className="text-green-600">Online now</span>
                                  ) : (
                                    <span className="text-[#7a6f9e]">
                                      {otherParticipant?.lastSeen ? `Last seen ${formatTimeAgo(otherParticipant.lastSeen)}` : "Recently active"}
                                    </span>
                                  )}
                                </p>
                              ) : (
                                <p className="mt-1 text-sm text-[#7a6f9e]">Messages stay tied to the plans and people you interact with in VIAO.</p>
                              )}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {(activeConversation.status ?? "ACCEPTED") === "PENDING" ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {activeConversation.requestedBy === user?.id
                        ? "Request sent. You can read the thread, but they need to accept before the conversation becomes active."
                        : "This user wants to chat. Accept the request to start messaging normally."}
                    </div>
                  ) : null}
                  {(activeConversation.status ?? "ACCEPTED") === "DECLINED" ? (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      This conversation was declined and can no longer receive new messages.
                    </div>
                  ) : null}
                </div>

                <ScrollArea className="min-h-0 flex-1 px-4 py-3 sm:px-6 hide-scrollbar">
                  <div className="flex min-h-full flex-col justify-end space-y-4 pb-6">
                    {conversationMessages.map((message) => {
                      const isOwnMessage = message.senderId === user?.id
                      const sender = activeConversation.participants.find((participant) => participant.id === message.senderId)

                      return (
                        <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                          <div className={`flex max-w-xs gap-2 sm:max-w-md lg:max-w-lg ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                            {!isOwnMessage ? (
                              sender?.id ? (
                                <button type="button" className="shrink-0" onClick={() => goToUser(sender.id)}>
                                  <Avatar className="h-8 w-8 cursor-pointer">
                                    <AvatarImage src={getAvatarSrc(sender?.name, sender?.avatar)} />
                                    <AvatarFallback className="text-xs">{(sender?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                </button>
                              ) : (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={getAvatarSrc(sender?.name, sender?.avatar)} />
                                  <AvatarFallback className="text-xs">{(sender?.name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                              )
                            ) : null}

                            <div
                              className={cn(
                                "rounded-3xl px-4 py-3 shadow-sm",
                                isOwnMessage ? "bg-[#5b34d6] text-white" : "border border-[#ece4ff] bg-white text-[#24183d]",
                              )}
                            >
                              <p className="text-sm leading-6">{message.content}</p>
                              <div className="mt-2 flex items-center justify-end gap-1 text-xs">
                                <span className={isOwnMessage ? "text-purple-200" : "text-[#8a80ac]"}>{formatTimeAgo(message.timestamp)}</span>
                                {renderStatus(message)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="border-t border-[#eee7ff] bg-white p-4 sm:p-5">
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                    <div className="flex-1 rounded-[22px] border border-[#e4dafc] bg-[#fcfbff] p-2 focus-within:border-[#bfaeff]">
                      <div className="flex items-center gap-2">
                        <Input
                          ref={inputRef}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={
                            (activeConversation.status ?? "ACCEPTED") === "DECLINED"
                              ? "Conversation declined"
                              : (activeConversation.status ?? "ACCEPTED") === "PENDING"
                                ? "Wait for acceptance before sending"
                                : "Type a message..."
                          }
                          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                          disabled={(activeConversation.status ?? "ACCEPTED") !== "ACCEPTED"}
                        />
                        <EmojiPicker disabled={(activeConversation.status ?? "ACCEPTED") !== "ACCEPTED"} onSelect={insertEmoji} />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || (activeConversation.status ?? "ACCEPTED") !== "ACCEPTED"}
                      className="h-11 rounded-full bg-[#5b34d6] px-5 hover:bg-[#4a27bf]"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>

                  {(activeConversation.status ?? "ACCEPTED") === "PENDING" && activeConversation.requestedBy !== user?.id ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => acceptConversation(activeConversation.id)} className="rounded-full bg-[#5b34d6] hover:bg-[#4a27bf]">
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => declineConversation(activeConversation.id)} className="rounded-full">
                        Decline
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,#faf6ff_0%,#ffffff_52%,#f5f7fb_100%)] p-6">
                <Card className="w-full max-w-xl rounded-[28px] border-[#ece4ff] shadow-[0_24px_60px_rgba(76,53,160,0.08)]">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ecff] text-[#5b34d6]">
                      <MessageSquare className="h-7 w-7" />
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold text-[#24183d]">Keep the momentum going</h2>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6d648e]">
                      Stay close to organisers and people you actually want to meet, then reply before the opportunity goes cold.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <EmptyPanelStat label="Unread" value={unreadCount} />
                      <EmptyPanelStat label="Pending requests" value={pendingConversations.length} />
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <Button asChild className="rounded-full bg-[#5b34d6] hover:bg-[#4a27bf]">
                        <Link href="/discover">
                          <Compass className="mr-2 h-4 w-4" />
                          Discover events
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-full border-[#d9cdfd]">
                        <Link href="/account">
                          <Clock3 className="mr-2 h-4 w-4" />
                          Update your profile
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-white/80 bg-white/80 p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-[#8a7eb6]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#24183d]">{value}</div>
    </div>
  )
}

function EmptyPanelStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-[#ece4ff] bg-[#faf7ff] p-4 text-left">
      <div className="text-xs uppercase tracking-[0.18em] text-[#8a7eb6]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#24183d]">{value}</div>
    </div>
  )
}
