# Face Detection and Autocrop Feature

This document describes the face detection and automatic cropping functionality implemented to resolve TensorFlow version conflicts in the image processing pipeline.

## Problem Solved

The original issue was a TensorFlow version mismatch error:
```
TypeError: forwardFunc_1 is not a function
    at /home/user/opencupid/node_modules/.pnpm/@tensorflow+tfjs-core@4.22.0/node_modules/@tensorflow/tfjs-core/dist/tf-core.node.js:4746:55
```

This occurred because `face-api.js` requires `@tensorflow/tfjs-core@1.7.0` but other parts of the system were trying to use `@tensorflow/tfjs-core@4.22.0`.

## Solution

We implemented a complete face detection and autocropping system with proper TensorFlow version alignment:

### 1. Dependencies
- `face-api.js@0.22.2` - Face detection library
- `@tensorflow/tfjs-core@1.7.0` - TensorFlow core (compatible with face-api.js)
- `@tensorflow/tfjs-node@1.7.4` - TensorFlow Node.js backend
- `canvas@3.0.0` - Canvas for image processing

### 2. Core Services

#### FaceDetectionService
Located at `apps/backend/src/services/face-detection.service.ts`

**Features:**
- Singleton pattern for efficient model loading
- Face detection using SSD MobileNet v1 model
- Smart crop box calculation based on detected faces
- Graceful handling when Canvas is not available (CI environments)

**Key Methods:**
```typescript
// Initialize the service with face detection models
await faceDetectionService.initialize()

// Detect faces and get crop suggestions
const result = await faceDetectionService.detectFaces('/path/to/image.jpg')
console.log(result.faces) // Array of detected faces with coordinates
console.log(result.cropBox) // Suggested crop box for optimal framing
```

#### ImageService Updates
The existing `ImageService` has been enhanced to use face detection for automatic cropping:

- When processing profile images, it attempts to detect faces
- If faces are found, it crops the image to focus on the faces with proper framing
- Falls back to original image if face detection fails
- Maintains all existing functionality (resizing, format conversion, etc.)

### 3. Model Management

#### Download Models
```bash
cd apps/backend
node scripts/download-face-models.js
```

This downloads the required face detection models to the `face-models` directory.

#### Check Version Alignment
```bash
cd apps/backend  
node scripts/check-tf-versions.js
```

This script verifies that all TensorFlow packages use compatible versions.

### 4. Usage

The autocrop feature is automatically applied when images are processed through the `ImageService.processImage()` method. No changes are needed in existing API endpoints.

Example flow:
1. User uploads a profile image
2. `ImageService.storeImage()` is called
3. `processImage()` attempts face detection
4. If faces are detected, the image is cropped to focus on faces
5. Standard resizing and format conversion continues
6. Image variants are saved

### 5. Error Handling

The system gracefully handles several scenarios:
- **Canvas not available**: Disables face detection but continues image processing
- **Models not found**: Logs warning and continues without autocrop
- **Face detection fails**: Falls back to original image
- **No faces detected**: Uses original image without cropping

### 6. Testing

Run the face detection tests:
```bash
cd apps/backend
pnpm test src/services/__tests__/face-detection.service.test.ts
```

### 7. Configuration

The face detection models are stored in `face-models/` directory at the repository root. The service automatically looks for:
- `ssd_mobilenetv1_model-weights_manifest.json`
- `ssd_mobilenetv1_model-shard1`

### 8. Production Deployment

For production environments:

1. **Install Canvas properly**: Ensure the Canvas native dependencies are installed:
   ```bash
   # Ubuntu/Debian
   apt-get install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++
   
   # Alpine Linux
   apk add cairo-dev jpeg-dev pango-dev giflib-dev build-base
   ```

2. **Download models**: Run the model download script during deployment

3. **Monitor logs**: Face detection errors are logged but don't break image processing

### 9. Performance Considerations

- Models are loaded once at service initialization
- Face detection adds ~200-500ms to image processing time
- Original functionality is preserved if face detection is disabled
- Memory usage increases by ~50MB when models are loaded

### 10. Future Enhancements

Potential improvements:
- Support for multiple face detection models
- Confidence threshold configuration
- Face landmark detection for better cropping
- Batch processing for multiple images
- GPU acceleration support

## Troubleshooting

### TensorFlow Version Conflicts
If you see `forwardFunc_1 is not a function` errors:
1. Run `node scripts/check-tf-versions.js` to identify conflicts
2. Ensure all `@tensorflow/*` packages use version 1.7.x
3. Clear node_modules and reinstall if needed

### Canvas Issues
If Canvas fails to load:
1. Check that native dependencies are installed
2. The system will continue working without face detection
3. Check logs for "Canvas not available" warnings

### Model Loading Issues
If face detection initialization fails:
1. Verify models exist in `face-models/` directory
2. Run the download script to get models
3. Check file permissions on model files