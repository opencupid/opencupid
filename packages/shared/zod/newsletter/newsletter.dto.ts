import { z } from "zod";
import { NewsletterStatusSchema, NewsletterSubscriptionSchema } from "../generated";

// API response for getting newsletter subscription status
export const NewsletterSubscriptionResponseSchema = NewsletterSubscriptionSchema.pick({
  id: true,
  status: true,
  subscribedAt: true,
  unsubscribedAt: true,
  source: true,
  createdAt: true,
  updatedAt: true,
});

export type NewsletterSubscriptionResponse = z.infer<typeof NewsletterSubscriptionResponseSchema>;

// API request for updating newsletter subscription
export const NewsletterActionSchema = z.object({
  action: z.enum(["subscribe", "unsubscribe"]),
});

export type NewsletterAction = z.infer<typeof NewsletterActionSchema>;

// API response for newsletter actions
export const NewsletterActionResponseSchema = z.object({
  success: z.boolean(),
  status: NewsletterStatusSchema,
  message: z.string().optional(),
});

export type NewsletterActionResponse = z.infer<typeof NewsletterActionResponseSchema>;

// Webhook payload from Listmonk
export const ListmonkWebhookEventSchema = z.object({
  type: z.enum(["unsubscribe", "bounce", "complaint"]),
  subscriber: z.object({
    id: z.number(),
    uuid: z.string(),
    email: z.string().email(),
  }),
  timestamp: z.string(),
});

export type ListmonkWebhookEvent = z.infer<typeof ListmonkWebhookEventSchema>;