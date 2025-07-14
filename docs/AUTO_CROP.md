# Auto-Crop Feature

The auto-crop feature uses saliency based cropping enhanced with face detection to generate face-centric crops optimised for profile display.

## Overview

When images are uploaded, the system:
1. Analyzes the image using face detection
2. If a face is found, creates a 1:1 square crop centered on the face
3. Uses the face-cropped version for generating card and thumbnail versions
4. Saves the face-cropped version as `-face.jpg` in original resolution

## Configuration

The auto-crop feature can be configured through the `SmartCropService`:

### Face Size Parameters

- **`minFaceSize`** (default: 0.25): Minimum face size as percentage of total image area (25%)
- **`maxFaceSize`** (default: 0.5): Maximum face size as percentage of total image area (50%)  
- **`detectionThreshold`** (default: 0.5): Face detection confidence threshold (0-1, higher = more confident)
- **`model`** (default: 'BlazeFace'): Face detection model to use ('BlazeFace' or 'MediaPipeFaceDetector')

### Example Usage

```typescript
import { smartcropImage } from './services/smartcrop.service'

const crop = await smartcropImage(buffer, { width: 150, height: 150 })
// crop => { x, y, width, height }
```

### Environment Configuration

Enable face detection by setting the environment variable:

```bash
FACEAPI_ENABLED=true
SMARTCROP_MODEL=BlazeFace
```

## Technical Details

### Models

The feature uses TensorFlow.js with two available face detection models:

- **BlazeFace** (default): Fast and lightweight face detection model
- **MediaPipeFaceDetector**: More accurate but slower face detection model

Models are automatically downloaded from the TensorFlow.js CDN when first loaded.

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
- Models are loaded once at startup and cached in memory
- Face detection runs automatically but fails gracefully if no face is found
- Only affects card and thumbnail generation - full-size images use originals

## Troubleshooting

### Models Not Loading

Check server logs for TensorFlow.js model loading errors. Models are downloaded automatically from the TensorFlow.js CDN.

### No Face Detected

Common reasons:
- Face too small/large (outside minFaceSize/maxFaceSize range)
- Low confidence detection (below detectionThreshold)
- Poor image quality or lighting
- Face not clearly visible (profile, obscured, etc.)

The system will fallback to normal image processing when face detection fails.

### Switching Models

You can switch between models for different accuracy/speed trade-offs by setting the `SMARTCROP_MODEL` environment variable to either `BlazeFace` or `MediaPipeFaceDetector`.