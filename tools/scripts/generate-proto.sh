#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RajutechieStreamKit - Proto / Type Generation Script
# ─────────────────────────────────────────────────────────────────────────────
# Placeholder for future gRPC proto file compilation. When gRPC is adopted,
# this script will:
#   - Compile .proto files into TypeScript types and client stubs
#   - Generate Go, Kotlin, Swift, and Dart bindings
#   - Output generated code to each SDK's models directory
#
# Current state: RajutechieStreamKit uses REST + WebSocket APIs. This script is a
# placeholder that will be fleshed out when the gRPC migration begins.
#
# Usage:  ./tools/scripts/generate-proto.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# ── Resolve project root ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║      RajutechieStreamKit - Proto / Type Generation      ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}\n"

# ── Check for proto directory ────────────────────────────────────────────────
PROTO_DIR="${PROJECT_ROOT}/proto"

if [ -d "${PROTO_DIR}" ] && [ -n "$(ls -A "${PROTO_DIR}"/*.proto 2>/dev/null)" ]; then
  info "Proto directory found at ${PROTO_DIR}"
  info "Checking for required tools..."

  # Check protoc
  if ! command -v protoc &>/dev/null; then
    warn "protoc (Protocol Buffer compiler) is not installed."
    warn "Install it from: https://grpc.io/docs/protoc-installation/"
    exit 1
  fi

  # Check protoc plugins
  PROTOC_VERSION=$(protoc --version | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' || echo "unknown")
  info "protoc version: ${PROTOC_VERSION}"

  # Future: compile proto files
  # protoc \
  #   --proto_path="${PROTO_DIR}" \
  #   --ts_out="${PROJECT_ROOT}/packages/core/src/models/generated" \
  #   --ts_opt=esModuleInterop=true \
  #   "${PROTO_DIR}"/*.proto

  # protoc \
  #   --proto_path="${PROTO_DIR}" \
  #   --go_out="${PROJECT_ROOT}/sdks/go/pkg/models" \
  #   "${PROTO_DIR}"/*.proto

  # protoc \
  #   --proto_path="${PROTO_DIR}" \
  #   --kotlin_out="${PROJECT_ROOT}/sdks/android/streamkit-sdk/src/main/kotlin/com/rajutechie/streamkit/models/generated" \
  #   "${PROTO_DIR}"/*.proto

  # protoc \
  #   --proto_path="${PROTO_DIR}" \
  #   --swift_out="${PROJECT_ROOT}/sdks/ios/Sources/RajutechieStreamKit/Models/Generated" \
  #   "${PROTO_DIR}"/*.proto

  # protoc \
  #   --proto_path="${PROTO_DIR}" \
  #   --dart_out="${PROJECT_ROOT}/sdks/flutter/lib/src/models/generated" \
  #   "${PROTO_DIR}"/*.proto

  info "Proto compilation would run here once configured."
else
  echo -e "  Proto generation is ${BOLD}not yet configured${NC} - using REST APIs."
  echo ""
  echo "  RajutechieStreamKit currently uses REST + WebSocket for all service communication."
  echo "  When the gRPC migration begins, this script will:"
  echo ""
  echo "    1. Compile .proto files from ${CYAN}proto/${NC} directory"
  echo "    2. Generate TypeScript types      -> ${CYAN}packages/core/src/models/generated/${NC}"
  echo "    3. Generate TypeScript gRPC stubs  -> ${CYAN}packages/server-sdk/src/generated/${NC}"
  echo "    4. Generate Kotlin bindings        -> ${CYAN}sdks/android/.../models/generated/${NC}"
  echo "    5. Generate Swift bindings         -> ${CYAN}sdks/ios/.../Models/Generated/${NC}"
  echo "    6. Generate Dart bindings          -> ${CYAN}sdks/flutter/lib/src/models/generated/${NC}"
  echo ""
  echo "  To get started with proto files:"
  echo "    mkdir -p proto"
  echo "    # Add your .proto definitions"
  echo "    # Install protoc and language-specific plugins"
  echo "    # Then re-run this script"
  echo ""
fi
