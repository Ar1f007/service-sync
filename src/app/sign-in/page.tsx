"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Calendar } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"



export default function AuthForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("signin")

  // Get redirect URL from search params or localStorage
  const redirectUrl = searchParams.get("redirect") || localStorage.getItem("redirectAfterAuth") || "/"

  useEffect(() => {
    // Clear the stored redirect URL when component mounts
    return () => {
      localStorage.removeItem("redirectAfterAuth")
    }
  }, [])

  const resetMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    await authClient.signIn.email(
      {
        email,
        password,
        callbackURL: redirectUrl,
        rememberMe,
      },
      {
        onRequest: () => {
          setIsLoading(true)
        },
        onSuccess: () => {
          setIsLoading(false)
          setSuccess("Welcome back! Redirecting...")
          localStorage.removeItem("redirectAfterAuth")
          setTimeout(() => {
            window.location.href = redirectUrl
          }, 1500)
        },
        onError: (ctx) => {
          setIsLoading(false)
          setError(ctx.error.message || "Failed to sign in. Please check your credentials.")
        },
      },
    )
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    await authClient.signUp.email(
      {
        email,
        password,
        name,
        callbackURL: redirectUrl,
        role: "client",
      },
      {
        onRequest: () => {
          setIsLoading(true)
        },
        onSuccess: () => {
          setIsLoading(false)
          setSuccess("Account created successfully! Redirecting...")
          localStorage.removeItem("redirectAfterAuth")
          setTimeout(() => {
            window.location.href = redirectUrl
          }, 2000)
        },
        onError: (ctx) => {
          setIsLoading(false)
          setError(ctx.error.message || "Failed to create account. Please try again.")
        },
      },
    )
  }

  const isSignInValid = email && password
  const isSignUpValid = email && password && name && password.length >= 8

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">ServiceSync</span>
          </Link>
          <p className="text-slate-600 mt-2">Professional appointment booking platform</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-slate-900">
              {activeTab === "signin" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              {activeTab === "signin" ? "Sign in to manage your appointments" : "Join thousands of satisfied clients"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Success Message */}
              {success && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium text-slate-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        disabled={isLoading}
                      />
                      <Label htmlFor="remember" className="text-sm text-slate-600">
                        Remember me
                      </Label>
                    </div>
                    <Link href="/forgot-password" className="text-sm text-teal-600 hover:text-teal-700">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-medium"
                    disabled={!isSignInValid || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium text-slate-700">
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-11 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-slate-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min 8 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && password.length < 8 && (
                      <p className="text-xs text-amber-600">Password must be at least 8 characters long</p>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                    By creating an account, you agree to our{" "}
                    <Link href="/terms" className="text-teal-600 hover:text-teal-700">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-teal-600 hover:text-teal-700">
                      Privacy Policy
                    </Link>
                    .
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-medium"
                    disabled={!isSignUpValid || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Need help?{" "}
                <Link href="/support" className="text-teal-600 hover:text-teal-700 font-medium">
                  Contact Support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center">
            ← Back to ServiceSync
          </Link>
        </div>
      </div>
    </div>
  )
}
