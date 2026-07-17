#!/bin/bash
# Iniciar wa-panel: prepara el repo git y lo sube a GitHub.
# Uso: poné este archivo DENTRO de la carpeta wa-panel (junto a package.json)
# y hacele doble clic.

cd "$(dirname "$0")"

echo "=================================================="
echo " wa-panel - inicializando repo en:"
echo " $(pwd)"
echo "=================================================="
echo

if [ ! -f "package.json" ]; then
  echo "ERROR: no encuentro package.json acá."
  echo "Movés este archivo .command adentro de la carpeta wa-panel y lo corrés de nuevo."
  read -p "Presioná Enter para cerrar..."
  exit 1
fi

if [ ! -d ".git" ]; then
  git init
  git branch -M main
else
  echo "Ya hay un repo git acá, sigo."
fi

git add .
git commit -m "wa-panel inicial" 2>/dev/null || echo "(nada nuevo para commitear)"

echo
echo "Necesito la URL del repo vacío que creaste en GitHub."
echo "Ejemplo: https://github.com/tu-usuario/wa-panel.git"
read -p "Pegá la URL acá: " REPO_URL

if [ -z "$REPO_URL" ]; then
  echo "No pusiste ninguna URL. Corré el script de nuevo cuando la tengas."
  read -p "Presioná Enter para cerrar..."
  exit 1
fi

if git remote | grep -q origin; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

echo
echo "Subiendo a GitHub (te puede pedir usuario/contraseña o token)..."
git push -u origin main

echo
echo "=================================================="
echo " Listo. Si no hubo errores arriba, ya está en GitHub."
echo " Ahora andá a vercel.com e importá ese repo."
echo "=================================================="
read -p "Presioná Enter para cerrar..."
