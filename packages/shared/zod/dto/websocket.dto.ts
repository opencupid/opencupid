import { type InteractionEdge } from "../interaction/interaction.dto";
import { type MessageDTO } from "../messaging/messaging.dto";

export type WSMessage =
  | { type: 'ws:new_message'; payload: MessageDTO }
  | { type: 'ws:new_like'; payload: InteractionEdge }
  | { type: 'ws:new_match'; payload: InteractionEdge }
  | { type: 'ws:app_notification'; payload: { title: string; body: string } }
  | { type: 'ws:incoming_call'; payload: { conversationId: string; roomName: string; caller: { id: string; publicName: string } } }
  | { type: 'ws:call_accepted'; payload: { conversationId: string; roomName: string } }
  | { type: 'ws:call_declined'; payload: { conversationId: string } }
  | { type: 'ws:call_cancelled'; payload: { conversationId: string } }

export type WSEventType = WSMessage['type']
