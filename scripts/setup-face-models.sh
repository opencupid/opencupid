#!/bin/bash
set -euo pipefail

MODEL_DIR="${1:-face-models}"
mkdir -p "$MODEL_DIR"

MODEL_URL="https://raw.githubusercontent.com/yeephycho/tensorflow-face-detection/master/model/frozen_inference_graph_face.pb"

if [ ! -f "$MODEL_DIR/frozen_inference_graph_face.pb" ]; then
  echo "Downloading SSD Mobilenet V1 model..."
  curl -L "$MODEL_URL" -o "$MODEL_DIR/frozen_inference_graph_face.pb"
fi

if command -v tensorflowjs_converter >/dev/null; then
  echo "Converting TensorFlow model to TensorFlow.js format"
  tensorflowjs_converter \
    --input_format=tf_frozen_model \
    --output_node_names='Squeeze' \
    "$MODEL_DIR/frozen_inference_graph_face.pb" \
    "$MODEL_DIR/ssd_mobilenetv1"
else
  echo "tensorflowjs_converter not installed; skipping conversion"
fi

chmod -R 755 "$MODEL_DIR"
