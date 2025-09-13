#!/usr/bin/env bash
# =============================================================================
# repo2md.sh — формирует единый Markdown «repo-content.md» для LLM-контекста.
#
# ЧТО ДЕЛАЕТ
#   Собирает переданные на вход файлы в один Markdown со структурой:
#     # REPO CONTENT
#     ## List
#     Files: N · Total: X · Est. tokens: ~Y
#     | # | File | Size | Lines |
#     ...
#     ## Files
#     ### <basename>
#     _Path: <relative/path>_
#     ```<language>        # безопасный код-фенс (длина бэктиков подбирается)
#     <содержимое файла / при необходимости head + tail>
#     ```
#     <!-- END OF SNAPSHOT -->
#
# ОСОБЕННОСТИ
#   • «List» — таблица с якорями; сводка (Files/Total/Tokens) сразу под заголовком «## List».
#   • «Files» — секции H3 (###) с относительным путём от текущего каталога.
#   • Язык подсветки по последнему расширению файла (маппинг популярных языков).
#   • Безопасные код-фенсы: длина бэктиков = (макс подряд в файле) + 1, минимум 3.
#   • Встроенный ignore (repo2mdignore) — shell-glob паттерны внутри скрипта по относительным путям.
#   • Опциональное усечение крупных файлов: head+tail по переменным LINES_HEAD / LINES_TAIL.
#
# ИСПОЛЬЗОВАНИЕ
#   chmod +x repo2md.sh
#   ./repo2md.sh path/to/index.html src/script.js README.md
#
# ЗАМЕТКИ
#   • Порядок файлов в выходе = порядок аргументов. Предупреждения/игнор — в stderr.
#   • Пишет результат в STDOUT (файл не создаётся)
# =============================================================================

set -euo pipefail

OUT="repo-content.md" # исторический артефакт; используется только для пропуска совпадающих входов
TMP="$(mktemp ".repo2md.tmp.XXXXXXXX")"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

usage() { echo "Usage: $(basename "$0") <file> [<file> ...]" >&2; }
[[ $# -eq 0 ]] && { usage; exit 2; }

# --- Helpers -----------------------------------------------------------------

lower() { tr '[:upper:]' '[:lower:]'; }

slugify() {
  # из строки делает якорь: [a-z0-9._-], прочее -> -
  printf '%s' "$1" | lower | sed -E 's/[^a-z0-9._-]+/-/g; s/-{2,}/-/g; s/^-+//; s/-+$//'
}

human_size() {
  local b="$1"
  if (( b < 1024 )); then
    printf "%d B" "$b"
  elif (( b < 1024*1024 )); then
    awk -v n="$b" 'BEGIN{printf "%.1f KB", n/1024}'
  else
    awk -v n="$b" 'BEGIN{printf "%.1f MB", n/1048576}'
  fi
}

ext_of() {
  local base="$1" lowbase
  lowbase="$(printf '%s' "$base" | lower)"
  case "$lowbase" in
    makefile)  echo "makefile"; return;;
    dockerfile) echo "dockerfile"; return;;
  esac
  if [[ "$base" == *.* ]]; then
    printf '%s\n' "${base##*.}" | lower
  else
    echo ""
  fi
}

lang_of_ext() {
  local ext="${1:-}"
  case "$ext" in
    js) echo "javascript" ;;
    ts) echo "typescript" ;;
    jsx) echo "jsx" ;;
    tsx) echo "tsx" ;;
    sh|bash) echo "bash" ;;
    zsh) echo "zsh" ;;
    py) echo "python" ;;
    rb) echo "ruby" ;;
    php) echo "php" ;;
    java) echo "java" ;;
    c|h) echo "c" ;;
    cc|cxx|cpp|hpp|hh|hxx) echo "cpp" ;;
    m) echo "objectivec" ;;
    mm) echo "objectivecpp" ;;
    swift) echo "swift" ;;
    kt|kts) echo "kotlin" ;;
    go) echo "go" ;;
    rs) echo "rust" ;;
    cs) echo "csharp" ;;
    scala) echo "scala" ;;
    sql) echo "sql" ;;
    yaml|yml) echo "yaml" ;;
    json) echo "json" ;;
    html|htm) echo "html" ;;
    css) echo "css" ;;
    md|markdown) echo "markdown" ;;
    toml) echo "toml" ;;
    makefile) echo "makefile" ;;
    dockerfile) echo "dockerfile" ;;
    txt|"") echo "" ;;
    *) echo "$ext" ;;
  esac
}

repeat_ticks() {
  # без seq для совместимости с bash 3.2 (macOS)
  local n="$1" i=0 out=""
  while [ "$i" -lt "$n" ]; do out="${out}\`"; i=$((i+1)); done
  printf '%s' "$out"
}

max_backticks_in_file_plus1() {
  awk '
    {
      line=$0; cnt=0;
      for(i=1;i<=length(line);i++){
        ch=substr(line,i,1);
        if(ch=="`"){cnt++} else { if(cnt>max){max=cnt}; cnt=0 }
      }
      if(cnt>max){max=cnt}
    }
    END{
      m = (max+1); if (m < 3) m = 3; print m
    }
  ' "$1"
}

safe_fence_for_file() {
  local path="$1" n
  n="$(max_backticks_in_file_plus1 "$path")"
  repeat_ticks "$n"
}

# inline code-span для заголовков: безопасно оборачивает basename
max_backticks_in_string_plus1() {
  awk '{
    line=$0; cnt=0;
    for(i=1;i<=length(line);i++){
      ch=substr(line,i,1);
      if(ch=="`"){cnt++} else { if(cnt>max){max=cnt}; cnt=0 }
    }
    if(cnt>max){max=cnt}
  } END { m=max+1; if(m<1)m=1; print m }'
}

code_span() {
  local s="$1" n ticks
  n=$(printf '%s' "$s" | max_backticks_in_string_plus1)
  ticks=$(repeat_ticks "$n")
  printf '%s%s%s' "$ticks" "$s" "$ticks"
}

wc_bytes() { wc -c < "$1" | tr -d '[:space:]'; }
wc_lines() { wc -l < "$1" | tr -d '[:space:]'; }

relpath() {
  # относительный путь от физического PWD; если вне — вернуть как есть
  local p="$1" pwdp
  pwdp="$(pwd -P)"
  case "$p" in
    "$OUT") echo "$OUT" ;;
    /*)
      if [[ "$p" == "$pwdp/"* ]]; then
        printf '%s\n' "${p#"$pwdp"/}"
      else
        printf '%s\n' "$p"
      fi
      ;;
    ./*) printf '%s\n' "${p#./}" ;;
    *)   printf '%s\n' "$p" ;;
  esac
}

# --- Inline repo2mdignore ----------------------------------------------------
# Матчим ОТНОСИТЕЛЬНЫЕ пути по shell-glob.
IGNORE_PATTERNS=(
  ".git/*" "*/.git/*"
  "node_modules/*" "*/node_modules/*"
  "dist/*" "*/dist/*"
  "build/*" "*/build/*"
  "coverage/*" "*/coverage/*"
  "target/*" "*/target/*"
  ".next/*" "*/.next/*"
  ".DS_Store"
  "*.map"
  "*.min.js"
)

ignore_match() {
  local rel="$1" pat
  for pat in "${IGNORE_PATTERNS[@]}"; do
    [[ "$rel" == $pat ]] && return 0
  done
  return 1
}

# бинарные/не-текстовые файлы — пропускаем содержимое
is_binary() {
  local out have_file=0
  if command -v file >/dev/null 2>&1; then
    have_file=1
  fi
  if (( have_file )); then
    out=$(file -b --mime "$1" 2>/dev/null || file -b "$1" 2>/dev/null || echo "")
    if printf '%s\n' "$out" | grep -qi 'charset=binary'; then return 0; fi
    if printf '%s\n' "$out" | grep -qi '^text/'; then return 1; fi
  fi
  # fallback: ищем NUL-байты в первых 4К
  if LC_ALL=C od -An -t x1 -N 4096 "$1" \
     | awk '{for(i=1;i<=NF;i++) if($i=="00"){print "bin"; exit}}' \
     | grep -q bin; then
    return 0
  fi
  return 1
}

# --- Collect inputs ----------------------------------------------------------

declare -a PATHS=() BASES=() SLUGS=() SIZES=() LINES=() RELS=()
total_bytes=0

for p in "$@"; do
  base="$(basename "$p" 2>/dev/null || true)"
  [[ "$base" == "$OUT" ]] && { printf 'warning: skipping output file "%s"\n' "$p" >&2; continue; }

  if [[ -f "$p" ]]; then
    rel="$(relpath "$p")"
    if ignore_match "$rel"; then
      printf 'info: ignored by repo2mdignore: %s\n' "$rel" >&2
      continue
    fi

    PATHS+=("$p")
    BASES+=("$base")
    SLUGS+=("$(slugify "$rel")")  # якорь из относительного пути — уникален
    RELS+=("$rel")

    b=$(wc_bytes "$p")
    l=$(wc_lines "$p")
    SIZES+=("$b")
    LINES+=("$l")
    total_bytes=$(( total_bytes + b ))
  else
    printf 'warning: not a regular file: %s\n' "$p" >&2
  fi
done

[[ ${#PATHS[@]} -eq 0 ]] && { echo "No valid files to process." >&2; exit 3; }

files_count="${#PATHS[@]}"
est_tokens=$(( (total_bytes + 3) / 4 ))  # грубая оценка (~4 байта на токен)

# --- Header & List (table) ---------------------------------------------------

{
  printf '# REPO CONTENT\n\n'
  printf '## List\n'
  printf 'Files: %d · Total: %s · Est. tokens: ~%d\n\n' \
    "$files_count" "$(human_size "$total_bytes")" "$est_tokens"

  printf '| # | File | Size | Lines |\n'
  printf '|---:|:-----|----:|-----:|\n'
  for i in "${!PATHS[@]}"; do
    base="${BASES[$i]}"; slug="${SLUGS[$i]}"; size="${SIZES[$i]}"; lines="${LINES[$i]}"
    printf '| %d | [`%s`](#%s) | %s | %s |\n' \
      "$((i+1))" "$base" "$slug" "$(human_size "$size")" "$lines"
  done
  printf '\n'

  printf '## Files\n\n'
} > "$TMP"

# --- Sections ----------------------------------------------------------------

HEAD="${LINES_HEAD:-0}"
TAIL="${LINES_TAIL:-0}"

for i in "${!PATHS[@]}"; do
  p="${PATHS[$i]}"; base="${BASES[$i]}"; slug="${SLUGS[$i]}"; rel="${RELS[$i]}"
  ext="$(ext_of "$base")"; lang="$(lang_of_ext "$ext")"
  total_l="${LINES[$i]}"

  {
    printf '<a id="%s"></a>\n' "$slug"
    printf '### %s\n\n' "$(code_span "$base")"
    printf '_Path: %s_\n\n' "$rel"

    if is_binary "$p"; then
      printf '... [binary file skipped: %s]\n\n' "$(human_size "${SIZES[$i]}")"
    else
      fence="$(safe_fence_for_file "$p")"
      if [[ -n "$lang" ]]; then
        printf '%s%s\n' "$fence" "$lang"   # БЕЗ пробела между фенсом и языком
      else
        printf '%s\n' "$fence"
      fi

      if (( HEAD>0 || TAIL>0 )); then
        if (( HEAD>0 && TAIL>0 && total_l > HEAD + TAIL )); then
          sed -n "1,${HEAD}p" < "$p"
          printf '\n... [truncated %d lines]\n\n' "$(( total_l - HEAD - TAIL ))"
          tail -n "$TAIL" < "$p"
        elif (( HEAD>0 && total_l > HEAD )); then
          sed -n "1,${HEAD}p" < "$p"
        elif (( TAIL>0 && total_l > TAIL )); then
          tail -n "$TAIL" < "$p"
        else
          cat < "$p"
        fi
      else
        cat < "$p"
      fi

      printf '\n%s\n\n' "$fence"
    fi
  } >> "$TMP"
done

printf '<!-- END OF SNAPSHOT -->\n' >> "$TMP"

# --- Finalize ----------------------------------------------------------------
cat "$TMP"
trap - EXIT
