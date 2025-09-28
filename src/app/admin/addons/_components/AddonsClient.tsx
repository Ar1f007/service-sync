'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { AddonForm } from './AddonForm';
import { AddonEditDialog } from './AddonEditDialog';

interface Service {
  id: string;
  title: string;
  price: number;
  duration: number;
}

interface Addon {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  serviceId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  service: Service;
}

export function AddonsClient() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  const fetchAddons = useCallback(async () => {
    try {
      const response = await fetch('/api/addons');
      if (response.ok) {
        const data = await response.json();
        setAddons(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch add-ons:', response.status);
        setAddons([]);
      }
    } catch (error) {
      console.error('Failed to fetch add-ons:', error);
      setAddons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        // The services API returns { services: [...] }, so we need to extract the services array
        const servicesArray = data.services || data;
        setServices(Array.isArray(servicesArray) ? servicesArray : []);
      } else {
        console.error('Failed to fetch services:', response.status);
        setServices([]);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    }
  }, []);

  useEffect(() => {
    fetchAddons();
    fetchServices();
  }, [fetchAddons, fetchServices]);

  const handleAddonCreated = () => {
    fetchAddons();
    setShowForm(false);
  };

  const handleAddonUpdated = () => {
    fetchAddons();
    setEditingAddon(null);
  };

  const handleDeleteAddon = async (addonId: string) => {
    if (!confirm('Are you sure you want to delete this add-on?')) return;

    try {
      const response = await fetch(`/api/addons/${addonId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchAddons();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete add-on');
      }
    } catch (error) {
      console.error('Failed to delete add-on:', error);
      alert('Failed to delete add-on');
    }
  };

  const filteredAddons = selectedServiceId 
    ? (Array.isArray(addons) ? addons.filter(addon => addon.serviceId === selectedServiceId) : [])
    : (Array.isArray(addons) ? addons : []);

  if (loading) {
    return <div className="flex justify-center py-8">Loading add-ons...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Services</option>
            {Array.isArray(services) && services.map(service => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Add-on
        </Button>
      </div>

      {/* Add-ons Grid */}
      {filteredAddons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No add-ons found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {selectedServiceId 
                ? 'No add-ons available for the selected service.'
                : 'Get started by creating your first add-on.'
              }
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Add-on
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAddons.map((addon) => (
            <Card key={addon.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{addon.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {addon.service.title}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={addon.isActive ? 'default' : 'secondary'}>
                      {addon.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAddon(addon)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAddon(addon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {addon.description && (
                  <p className="text-sm text-muted-foreground">
                    {addon.description}
                  </p>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Price: £{addon.price.toFixed(2)}</span>
                  <span className="text-muted-foreground">
                    +{addon.duration}min
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Add-on Form */}
      {showForm && (
        <AddonForm
          services={services}
          onClose={() => setShowForm(false)}
          onSuccess={handleAddonCreated}
        />
      )}

      {/* Edit Add-on Dialog */}
      {editingAddon && (
        <AddonEditDialog
          addon={editingAddon}
          services={services}
          onClose={() => setEditingAddon(null)}
          onSuccess={handleAddonUpdated}
        />
      )}
    </div>
  );
}
