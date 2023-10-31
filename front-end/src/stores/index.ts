import { ref, computed } from "vue";
import { defineStore, storeToRefs } from "pinia";
import type { PizzaWorkflow, OrderEvent } from "@/types/PizzaWorkflow";
import OrderImage from "../assets/Order.png";
import PizzaAndDrinkImage from "../assets/PizzaAndDrink.png";
import PizzaInOvenImage from "../assets/PizzaInOven.png";
import BoxAndDrinkImage from "../assets/BoxAndDrink.png";
import PizzaPepperoni from "../assets/PizzaPepperoni.png";
import DeliveryImage from "../assets/Delivery.png";
import DeliveredImage from "../assets/Map.gif";
import { type Pizza, PizzaType, type Order } from "@/types/Order";

import * as esm6 from '../../node_modules/@stomp/stompjs/esm6/index';                                                                                                                                                           
                                                                                                                                                                                                                             
declare global {                                                                                                                                                                                                             
    namespace StompJs {                                                                                                                                                                                                      
        export import Client = esm6.Client;                                                                                                                                                                                  
        export import Frame = esm6.Frame;                                                                                                                                                                                    
        export import Message = esm6.Message;                                                                                                                                                                                
        export import Parser = esm6.Parser;                                                                                                                                                                                  
        export import StompConfig = esm6.StompConfig;                                                                                                                                                                        
        export import StompHeaders = esm6.StompHeaders;                                                                                                                                                                      
        export import StompSubscription = esm6.StompSubscription;                                                                                                                                                            
        export import Transaction = esm6.Transaction;                                                                                                                                                                        
    }                                                                                                                                                                                                                        
}

export const pizzaProcessStore = defineStore("pizza-process", {
  state: (): PizzaWorkflow => ({
    wsClient: null,
    isConnected: false,
    channelPrefix: "pizza-process",
    clientId: "",
    orderId: "",
    disableOrdering: false,
    isWorkflowComplete: false,
    isOrderPlaced: false,
    orderItems:[ 
      { type: { name: PizzaType.Pepperoni, image: PizzaPepperoni}, amount: 5 },
      { type:{ name: PizzaType.Margherita, image: PizzaPepperoni}, amount: 0 },
      { type:{ name: PizzaType.Hawaiian, image: PizzaPepperoni}, amount: 0 },
      { type:{ name: PizzaType.Vegetarian, image: PizzaPepperoni}, amount: 0 },
    ],
    orderPlacedState: {
      title: "Order Received",
      orderId: "",
      image: OrderImage,
      isVisible: false,
      isDisabled: true,
      isCurrentState: false,
    },
    inStockState: {
      title: "Sending instructions to the kitchen",
      orderId: "",
      image: PizzaAndDrinkImage,
      isVisible: false,
      isDisabled: true,
      isCurrentState: false,
    },
    notInStockState: {
      title: "Preparing your pizza",
      orderId: "",
      image: PizzaInOvenImage,
      isVisible: false,
      isDisabled: true,
      isCurrentState: false,
    },
    inPreparationState: {
      title: "Collecting your order",
      orderId: "",
      image: BoxAndDrinkImage,
      isVisible: false,
      isDisabled: true,
      isCurrentState: false,
    },
    completedState: {
      title: "Your order is complete and can be collected.",
      orderId: "",
      image: DeliveryImage,
      isVisible: false,
      isDisabled: true,
      isCurrentState: false,
    },
  }),
  actions: {
    incrementPizzaCount(pizza: PizzaType) {
      const pizzaIndex = this.orderItems.findIndex((item) => item.type.name === pizza);
      this.orderItems[pizzaIndex].amount++;
    },
    async start(clientId: string, order: Order) {
      this.$reset();
      this.$state.clientId = clientId;
      this.$state.orderId = order.id;
      this.$state.disableOrdering = true;
      this.$state.orderPlacedState.isVisible = true;
      await this.createRealtimeConnection(clientId, order);
    },
    async createRealtimeConnection(clientId: string, order: Order) {
      if (!this.isConnected) {
        this.wsClient = new StompJs.Client({
          brokerURL: 'ws://localhost:8080/ws'
        });

        this.wsClient.onConnect = (frame) => {
          console.log('Connected: ' + frame);
          this.wsClient.subscribe('/topic/events', (event) => {
              console.log(JSON.stringify(event));
          });
      };
      
      this.wsClient.onWebSocketError = (error) => {
          console.error('Error with websocket', error);
      };

      this.wsClient.activate();
        // new WebSocket("ws://localhost:8080/ws");
        // this.wsClient.onerror = (message) => {
        //   console.log(`Error: ${JSON.stringify(message)}`)
        // };
        // this.wsClient.onmessage = (event) => {    
        //     console.log(`Received: ${event}`)
        // };
        
        
        // this.wsClient.onmessage = (event) => {
        //   this.events.push(event.data);
        // };
        // this.realtimeClient = new Realtime.Promise({
        //   authUrl: `/api/CreateTokenRequest/${clientId}`,
        //   echoMessages: false,
        // });
        // this.realtimeClient.connection.on(
        //   "connected",
        //   async (message: Types.ConnectionStateChange) => {
        //     this.isConnected = true;
        //     this.attachToChannel(order.id);
        //     if (!this.isOrderPlaced) {
        //       await this.placeOrder(order);
        //       this.$state.isOrderPlaced = true;
        //     }
        //   }
        // );

        // this.realtimeClient.connection.on("disconnected", () => {
        //   this.$state.isConnected = false;
        // });
        // this.realtimeClient.connection.on("closed", () => {
        //   this.$state.isConnected = false;
        // });

      } else {
        this.attachToChannel(this.orderId);
      }
    },

    disconnect() {
      this.wsClient?.deactivate();
    },

    async placeOrder(order: Order) {
      const response = await window.fetch("/api/PlaceOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      });
      if (response.ok) {
        const payload = await response.json();
        this.$state.orderId = payload.result;
        console.log(`Order ID: ${this.orderId}`);
      } else {
        this.$state.disableOrdering = false;
        console.log(response.statusText);
      }
    },

    attachToChannel(orderId: string) {
      const channelName = `pizza-workflow:${orderId}`;
      // this.$state.channelInstance = this.realtimeClient?.channels.get(
      //   channelName,
      //   { params: { rewind: "2m" } }
      // );
      this.subscribeToMessages();
    },

    subscribeToMessages() {
      this.wsClient.onmessage = (event) => {
        if(event.data.eventtype == "order-placed"){
          this.handleOrderPlaced(event);
        }
        if(event.data.eventtype == "items-in-stock"){
          this.handleItemsInStock(event);
        }
        if(event.data.eventtype == "items-not-in-stock"){
          this.handleItemsNotInStock(event);
        }
        if(event.data.eventtype == "order-in-preparation"){
          this.handleOrderInPreperation(event);
        }
        if(event.data.eventtype == "order-completed"){
          this.handleOrderCompleted(event);
        }
      };
    },

    handleOrderPlaced(event: OrderEvent) {
      this.$patch({
        orderPlacedState: {
          orderId: event.order.id,
          isDisabled: false,
          isCurrentState: true,
        },
        inStockState: {
          isVisible: true,
        },
      });
    },

    handleItemsInStock(event: OrderEvent) {
      this.$patch({
        inStockState: {
          orderId: event.order.id,
          isDisabled: false,
          isCurrentState: true,
        },
        orderPlacedState: {
          isCurrentState: false,
        },
        notInStockState: {
          isVisible: true,
        },
      });
    },

    handleItemsNotInStock(event: OrderEvent) {
      this.$patch({
        notInStockState: {
          orderId: event.order.id,
          isDisabled: false,
          isCurrentState: true,
        },
        inStockState: {
          isCurrentState: false,
        },
        inPreparationState: {
          isVisible: true,
        },
      });
    },

    handleOrderInPreperation(event: OrderEvent) {
      this.$patch({
        inPreparationState: {
          orderId: event.order.id,
          isDisabled: false,
          isCurrentState: true,
        },
        notInStockState: {
          isCurrentState: false,
        },
        completedState: {
          isVisible: true,
        },
      });
    },

    handleOrderCompleted(event: OrderEvent) {
      this.$patch({
        completedState: {
          orderId: event.order.id,
          isDisabled: false,
          isCurrentState: true,
        },
        inPreparationState: {
          isCurrentState: false,
        }
      });
    },
  },
});
