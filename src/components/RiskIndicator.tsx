'use client';

import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Shield,
  AlertCircle
} from 'lucide-react';

interface RiskIndicatorProps {
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  riskScore: number;
  showDetails?: boolean;
  className?: string;
}

export default function RiskIndicator({ 
  riskLevel, 
  riskScore, 
  showDetails = false,
  className = '' 
}: RiskIndicatorProps) {
  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'low':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Low Risk',
          description: 'Reliable customer - no special measures needed'
        };
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          label: 'Medium Risk',
          description: 'Monitor customer behavior closely'
        };
      case 'high':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          label: 'High Risk',
          description: 'Requires approval and monitoring'
        };
      case 'very_high':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          label: 'Very High Risk',
          description: 'Requires full payment and manual approval'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Shield,
          label: 'Unknown Risk',
          description: 'Risk assessment pending'
        };
    }
  };

  const config = getRiskConfig(riskLevel);
  const Icon = config.icon;

  if (showDetails) {
    return (
      <Alert className={`${config.color} border ${className}`}>
        <Icon className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{config.label}</span>
              <span className="ml-2 text-sm opacity-75">({riskScore}/100)</span>
            </div>
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm mt-1">{config.description}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Badge className={`${config.color} border ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

interface RiskWarningProps {
  requiresApproval: boolean;
  depositRequired: boolean;
  maxAdvanceBookingDays: number | null;
  adminNotes: string | null;
  className?: string;
}

export function RiskWarning({ 
  requiresApproval, 
  depositRequired, 
  maxAdvanceBookingDays, 
  adminNotes,
  className = '' 
}: RiskWarningProps) {
  const warnings = [];

  if (requiresApproval) {
    warnings.push('This booking requires manual approval');
  }

  if (depositRequired) {
    warnings.push('A deposit is required for this booking');
  }

  if (maxAdvanceBookingDays) {
    warnings.push(`Maximum advance booking: ${maxAdvanceBookingDays} days`);
  }

  if (adminNotes) {
    warnings.push(`Admin Note: ${adminNotes}`);
  }

  if (warnings.length === 0) {
    return null;
  }

  return (
    <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription>
        <div className="text-orange-800">
          <p className="font-medium mb-2">Booking Restrictions Apply:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}
