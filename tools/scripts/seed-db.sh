#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RajutechieStreamKit - Database Seeding Script
# ─────────────────────────────────────────────────────────────────────────────
# Seeds the development environment with sample data by calling the running
# service APIs. Creates:
#   - A default application with a dev API key
#   - Test users (alice, bob, charlie)
#   - Test channels (general, random, team-alpha)
#   - Sample messages in each channel
#
# Prerequisites:
#   - Infrastructure deps running (docker compose)
#   - auth-service and user-service running (pnpm dev)
#
# Usage:  ./tools/scripts/seed-db.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors & helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
step()    { echo -e "\n${BOLD}${CYAN}==>${NC} ${BOLD}$*${NC}"; }

# ── Configuration ────────────────────────────────────────────────────────────
AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://localhost:3010}"
USER_SERVICE_URL="${USER_SERVICE_URL:-http://localhost:3011}"
CHAT_SERVICE_URL="${CHAT_SERVICE_URL:-http://localhost:3012}"

DEV_API_KEY="sk_dev_rajutechie_streamkit_001"
DEV_APP_NAME="RajutechieStreamKit Dev App"

# ── Resolve project root ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║        RajutechieStreamKit - Seed Development Data      ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}\n"

# ── Pre-flight checks ───────────────────────────────────────────────────────
step "Checking service availability"

check_service() {
  local name="$1"
  local url="$2"
  local max_attempts="${3:-5}"
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if curl -sf "${url}/health" -o /dev/null 2>/dev/null; then
      success "${name} is reachable at ${url}"
      return 0
    fi
    attempt=$((attempt + 1))
    if [ $attempt -lt $max_attempts ]; then
      info "Waiting for ${name}... (attempt ${attempt}/${max_attempts})"
      sleep 2
    fi
  done

  error "${name} is not reachable at ${url}"
  return 1
}

SERVICES_OK=true
check_service "auth-service"  "${AUTH_SERVICE_URL}"  5 || SERVICES_OK=false
check_service "user-service"  "${USER_SERVICE_URL}"  5 || SERVICES_OK=false
check_service "chat-service"  "${CHAT_SERVICE_URL}"  5 || SERVICES_OK=false

if [ "${SERVICES_OK}" = false ]; then
  echo ""
  warn "One or more services are not running."
  warn "Start them with: pnpm dev"
  warn ""
  warn "Proceeding anyway - some operations may fail."
  echo ""
fi

# ── Helper: make API call ───────────────────────────────────────────────────
api_call() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local description="${4:-API call}"

  local args=(-s -w "\n%{http_code}" -X "${method}" -H "Content-Type: application/json")

  if [ -n "${AUTH_TOKEN:-}" ]; then
    args+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
  fi

  args+=(-H "X-API-Key: ${DEV_API_KEY}")

  if [ -n "${data}" ]; then
    args+=(-d "${data}")
  fi

  RESPONSE=$(curl "${args[@]}" "${url}" 2>/dev/null || echo -e "\n000")
  HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
  BODY=$(echo "${RESPONSE}" | sed '$d')

  case "${HTTP_CODE}" in
    200|201)
      success "${description}"
      echo "${BODY}"
      return 0
      ;;
    409)
      info "${description} - already exists (skipping)"
      echo "${BODY}"
      return 0
      ;;
    000)
      error "${description} - connection refused"
      return 1
      ;;
    *)
      warn "${description} - HTTP ${HTTP_CODE}"
      if [ -n "${BODY}" ]; then
        echo "  Response: ${BODY}" >&2
      fi
      return 1
      ;;
  esac
}

# ── Step 1: Create default application ──────────────────────────────────────
step "Creating default application"

api_call POST "${AUTH_SERVICE_URL}/api/v1/apps" \
  "{
    \"name\": \"${DEV_APP_NAME}\",
    \"apiKey\": \"${DEV_API_KEY}\",
    \"description\": \"Default development application\",
    \"allowedOrigins\": [\"http://localhost:*\", \"http://127.0.0.1:*\"],
    \"features\": {
      \"chat\": true,
      \"voice\": true,
      \"video\": true,
      \"streaming\": true,
      \"recording\": true
    }
  }" \
  "Create dev application (API key: ${DEV_API_KEY})" || true

# ── Step 2: Create test users ───────────────────────────────────────────────
step "Creating test users"

declare -A USERS
USERS=(
  ["alice"]='{"username":"alice","email":"alice@rajutechie-streamkit.dev","displayName":"Alice Johnson","password":"password123","role":"admin"}'
  ["bob"]='{"username":"bob","email":"bob@rajutechie-streamkit.dev","displayName":"Bob Smith","password":"password123","role":"member"}'
  ["charlie"]='{"username":"charlie","email":"charlie@rajutechie-streamkit.dev","displayName":"Charlie Brown","password":"password123","role":"member"}'
)

declare -A USER_IDS

for user in alice bob charlie; do
  RESULT=$(api_call POST "${USER_SERVICE_URL}/api/v1/users" \
    "${USERS[${user}]}" \
    "Create user: ${user}" 2>/dev/null) || true

  # Try to extract user ID from response
  USER_ID=$(echo "${RESULT}" | grep -oE '"id"\s*:\s*"[^"]*"' | head -1 | grep -oE '"[^"]*"$' | tr -d '"' 2>/dev/null || echo "")
  if [ -n "${USER_ID}" ]; then
    USER_IDS[${user}]="${USER_ID}"
    info "  -> ${user} ID: ${USER_ID}"
  fi
done

# ── Step 3: Authenticate as alice (admin) for subsequent calls ──────────────
step "Authenticating as alice (admin)"

LOGIN_RESULT=$(api_call POST "${AUTH_SERVICE_URL}/api/v1/auth/login" \
  '{"email":"alice@rajutechie-streamkit.dev","password":"password123"}' \
  "Login as alice" 2>/dev/null) || true

AUTH_TOKEN=$(echo "${LOGIN_RESULT}" | grep -oE '"(access_token|token|accessToken)"\s*:\s*"[^"]*"' | head -1 | grep -oE '"[^"]*"$' | tr -d '"' 2>/dev/null || echo "")

if [ -n "${AUTH_TOKEN}" ]; then
  success "Authenticated (token acquired)"
else
  warn "Could not extract auth token - continuing with API key only"
fi

# ── Step 4: Create test channels ────────────────────────────────────────────
step "Creating test channels"

declare -A CHANNEL_IDS

CHANNELS=(
  '{"name":"general","description":"General discussion for the team","type":"public"}'
  '{"name":"random","description":"Random chatter and off-topic fun","type":"public"}'
  '{"name":"team-alpha","description":"Private channel for Team Alpha","type":"private","members":["alice","bob"]}'
)

CHANNEL_NAMES=("general" "random" "team-alpha")

for i in "${!CHANNELS[@]}"; do
  CHANNEL_NAME="${CHANNEL_NAMES[$i]}"
  RESULT=$(api_call POST "${CHAT_SERVICE_URL}/api/v1/channels" \
    "${CHANNELS[$i]}" \
    "Create channel: ${CHANNEL_NAME}" 2>/dev/null) || true

  CHANNEL_ID=$(echo "${RESULT}" | grep -oE '"id"\s*:\s*"[^"]*"' | head -1 | grep -oE '"[^"]*"$' | tr -d '"' 2>/dev/null || echo "")
  if [ -n "${CHANNEL_ID}" ]; then
    CHANNEL_IDS[${CHANNEL_NAME}]="${CHANNEL_ID}"
    info "  -> #${CHANNEL_NAME} ID: ${CHANNEL_ID}"
  fi
done

# ── Step 5: Insert sample messages ──────────────────────────────────────────
step "Inserting sample messages"

send_message() {
  local channel="$1"
  local sender="$2"
  local text="$3"

  # Use channel ID if we have it, otherwise use name
  local channel_ref="${CHANNEL_IDS[${channel}]:-${channel}}"

  api_call POST "${CHAT_SERVICE_URL}/api/v1/channels/${channel_ref}/messages" \
    "{\"content\":\"${text}\",\"sender\":\"${sender}\"}" \
    "Message in #${channel} from ${sender}" >/dev/null 2>&1 || true
}

# General channel messages
send_message "general" "alice"   "Welcome to RajutechieStreamKit! This is the general channel."
send_message "general" "bob"     "Hey everyone! Excited to be here."
send_message "general" "charlie" "Hi all! Looking forward to collaborating."
send_message "general" "alice"   "Let us know if you have any questions about the platform."

# Random channel messages
send_message "random" "bob"     "Anyone tried the new coffee place on 5th?"
send_message "random" "charlie" "Yes! Their cold brew is amazing."
send_message "random" "alice"   "Adding it to my list for tomorrow."

# Team alpha messages
send_message "team-alpha" "alice" "Team Alpha standup: what is everyone working on today?"
send_message "team-alpha" "bob"   "Finishing up the WebRTC integration tests."

success "Sample messages inserted"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║         Seeding completed successfully!       ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Seeded data:${NC}"
echo -e "  API Key:     ${CYAN}${DEV_API_KEY}${NC}"
echo -e "  Application: ${DEV_APP_NAME}"
echo ""
echo -e "  ${BOLD}Users:${NC}"
echo -e "    alice@rajutechie-streamkit.dev   (admin)   password: password123"
echo -e "    bob@rajutechie-streamkit.dev     (member)  password: password123"
echo -e "    charlie@rajutechie-streamkit.dev (member)  password: password123"
echo ""
echo -e "  ${BOLD}Channels:${NC}"
echo -e "    #general     (public)   - 4 messages"
echo -e "    #random      (public)   - 3 messages"
echo -e "    #team-alpha  (private)  - 2 messages"
echo ""
