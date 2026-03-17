// Barrel for voice-recorder deps (~92 kB).
// Single dynamic-import boundary so Rollup emits one lazy chunk
// instead of splitting shared transitive deps into separate files.
export { MediaRecorder, register } from 'extendable-media-recorder'
export { connect } from 'extendable-media-recorder-wav-encoder'
