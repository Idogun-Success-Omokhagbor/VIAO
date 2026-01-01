"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, MapPin, Calendar, Eye, EyeOff, Lock, Camera, Save, Trash2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getAvatarSrc } from "@/lib/utils"
import { ConfirmDialog } from "@/components/confirm-dialog"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function AccountPage() {
  const router = useRouter()
  const { user, updateUser, isAuthenticated, showAuthModal, refresh } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isConfiguringPush, setIsConfiguringPush] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
  })

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false)

  const [sessions, setSessions] = useState<
    Array<{
      id: string
      userAgent: string | null
      ip: string | null
      lastSeenAt: string | null
      createdAt: string
      updatedAt: string
      expiresAt: string
    }>
  >([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isRevokingOtherSessions, setIsRevokingOtherSessions] = useState(false)

  const fetchSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const res = await fetch("/api/account/sessions", { credentials: "include" })
      const json = await res.json().catch(() => null)
      if (!res.ok) return
      setCurrentSessionId(json?.currentSessionId ?? null)
      setSessions(Array.isArray(json?.sessions) ? json.sessions : [])
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const handleSignOutOtherSessions = async () => {
    setIsRevokingOtherSessions(true)
    try {
      const res = await fetch("/api/account/sessions", { method: "POST", credentials: "include" })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.error || "Failed to sign out other sessions")
      }
      toast({ title: "Signed out", description: "All other sessions have been signed out." })
      await fetchSessions()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign out other sessions"
      toast({ title: "Error", description: message })
    } finally {
      setIsRevokingOtherSessions(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    void fetchSessions()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <User className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <CardTitle>Sign in to view your account</CardTitle>
            <CardDescription>Access your profile and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => showAuthModal("login")} className="w-full">
              Log In
            </Button>
            <Button onClick={() => showAuthModal("signup")} variant="outline" className="w-full">
              Sign Up
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSave = () => {
    updateUser(formData)
    setIsEditing(false)
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    })
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
    })
    setIsEditing(false)
  }

  const handleAvatarUpload = async (file: File) => {
    if (!file.type?.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file." })
      return
    }

    const MAX_AVATAR_BYTES = 2 * 1024 * 1024
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: "Image too large", description: "Please choose an image under 2MB." })
      return
    }

    setIsUploadingAvatar(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" })
      if (!res.ok) {
        throw new Error("Upload failed")
      }
      const data = await res.json()
      await updateUser({ avatarUrl: data.url })
      toast({ title: "Profile photo updated" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar"
      toast({ title: "Error", description: message })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handlePreferenceChange = (key: string, value: boolean) => {
    if (user) {
      updateUser({
        preferences: {
          ...user.preferences,
          [key]: value,
        },
      })
      toast({
        title: "Preference updated",
        description: "Your notification preference has been updated.",
      })
    }
  }

  const setPreference = async (key: string, value: boolean) => {
    if (!user) return
    await updateUser({
      preferences: {
        ...user.preferences,
        [key]: value,
      },
    })
  }

  const enablePushNotifications = async () => {
    if (typeof window === "undefined") throw new Error("Not available")
    if (!("serviceWorker" in navigator)) throw new Error("Service workers are not supported")
    if (!("PushManager" in window)) throw new Error("Push notifications are not supported")

    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      throw new Error("Notification permission denied")
    }

    const registration = await navigator.serviceWorker.register("/sw.js")
    await navigator.serviceWorker.ready

    const keyRes = await fetch("/api/push/vapid-public-key", { credentials: "include" })
    const keyJson = await keyRes.json().catch(() => null)
    if (!keyRes.ok || !keyJson?.publicKey) throw new Error(keyJson?.error || "Missing VAPID public key")

    const applicationServerKey = urlBase64ToUint8Array(String(keyJson.publicKey))

    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }))

    const saveRes = await fetch("/api/push/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(subscription.toJSON()),
    })

    if (!saveRes.ok) {
      const data = await saveRes.json().catch(() => null)
      throw new Error(data?.error || "Failed to save push subscription")
    }
  }

  const disablePushNotifications = async () => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    await subscription?.unsubscribe().catch(() => null)

    await fetch("/api/push/subscription", { method: "DELETE", credentials: "include" }).catch(() => null)
  }

  const handlePushToggle = async (checked: boolean) => {
    if (!user) return
    setIsConfiguringPush(true)
    try {
      if (checked) {
        await enablePushNotifications()
        await setPreference("pushNotifications", true)
        toast({ title: "Push enabled", description: "Browser push notifications are enabled." })
      } else {
        await disablePushNotifications()
        await setPreference("pushNotifications", false)
        toast({ title: "Push disabled", description: "Browser push notifications are disabled." })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update push notifications"
      await setPreference("pushNotifications", false)
      toast({ title: "Push error", description: message })
    } finally {
      setIsConfiguringPush(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({ title: "Missing fields", description: "Please fill all password fields." })
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", description: "Please confirm your new password." })
      return
    }

    setIsUpdatingPassword(true)
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update password")
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
      toast({ title: "Password updated", description: "Your password has been changed successfully." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update password"
      toast({ title: "Error", description: message })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      const res = await fetch("/api/account", { method: "DELETE", credentials: "include" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete account")
      }

      setIsDeleteAccountDialogOpen(false)
      toast({ title: "Account deleted", description: "Your account has been deleted." })
      await refresh()
      router.replace("/")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account"
      toast({ title: "Error", description: message })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="h-full min-h-0 bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <ConfirmDialog
            open={isDeleteAccountDialogOpen}
            onOpenChange={(open) => {
              if (isDeletingAccount) return
              setIsDeleteAccountDialogOpen(open)
            }}
            title="Delete account"
            description="This will permanently delete your account and all your data. This action cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            tone="danger"
            loading={isDeletingAccount}
            onConfirm={() => {
              void (async () => {
                await handleDeleteAccount()
              })()
            }}
          />
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={getAvatarSrc(user?.name, user?.avatarUrl)} alt={user?.name} />
                    <AvatarFallback className="text-lg">
                      {(user?.name || "U").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-transparent"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      e.currentTarget.value = ""
                      if (file) {
                        void handleAvatarUpload(file)
                      }
                    }}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(user?.createdAt || "").toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "outline" : "default"}>
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and profile details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          disabled={!isEditing}
                          className="pl-10"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input id="location" value={user?.location || "Not set"} disabled className="pl-10" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>

                  {isEditing && (
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose what notifications you want to receive.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={!!(user?.preferences as any)?.emailNotifications}
                        onCheckedChange={(checked) => handlePreferenceChange("emailNotifications", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Push Notifications</Label>
                        <p className="text-sm text-gray-600">Receive push notifications in your browser</p>
                      </div>
                      <Switch
                        checked={!!(user?.preferences as any)?.pushNotifications}
                        disabled={isConfiguringPush}
                        onCheckedChange={(checked) => void handlePushToggle(checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Event Reminders</Label>
                        <p className="text-sm text-gray-600">Get reminded about upcoming events</p>
                      </div>
                      <Switch
                        checked={!!(user?.preferences as any)?.eventReminders}
                        onCheckedChange={(checked) => handlePreferenceChange("eventReminders", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Community Updates</Label>
                        <p className="text-sm text-gray-600">Stay updated with community posts and discussions</p>
                      </div>
                      <Switch
                        checked={(user?.preferences as any)?.communityUpdates ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange("communityUpdates", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Message Notifications</Label>
                        <p className="text-sm text-gray-600">Get notified when you receive new messages</p>
                      </div>
                      <Switch
                        checked={(user?.preferences as any)?.messageNotifications ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange("messageNotifications", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control your privacy and data sharing preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Profile Visibility</Label>
                        <p className="text-sm text-gray-600">Make your profile visible to other users</p>
                      </div>
                      <Switch
                        checked={(user?.preferences as any)?.profileVisibility ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange("profileVisibility", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Show Online Status</Label>
                        <p className="text-sm text-gray-600">Let others see when you're online</p>
                      </div>
                      <Switch
                        checked={(user?.preferences as any)?.showOnlineStatus ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange("showOnlineStatus", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Event History</Label>
                        <p className="text-sm text-gray-600">Show events you've attended on your profile</p>
                      </div>
                      <Switch
                        checked={(user?.preferences as any)?.eventHistory ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange("eventHistory", checked)}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-medium mb-4">Data Management</h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-red-600 hover:text-red-700 bg-transparent"
                        onClick={() => setIsDeleteAccountDialogOpen(true)}
                        disabled={isDeletingAccount}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your account security and authentication.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Change Password</Label>
                      <div className="space-y-3">
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            type={showConfirmNewPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmNewPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button className="w-full" onClick={handleChangePassword} disabled={isUpdatingPassword}>
                          <Lock className="h-4 w-4 mr-2" />
                          {isUpdatingPassword ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Active Sessions</Label>
                      <p className="text-sm text-gray-600">
                        Manage devices that are currently signed in to your account
                      </p>
                      <div className="space-y-2">
                        {isLoadingSessions ? (
                          <div className="text-sm text-gray-600">Loading sessions...</div>
                        ) : sessions.length ? (
                          sessions.map((s) => {
                            const isCurrent = !!currentSessionId && s.id === currentSessionId
                            const title = isCurrent ? "Current Session" : "Signed-in Device"
                            const subtitle = s.userAgent || "Unknown device"
                            const lastSeen = s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : null
                            return (
                              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{title}</p>
                                  <p className="text-sm text-gray-600">{subtitle}</p>
                                  {lastSeen ? <p className="text-xs text-gray-500">Last seen {lastSeen}</p> : null}
                                </div>
                                {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-sm text-gray-600">
                            No active sessions found. If you just updated the app, log out and sign in again.
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        disabled={!currentSessionId || isRevokingOtherSessions}
                        onClick={() => void handleSignOutOtherSessions()}
                      >
                        Sign Out All Other Sessions
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
