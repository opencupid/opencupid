# Auto-Crop Feature

The auto-crop feature automatically detects faces in uploaded images and generates face-cropped versions optimized for profile display.

## Overview

When images are uploaded, the system:
1. Analyzes the image using face detection
2. If a face is found, creates a 1:1 square crop centered on the face
3. Uses the face-cropped version for generating card and thumbnail versions
4. Saves the face-cropped version as `-face.jpg` in original resolution

## Configuration

The auto-crop feature can be configured through the `FaceDetectionService`:

### Face Size Parameters

- **`minFaceSize`** (default: 0.25): Minimum face size as percentage of total image area (25%)
- **`maxFaceSize`** (default: 0.5): Maximum face size as percentage of total image area (50%)  
- **`detectionThreshold`** (default: 0.5): Face detection confidence threshold (0-1, higher = more confident)

### Example Configuration

```typescript
import { FaceDetectionService } from './services/face-detection.service';

const faceService = FaceDetectionService.getInstance();

// Update configuration
faceService.updateConfig({
  minFaceSize: 0.20,      // Face should be at least 20% of image
  maxFaceSize: 0.60,      // Face should be at most 60% of image
  detectionThreshold: 0.6  // Higher confidence threshold
});
```

## Technical Details

### Models

The feature uses TensorFlow.js and face-api.js with the Tiny Face Detector model for fast face detection.

Models are automatically downloaded to `apps/backend/face-models/` on first setup.

### Image Processing Pipeline

1. **Original Image** → Face detection analysis
2. **Face Detected?**
   - Yes → Generate `-face.jpg` crop → Use for card/thumb variants
   - No → Use original for all variants
3. **Generate Variants**: thumb (150x150), card (480px), full (1280px)

### Output Files

For an image with base name `abc123`:
- `abc123-original.jpg` - Cleaned original
- `abc123-face.jpg` - Face-cropped version (if face detected)
- `abc123-thumb.webp` - 150x150 thumbnail (from face crop if available)
- `abc123-card.webp` - 480px card image (from face crop if available)  
- `abc123-full.webp` - 1280px full image (from original)

## Performance Considerations

- Face detection adds ~200-500ms processing time per image
- Models are loaded once and cached in memory
- Face detection runs automatically but fails gracefully if no face is found
- Only affects card and thumbnail generation - full-size images use originals

## Troubleshooting

### Models Not Loading

Ensure face detection models are present:
```bash
cd apps/backend
node scripts/download-face-models.js
```

### No Face Detected

Common reasons:
- Face too small/large (outside minFaceSize/maxFaceSize range)
- Low confidence detection (below detectionThreshold)
- Poor image quality or lighting
- Face not clearly visible (profile, obscured, etc.)

The system will fallback to normal image processing when face detection fails.