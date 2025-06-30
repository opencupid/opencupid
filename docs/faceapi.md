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
