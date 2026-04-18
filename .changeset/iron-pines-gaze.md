---
'@opencupid/backend': patch
---

Fix face-aware autocrop missing faces on full-body portraits: swap BlazeFace (selfie-tuned short-range, 128×128 input) for MediaPipe FaceDetector full-range (192×192, trained on wider scenes), raise smartcrop boost weight so small faces outscore saturated/high-detail regions, and stop sharp's attention strategy from re-cropping over smartcrop's output.
