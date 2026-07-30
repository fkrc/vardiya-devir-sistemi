#!/usr/bin/env bash
#
# Vardiya Devir sistemini (PostgreSQL + Spring Boot backend + Vite frontend)
# tek komutla ayağa kaldırır. macOS için yazılmıştır.
#
# Kullanım:
#   ./start.sh            -> her şeyi başlatır (zaten çalışan servisleri atlar)
#   ./start.sh stop       -> bu script'in başlattığı backend/frontend'i durdurur
#   ./start.sh status     -> servislerin durumunu gösterir
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend-vardiya"

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="${DB_NAME:-vardiya_devir}"
DB_USER="${DB_USERNAME:-postgres}"
DB_PASS="${DB_PASSWORD:-admin123}"

BACKEND_PORT="8080"
FRONTEND_PORT="5173"

RUN_DIR="/tmp/vardiya-devir"
mkdir -p "$RUN_DIR"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${BLUE}==>${NC} $1"; }
ok()    { echo -e "${GREEN}✔${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
fail()  { echo -e "${RED}✘${NC} $1"; }

port_pid() { lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n1; }

wait_for_http() {
  local url="$1" timeout="$2" waited=0
  while ! curl -s -o /dev/null "$url"; do
    sleep 2; waited=$((waited + 2))
    if [ "$waited" -ge "$timeout" ]; then return 1; fi
  done
  return 0
}

# ---------------------------------------------------------------------------
stop_all() {
  for pair in "backend:$BACKEND_PID_FILE" "frontend:$FRONTEND_PID_FILE"; do
    name="${pair%%:*}"; pid_file="${pair#*:}"
    if [ -f "$pid_file" ]; then
      pid="$(cat "$pid_file")"
      if kill -0 "$pid" 2>/dev/null; then
        info "$name durduruluyor (PID $pid)..."
        kill "$pid" 2>/dev/null
        sleep 1
        kill -9 "$pid" 2>/dev/null
      fi
      rm -f "$pid_file"
    else
      warn "$name için kayıtlı PID yok (muhtemelen bu script tarafından başlatılmadı)."
    fi
  done
  ok "Durdurma işlemi tamamlandı."
}

status_all() {
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; then ok "PostgreSQL çalışıyor ($DB_HOST:$DB_PORT)"; else fail "PostgreSQL erişilemiyor"; fi
  if [ -n "$(port_pid $BACKEND_PORT)" ]; then ok "Backend çalışıyor (port $BACKEND_PORT, PID $(port_pid $BACKEND_PORT))"; else fail "Backend çalışmıyor (port $BACKEND_PORT)"; fi
  if [ -n "$(port_pid $FRONTEND_PORT)" ]; then ok "Frontend çalışıyor (port $FRONTEND_PORT, PID $(port_pid $FRONTEND_PORT))"; else fail "Frontend çalışmıyor (port $FRONTEND_PORT)"; fi
}

# ---------------------------------------------------------------------------
start_postgres() {
  info "PostgreSQL kontrol ediliyor..."
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; then
    ok "PostgreSQL zaten çalışıyor."
  else
    warn "PostgreSQL çalışmıyor, başlatılmaya çalışılıyor (brew services)..."
    local pg_formula
    pg_formula="$(brew list --formula 2>/dev/null | grep -m1 '^postgresql')"
    if [ -n "$pg_formula" ]; then
      brew services start "$pg_formula" >/dev/null 2>&1
    fi
    local waited=0
    while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; do
      sleep 2; waited=$((waited + 2))
      if [ "$waited" -ge 20 ]; then
        fail "PostgreSQL başlatılamadı. Elle başlatıp tekrar deneyin: brew services start postgresql@18"
        exit 1
      fi
    done
    ok "PostgreSQL başlatıldı."
  fi

  if ! PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -lqt 2>/dev/null | cut -d '|' -f1 | grep -qw "$DB_NAME"; then
    warn "'$DB_NAME' veritabanı bulunamadı, oluşturuluyor..."
    if PGPASSWORD="$DB_PASS" createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" 2>/dev/null; then
      ok "'$DB_NAME' veritabanı oluşturuldu."
    else
      fail "'$DB_NAME' veritabanı oluşturulamadı. Elle oluşturmanız gerekebilir: createdb -U $DB_USER $DB_NAME"
      exit 1
    fi
  else
    ok "'$DB_NAME' veritabanı mevcut."
  fi
}

start_backend() {
  info "Backend kontrol ediliyor..."
  if [ -n "$(port_pid $BACKEND_PORT)" ]; then
    ok "Backend zaten çalışıyor (port $BACKEND_PORT), atlanıyor."
    return
  fi

  info "Backend başlatılıyor (Spring Boot, log: $BACKEND_LOG)..."
  (
    cd "$BACKEND_DIR" && \
    DB_URL="jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME" \
    DB_USERNAME="$DB_USER" \
    DB_PASSWORD="$DB_PASS" \
    nohup ./mvnw -q -DskipTests spring-boot:run > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )
  sleep 1

  info "Backend'in ayağa kalkması bekleniyor (ilk çalıştırmada bağımlılık indirme nedeniyle birkaç dakika sürebilir)..."
  if wait_for_http "http://localhost:$BACKEND_PORT" 180; then
    ok "Backend hazır: http://localhost:$BACKEND_PORT"
  else
    fail "Backend $BACKEND_LOG içindeki loglara göre zamanında ayağa kalkmadı. Son satırlar:"
    tail -n 30 "$BACKEND_LOG"
    exit 1
  fi
}

start_frontend() {
  info "Frontend kontrol ediliyor..."
  if [ -n "$(port_pid $FRONTEND_PORT)" ]; then
    ok "Frontend zaten çalışıyor (port $FRONTEND_PORT), atlanıyor."
    return
  fi

  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    info "node_modules bulunamadı, 'npm install' çalıştırılıyor..."
    (cd "$FRONTEND_DIR" && npm install)
  fi

  info "Frontend başlatılıyor (Vite, log: $FRONTEND_LOG)..."
  (
    cd "$FRONTEND_DIR" && \
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
  )

  if wait_for_http "http://localhost:$FRONTEND_PORT" 30; then
    ok "Frontend hazır: http://localhost:$FRONTEND_PORT"
  else
    fail "Frontend zamanında ayağa kalkmadı. Son loglar:"
    tail -n 30 "$FRONTEND_LOG"
    exit 1
  fi
}

# ---------------------------------------------------------------------------
case "${1:-start}" in
  stop)
    stop_all
    ;;
  status)
    status_all
    ;;
  start)
    start_postgres
    start_backend
    start_frontend
    echo
    ok "Sistem hazır!"
    echo "  Frontend : http://localhost:$FRONTEND_PORT"
    echo "  Backend  : http://localhost:$BACKEND_PORT"
    echo "  Loglar   : $BACKEND_LOG , $FRONTEND_LOG"
    echo "  Durdurmak için: ./start.sh stop"
    ;;
  *)
    echo "Kullanım: $0 [start|stop|status]"
    exit 1
    ;;
esac
