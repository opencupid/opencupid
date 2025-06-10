import { F } from '@faker-js/faker/dist/airline-BUL6NtOJ'
import axios from 'axios'

interface OtpResponse {
  success: boolean
  textId?: string
  quotaRemaining: number
  otp: string
}

interface SendOtpResult {
  success: boolean
  otp?: string
  error?: any
}

export class SmsService {
  private apiUrl = 'https://textbelt.com/otp/generate'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async sendOtp(phone: string, userId: string): Promise<SendOtpResult> {
    try {
      const request = {
        phone,
        userid: userId,
        key: this.apiKey,
      }
      console.log('Sending OTP via Textbelt with request:', request)
      const response = await axios.post<OtpResponse>(this.apiUrl, request)

      console.log('Textbelt response:', response.data)
      const { success, otp } = response.data

      if (success) {
        return {
          success: true,
          otp: otp,
        }
      } else {
        console.error('OTP send failed:', response.data)
        return {
          success: false,
          error: response.data,
        }
      }
    } catch (error) {
      console.error('Error sending OTP via Textbelt:', error)
      return {
        success: false,
        error: error,
      }
    }
  }
}
