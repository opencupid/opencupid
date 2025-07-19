import { type InteractionEdge } from "../interaction/interaction.dto";
import { type MessageDTO } from "../messaging/messaging.dto";

export type WSMessage =
  | { type: 'ws:new_message'; payload: MessageDTO }
  | { type: 'ws:new_like'; payload: InteractionEdge }
  | { type: 'ws:new_match'; payload: InteractionEdge }
  | { type: 'ws:app_notification'; payload: { title: string; body: string } }

export type WSEventType = WSMessage['type']