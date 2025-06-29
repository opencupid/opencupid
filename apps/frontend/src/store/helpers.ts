import { type ApiError } from '@shared/dto/apiResponse.dto'
import { AxiosError } from 'axios'
import { ZodError } from 'zod'
import { useToast } from 'vue-toastification'

export type StoreSuccess<T> = {
  success: true
  data: T | undefined
}

export type StoreVoidSuccess = { success: true }

export interface StoreError {
  success: false
  message: string
  status?: number
  fieldErrors?: Record<string, string[]>
}

export type StoreResponse<T> = StoreSuccess<T> | StoreError


export function storeSuccess<T>(data?: T): StoreSuccess<T> {
  return {
    success: true,
    data,
  }
}

export function storeError(error: unknown, fallbackMessage = 'Request failed'): StoreError {
  let message = fallbackMessage
  let status = 500
  let fieldErrors: Record<string, string[]> = {}

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    message = 'Validation failed'
    const raw = error.flatten().fieldErrors
    fieldErrors = Object.keys(raw).reduce((acc, key) => {
      const val = raw[key]
      if (val !== undefined) acc[key] = val
      return acc
    }, {} as Record<string, string[]>)
  }

  // Handle Axios response errors
  else if (isAxiosError(error)) {
    status = error.response?.status || 500
    const data = error.response?.data as ApiError
    message = data.message || fallbackMessage
    // Rate limit hit
    if (status === 429) {
      useToast().error('Slow down partner.')
    }
    if (data.fieldErrors) {
      fieldErrors = data.fieldErrors
    }
  }

  //   // TODO hook this up to a global debug flag
  if (__APP_CONFIG__.NODE_ENV === 'development')
    console.error(message, status, message)

  return {
    success: false,
    message,
    status,
    fieldErrors,
  }
}

// Type guard
function isAxiosError(err: any): err is AxiosError {
  return err?.isAxiosError === true
}
