// Declare global types if needed
export type SpeechRecognition = typeof webkitSpeechRecognition

export interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}

export interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

export interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  length: number
  isFinal: boolean
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}
