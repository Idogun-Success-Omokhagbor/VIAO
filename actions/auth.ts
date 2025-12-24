"use server"

interface SignUpData {
  name: string
  email: string
  password: string
  isOrganizer?: boolean
  organization?: string
  bio?: string
}

interface SignInData {
  email: string
  password: string
}

export async function signUp(data: SignUpData) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In a real app, you would hash the password and save to database
  console.log("Sign up data:", data)

  // Return mock user data
  return {
    success: true,
    user: {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      email: data.email,
      isOrganizer: data.isOrganizer || false,
      organization: data.organization,
      bio: data.bio,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
      createdAt: new Date(),
    },
  }
}

export async function signIn(data: SignInData) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In a real app, you would verify credentials against database
  console.log("Sign in data:", data)

  // Return mock user data
  return {
    success: true,
    user: {
      id: Math.random().toString(36).substr(2, 9),
      name: data.email.split("@")[0],
      email: data.email,
      isOrganizer: false,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
      createdAt: new Date(),
    },
  }
}

export async function signOut() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return { success: true }
}
