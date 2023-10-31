import type { WorkflowState } from "./WorkflowState";
import type { Order, OrderItem } from "./Order";


export type PizzaWorkflow = RealtimeState & {
  orderItems: OrderItem[];
  clientId: string;
  orderId: string;
  isWorkflowComplete: boolean;
  disableOrdering: boolean;
  orderPlacedState: WorkflowState;
  inStockState: WorkflowState;
  notInStockState: WorkflowState;
  inPreparationState: WorkflowState;
  completedState: WorkflowState;
  isOrderPlaced: boolean;
};

export type RealtimeState = {
  wsClient: StompJs.Client;
  events: [];
  isConnected: boolean;
  channelPrefix: string;
};

export type OrderEvent = {
  eventType: string;
  order: Order;
}
