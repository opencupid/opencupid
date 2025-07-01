# Face detection models

The backend uses **face-api.js** to automatically crop uploaded images so the subject's face is centered.

## MODEL_PATH

Set the `MODEL_PATH` environment variable to the directory containing the face-api.js model files. This value is parsed via `appConfig` and used when the `ImageService` loads the models.

### Development

Place the pre-trained models in a folder relative to the repository root and point `MODEL_PATH` at it:

```bash
MODEL_PATH=./face-models
```

### Production

Use an absolute path or mounted volume that holds the same model files, for example:

```bash
MODEL_PATH=/usr/share/face-api
```

Make sure the directory is readable by the backend process.

## Obtaining SSD Mobilenet V1

The face detection model comes from [`tensorflow-face-detection`](https://github.com/yeephycho/tensorflow-face-detection). A helper script is provided to download and convert the TensorFlow model into the TensorFlow.js format expected by **face-api.js**.

```bash
pnpm run setup-face-models   # runs scripts/setup-face-models.sh
```

The script downloads `frozen_inference_graph_face.pb` and, if `tensorflowjs_converter` is available, converts it into `/face-models/ssd_mobilenetv1`.

### Docker

The backend Dockerfile runs the same script during the build stage so the model is bundled in the final image. `MODEL_PATH` defaults to `/app/face-models` inside the container.

```dockerfile
ENV MODEL_PATH=/app/face-models
```
