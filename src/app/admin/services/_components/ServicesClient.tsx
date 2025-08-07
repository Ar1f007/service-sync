"use client"

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Edit, Trash2, Clock, Loader2, AlertCircle } from 'lucide-react'
import { formatPrice, CURRENCY } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert" // Import Alert components
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

interface Service {
  id: string
  title: string
  description: string | null
  features: string[]
  duration: number
  price: number
}

interface ServicesClientProps {
  services: Service[]
  userId: string
}

export default function ServicesClient({
  services: initialServices,
  userId,
}: ServicesClientProps) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [services, setServices] = useState<Service[]>(initialServices)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    features: "",
    duration: "",
    price: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false) // New loading state for form submissions

  useEffect(() => {
    if (isPending) return
    if (!session || session.user.role !== "admin") {
      router.push("/sign-in")
    }
  }, [session, isPending, router])

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      features: "",
      duration: "",
      price: "",
    })
    setError(null) // Clear error on form reset
  }

  const handleAddService = async () => {
    setIsLoading(true) // Set loading true
    setError(null) // Clear previous errors
    try {
      const features = formData.features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f)
      const duration = parseInt(formData.duration)
      const price = parseFloat(formData.price)

      if (
        !formData.title ||
        !duration ||
        !price ||
        Number.isNaN(duration) ||
        Number.isNaN(price)
      ) {
        setError("Please fill in all required fields with valid values.")
        setIsLoading(false) // Set loading false on validation error
        return
      }

      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          features,
          duration,
          price,
          createdBy: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add service")
      }

      const newService = await response.json()
      setServices([...services, newService])
      setIsAddDialogOpen(false)
      resetForm()
    } catch (err: any) {
      setError(err.message || "Failed to add service")
    } finally {
      setIsLoading(false) // Set loading false after API call
    }
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setFormData({
      title: service.title,
      description: service.description || "",
      features: (service.features || []).join(", "),
      duration: service.duration.toString(),
      price: service.price.toString(),
    })
    setError(null) // Clear error when opening edit dialog
    setIsEditDialogOpen(true)
  }

  const handleUpdateService = async () => {
    if (!editingService) return
    setIsLoading(true) // Set loading true
    setError(null) // Clear previous errors
    try {
      const features = formData.features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f)
      const duration = parseInt(formData.duration)
      const price = parseFloat(formData.price)

      if (
        !formData.title ||
        !duration ||
        !price ||
        Number.isNaN(duration) ||
        Number.isNaN(price)
      ) {
        setError("Please fill in all required fields with valid values.")
        setIsLoading(false) // Set loading false on validation error
        return
      }

      const response = await fetch(`/api/services/${editingService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          features,
          duration,
          price,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update service")
      }

      const updatedService = await response.json()
      setServices(services.map((s) => (s.id === editingService.id ? updatedService : s)))
      setIsEditDialogOpen(false)
      setEditingService(null)
      resetForm()
    } catch (err: any) {
      setError(err.message || "Failed to update service")
    } finally {
      setIsLoading(false) // Set loading false after API call
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    setIsLoading(true) // Set loading true (for the delete operation, though not tied to a dialog here)
    setError(null) // Clear previous errors
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete service")
      }
      setServices(services.filter((s) => s.id !== serviceId))
    } catch (err: any) {
      setError(err.message || "Failed to delete service")
    } finally {
      setIsLoading(false) // Set loading false
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!session || session.user.role !== "admin") {
    return null // Redirect handled by useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Manage Services</h1>
          <Button className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add New Service
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Service List</CardTitle>
            <CardDescription>View and manage all available services.</CardDescription>
          </CardHeader>
          <CardContent>
            {services.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id} className="capitalize">
                      <TableCell className="font-medium">{service.title}</TableCell>
                      <TableCell className="text-slate-600 max-w-[200px] truncate">{service.description || "No description"}</TableCell>
                      <TableCell className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {service.duration} min
                      </TableCell>
                      <TableCell className="font-semibold">{formatPrice(service.price)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(service.features || []).map((feature, index) => (
                            <Badge
                              // biome-ignore lint/suspicious/noArrayIndexKey: <noneed>
                              key={index}
                              variant="outline"
                              className="text-slate-700"
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mr-2"
                          onClick={() => handleEditService(service)}
                          disabled={isLoading} // Disable while any operation is loading
                        >
                          <Edit className="w-4 h-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteService(service.id)}
                          disabled={isLoading} // Disable while any operation is loading
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-slate-600 py-8">No services found.</p>
            )}
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Service</DialogTitle>
              <DialogDescription>Add a new service to your offerings.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="title">Service Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Premium Haircut & Style"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this service includes..."
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="features">Features (comma-separated)</Label>
                <Input
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="e.g., Consultation, Wash & Cut, Styling"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="60"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price ({CURRENCY})</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="85.00"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleAddService} className="bg-teal-700 hover:bg-teal-800" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Create Service"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>Update the service details below.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="edit-title">Service Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="edit-features">Features (comma-separated)</Label>
                <Input
                  id="edit-features"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-duration">Duration (minutes)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-price">Price ({CURRENCY})</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateService} className="bg-teal-700 hover:bg-teal-800" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Service"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
