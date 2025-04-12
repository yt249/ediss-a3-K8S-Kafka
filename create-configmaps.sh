# use it like "./switch-env.sh aws"

#!/bin/bash

ENV_NAME=$1
SERVICE_NAME="book-service"
NAMESPACE="bookstore-ns"
ENV_FILE="./${SERVICE_NAME}/.env.${ENV_NAME}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ ENV file $ENV_FILE not found"
  exit 1
fi

echo "🔁 Applying $ENV_FILE as ConfigMap for $SERVICE_NAME..."

kubectl create configmap ${SERVICE_NAME}-config \
  --from-env-file="$ENV_FILE" \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ ConfigMap ${SERVICE_NAME}-config updated from $ENV_FILE"