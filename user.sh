#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./create-k8s-user.sh [username]
# Example:
#   ./create-k8s-user.sh alice
#
# Creates:
#   <username>.key, <username>.csr, <username>-csr.yaml, <username>.crt, <username>.kubeconfig

USERNAME="${1:-alice}"

echo "==> Creating key and CSR for user: ${USERNAME}"
openssl genrsa -out "${USERNAME}.key" 2048
openssl req -new -key "${USERNAME}.key" -out "${USERNAME}.csr" -subj "/CN=${USERNAME}"

echo "==> Creating Kubernetes CSR manifest"
# GNU base64 uses -w 0; macOS base64 uses no -w.
if base64 --help 2>&1 | grep -q -- "-w"; then
  CSR_B64="$(base64 -w 0 < "${USERNAME}.csr")"
else
  CSR_B64="$(base64 < "${USERNAME}.csr" | tr -d '\n')"
fi

cat > "${USERNAME}-csr.yaml" <<EOF
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: ${USERNAME}
spec:
  request: ${CSR_B64}
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
EOF

echo "==> Applying CSR and approving"
kubectl apply -f "${USERNAME}-csr.yaml"

# Approve (idempotent-ish: re-approving may fail; ignore if already approved)
kubectl certificate approve "${USERNAME}" 2>/dev/null || true

echo "==> Fetching issued certificate"
kubectl get csr "${USERNAME}" -o jsonpath='{.status.certificate}' | base64 -d > "${USERNAME}.crt"

echo "==> Creating clusterrolebinding: ${USERNAME}-cluster-admin"
# If it already exists, don't fail the script.
kubectl create clusterrolebinding "${USERNAME}-cluster-admin" \
  --clusterrole=cluster-admin \
  --user="${USERNAME}" 2>/dev/null || true

echo "==> Building kubeconfig: ${USERNAME}.kubeconfig"
CURRENT_CONTEXT="$(kubectl config current-context)"
CLUSTER_NAME="$(kubectl config view -o jsonpath='{.contexts[?(@.name=="'"${CURRENT_CONTEXT}"'")].context.cluster}')"
SERVER="$(kubectl config view -o jsonpath='{.clusters[?(@.name=="'"${CLUSTER_NAME}"'")].cluster.server}')"

# Try to get CA file path first; if not present, extract embedded CA data
CA_FILE="$(kubectl config view --raw -o jsonpath='{.clusters[?(@.name=="'"${CLUSTER_NAME}"'")].cluster.certificate-authority}')"
CA_DATA="$(kubectl config view --raw -o jsonpath='{.clusters[?(@.name=="'"${CLUSTER_NAME}"'")].cluster.certificate-authority-data}')"

if [[ -n "${CA_FILE}" && -f "${CA_FILE}" ]]; then
  # Use the CA file directly
  kubectl config set-cluster "${CLUSTER_NAME}" \
    --server="${SERVER}" \
    --certificate-authority="${CA_FILE}" \
    --embed-certs=true \
    --kubeconfig="${USERNAME}.kubeconfig" >/dev/null
elif [[ -n "${CA_DATA}" ]]; then
  # CA is embedded as base64 data; decode to a temp file
  CA_TEMP="$(mktemp)"
  echo "${CA_DATA}" | base64 -d > "${CA_TEMP}"
  kubectl config set-cluster "${CLUSTER_NAME}" \
    --server="${SERVER}" \
    --certificate-authority="${CA_TEMP}" \
    --embed-certs=true \
    --kubeconfig="${USERNAME}.kubeconfig" >/dev/null
  rm -f "${CA_TEMP}"
else
  echo "ERROR: No certificate-authority or certificate-authority-data found for cluster ${CLUSTER_NAME}" >&2
  exit 1
fi

kubectl config set-credentials "${USERNAME}" \
  --client-certificate="${USERNAME}.crt" \
  --client-key="${USERNAME}.key" \
  --embed-certs=true \
  --kubeconfig="${USERNAME}.kubeconfig" >/dev/null

kubectl config set-context "${USERNAME}@${CLUSTER_NAME}" \
  --cluster="${CLUSTER_NAME}" \
  --user="${USERNAME}" \
  --kubeconfig="${USERNAME}.kubeconfig" >/dev/null

kubectl config use-context "${USERNAME}@${CLUSTER_NAME}" \
  --kubeconfig="${USERNAME}.kubeconfig" >/dev/null

echo "==> Verifying access with new kubeconfig"
kubectl --kubeconfig="${USERNAME}.kubeconfig" auth can-i '*' '*' --all-namespaces
kubectl --kubeconfig="${USERNAME}.kubeconfig" get nodes

echo "==> Done."
echo "Kubeconfig written to: ${USERNAME}.kubeconfig"
