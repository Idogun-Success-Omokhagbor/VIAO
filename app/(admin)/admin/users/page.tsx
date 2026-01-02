"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/confirm-dialog"

type Role = "USER" | "ORGANIZER" | "ADMIN"

type AdminUser = {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
  lastSeenAt?: string | null
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("")
  const [role, setRole] = useState<Role | "ALL">("ALL")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (role !== "ALL") params.set("role", role)
    params.set("page", "1")
    params.set("pageSize", "50")
    return params.toString()
  }, [q, role])

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users?${query}`, { credentials: "include", cache: "no-store" })
      const data = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(data?.error || "Failed to load users")
      setUsers(Array.isArray(data?.users) ? data.users : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteUser = async (userId: string) => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      })
      const data = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(data?.error || "Failed to delete user")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user")
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  useEffect(() => {
    void load()
  }, [query])

  const updateRole = async (userId: string, newRole: Role) => {
    setError(null)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role: newRole }),
      })
      const data = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(data?.error || "Failed to update role")
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-sm text-muted-foreground">Search users and change roles.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email..." />
          <div className="w-full md:w-56">
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ORGANIZER">Organizer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <UserRow key={u.id} user={u} onChangeRole={updateRole} onDelete={(x) => setConfirmDelete(x)} />
              ))}
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null)
        }}
        title="Delete user"
        description={confirmDelete ? `This will permanently delete ${confirmDelete.email}.` : undefined}
        confirmLabel="Delete"
        tone="danger"
        loading={deleting}
        onConfirm={() => {
          if (!confirmDelete) return
          void deleteUser(confirmDelete.id)
        }}
      />
    </div>
  )
}

function roleBadgeVariant(role: Role): "default" | "secondary" | "outline" {
  if (role === "ADMIN") return "default"
  if (role === "ORGANIZER") return "secondary"
  return "outline"
}

function UserRow({
  user,
  onChangeRole,
  onDelete,
}: {
  user: AdminUser
  onChangeRole: (userId: string, newRole: Role) => Promise<void>
  onDelete: (user: AdminUser) => void
}) {
  const [nextRole, setNextRole] = useState<Role>(user.role)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNextRole(user.role)
  }, [user.role])

  const save = async () => {
    if (nextRole === user.role) return
    setSaving(true)
    try {
      await onChangeRole(user.id, nextRole)
    } finally {
      setSaving(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell className="font-mono text-xs">{user.email}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
          <div className="w-44">
            <Select value={nextRole} onValueChange={(v) => setNextRole(v as Role)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ORGANIZER">Organizer</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TableCell>
      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
      <TableCell>{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : "—"}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={save} disabled={saving || nextRole === user.role}>
            Save
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(user)} disabled={saving || user.role === "ADMIN"}>
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
