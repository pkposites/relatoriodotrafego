#!/usr/bin/env bash
# Verifica PDFs: páginas sem conteúdo (descontando cabeçalho, rodapé e marca d'água) e acentos.
set -euo pipefail
status=0
for f in "$@"; do
  n=$(pdfinfo "$f" | awk '/^Pages/{print $2}')
  for i in $(seq 1 "$n"); do
    words=$(pdftotext -layout -f "$i" -l "$i" "$f" - | grep -v -E "Plano de Ação do Tráfego ·|exemplo fictício|negócio fictício\)\s*$|^\s*[0-9]+ / [0-9]+|EXEMPLO|FICTÍCIO|^\s*$" | wc -w)
    if [ "$words" -lt 30 ]; then echo "PÁGINA QUASE VAZIA: $f p$i ($words palavras)"; status=1; fi
  done
  acc=$(pdftotext "$f" - | grep -c "ção" || true); [ "$acc" -gt 0 ] || { echo "SEM ACENTOS: $f"; status=1; }
  echo "ok $f ($n páginas)"
done
exit $status
