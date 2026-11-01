import React from 'react';
import { Clock, CheckCircle, Truck, Package, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrderStatusHistory } from '@/hooks/useOrderStatusHistory';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface OrderTrackingTimelineProps {
  orderId: string;
  currentStatus: string;
}

const statusConfig: Record<string, { icon: React.ElementType; labelBn: string; labelEn: string; color: string }> = {
  pending: { icon: Clock, labelBn: 'পেন্ডিং', labelEn: 'Order Placed', color: 'text-yellow-500' },
  confirmed: { icon: CheckCircle, labelBn: 'কনফার্মড', labelEn: 'Confirmed', color: 'text-blue-500' },
  shipped: { icon: Truck, labelBn: 'শিপড', labelEn: 'Shipped', color: 'text-purple-500' },
  delivered: { icon: Package, labelBn: 'ডেলিভার্ড', labelEn: 'Delivered', color: 'text-green-500' },
  cancelled: { icon: XCircle, labelBn: 'বাতিল', labelEn: 'Cancelled', color: 'text-destructive' },
};

const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function OrderTrackingTimeline({ orderId, currentStatus }: OrderTrackingTimelineProps) {
  const { t, language } = useLanguage();
  const { data: history } = useOrderStatusHistory(orderId);

  const isCancelled = currentStatus === 'cancelled';
  const currentIndex = statusOrder.indexOf(currentStatus);

  // Build timeline with actual timestamps from history
  const getTimestampForStatus = (status: string) => {
    const entry = history?.find(h => h.status === status);
    return entry?.created_at;
  };

  const timelineSteps = isCancelled
    ? [
        ...statusOrder.filter(s => {
          const idx = statusOrder.indexOf(s);
          return idx <= Math.max(currentIndex, 0);
        }),
        'cancelled',
      ]
    : statusOrder;

  return (
    <div className="space-y-1">
      {timelineSteps.map((status, index) => {
        const config = statusConfig[status];
        if (!config) return null;
        
        const Icon = config.icon;
        const timestamp = getTimestampForStatus(status);
        const isCompleted = isCancelled
          ? status === 'cancelled' || (statusOrder.indexOf(status) <= currentIndex)
          : statusOrder.indexOf(status) <= currentIndex;
        const isCurrent = status === currentStatus;
        const isLast = index === timelineSteps.length - 1;

        return (
          <div key={status} className="relative flex gap-4">
            {/* Timeline line */}
            {!isLast && (
              <div className={cn(
                "absolute left-4 top-10 w-0.5 h-[calc(100%-8px)]",
                isCompleted && !isCancelled ? "bg-primary" : "bg-border"
              )} />
            )}

            {/* Icon */}
            <div className={cn(
              "relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
              isCompleted
                ? status === 'cancelled' ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
              isCurrent && status !== 'cancelled' && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
            )}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <p className={cn(
                "font-medium text-sm",
                isCompleted ? "text-foreground" : "text-muted-foreground"
              )}>
                {language === 'bn' ? config.labelBn : config.labelEn}
              </p>
              {timestamp && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(timestamp, language)}
                </p>
              )}
              {/* Show note if any */}
              {history?.filter(h => h.status === status).map(h => 
                h.note && (
                  <p key={h.id} className="text-xs text-muted-foreground mt-1 italic">
                    {h.note}
                  </p>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
