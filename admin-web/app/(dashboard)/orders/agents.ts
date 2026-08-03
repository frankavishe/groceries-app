import { apiFetch } from '@/lib/api';
import type { DeliveryAgent } from '@/lib/types';

// specs/delivery/requirements.md Req 1, admin-web extension: candidates for
// the order-detail "assign agent" dropdown.
export function getAssignableAgents(): Promise<DeliveryAgent[]> {
  return apiFetch<DeliveryAgent[]>('/delivery/agents');
}
