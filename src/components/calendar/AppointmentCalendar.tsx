'use client';

import { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enGB } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Download, Edit, X, Clock } from 'lucide-react';

// Create the localizer using date-fns
const locales = {
  'en-GB': enGB,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    appointmentId: string;
    status: string;
    clientName: string;
    serviceName: string;
    employeeName: string;
    totalPrice: number;
    addons: Array<{ name: string; price: number }>;
  };
}

interface AppointmentCalendarProps {
  events: CalendarEvent[];
  onEditAppointment?: (appointmentId: string) => void;
  onCancelAppointment?: (appointmentId: string) => void;
  onRescheduleAppointment?: (appointmentId: string) => void;
  onGenerateInvoice?: (appointmentId: string) => void;
  userRole: 'client' | 'admin' | 'staff';
  view?: 'month' | 'week' | 'day';
  onViewChange?: (_view: 'month' | 'week' | 'day') => void;
}

export default function AppointmentCalendar({
  events,
  onEditAppointment,
  onCancelAppointment,
  onRescheduleAppointment,
  onGenerateInvoice,
  userRole: _userRole,
  view = 'month',
  onViewChange
}: AppointmentCalendarProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>(view);

  const handleViewChange = (newView: string) => {
    if (newView === 'work_week' || newView === 'agenda') return; // Ignore unsupported views
    if (newView === 'month' || newView === 'week' || newView === 'day') {
      setCurrentView(newView);
      onViewChange?.(newView);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';

    switch (event.resource.status) {
      case 'confirmed':
        backgroundColor = '#10b981';
        borderColor = '#10b981';
        break;
      case 'pending':
        backgroundColor = '#f59e0b';
        borderColor = '#f59e0b';
        break;
      case 'cancelled':
        backgroundColor = '#ef4444';
        borderColor = '#ef4444';
        break;
      case 'completed':
        backgroundColor = '#6b7280';
        borderColor = '#6b7280';
        break;
      case 'no_show':
        backgroundColor = '#dc2626';
        borderColor = '#dc2626';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseDialog = () => {
    setSelectedEvent(null);
  };

  const canPerformActions = (status: string) => {
    return status === 'pending' || status === 'confirmed';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      no_show: { color: 'bg-red-100 text-red-800', label: 'No Show' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        view={currentView}
        onView={handleViewChange}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day']}
        step={30}
        timeslots={2}
        showMultiDayTimes
        popup
      />

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Appointment Details
              {selectedEvent && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onGenerateInvoice && (
                      <DropdownMenuItem onClick={() => onGenerateInvoice(selectedEvent.resource.appointmentId)}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Invoice
                      </DropdownMenuItem>
                    )}
                    {canPerformActions(selectedEvent.resource.status) && onEditAppointment && (
                      <DropdownMenuItem onClick={() => onEditAppointment(selectedEvent.resource.appointmentId)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Appointment
                      </DropdownMenuItem>
                    )}
                    {canPerformActions(selectedEvent.resource.status) && onRescheduleAppointment && (
                      <DropdownMenuItem onClick={() => onRescheduleAppointment(selectedEvent.resource.appointmentId)}>
                        <Clock className="h-4 w-4 mr-2" />
                        Reschedule
                      </DropdownMenuItem>
                    )}
                    {canPerformActions(selectedEvent.resource.status) && onCancelAppointment && (
                      <DropdownMenuItem 
                        onClick={() => onCancelAppointment(selectedEvent.resource.appointmentId)}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel Appointment
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedEvent.resource.serviceName}</h3>
                <p className="text-sm text-gray-600">
                  {format(selectedEvent.start, 'EEEE, MMMM do, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Client:</span>
                  <span className="text-sm">{selectedEvent.resource.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Technician:</span>
                  <span className="text-sm">{selectedEvent.resource.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(selectedEvent.resource.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Price:</span>
                  <span className="text-sm font-semibold">£{selectedEvent.resource.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {selectedEvent.resource.addons.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Add-ons:</h4>
                  <div className="space-y-1">
                    {selectedEvent.resource.addons.map((addon) => (
                      <div key={addon.name} className="flex justify-between text-sm">
                        <span>+ {addon.name}</span>
                        <span>£{addon.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
