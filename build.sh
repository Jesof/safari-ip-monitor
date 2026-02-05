#!/bin/bash

# Safari IP Monitor - Build & Install Script
# Этот скрипт собирает приложение и устанавливает его в /Applications

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCHEME="Safari IP Monitor"
CONFIGURATION="Release"
BUILD_DIR="/tmp/SafariIPMonitorBuild"
APP_NAME="Safari IP Monitor.app"
INSTALL_DIR="/Applications"
EXTENSION_BUNDLE_ID="ru.jesof.safari.ipmonitor.extension"

# Загрузка локальных настроек подписи (если есть)
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

# Параметры подписи (из переменных окружения или .env)
CODE_SIGN_IDENTITY="${CODE_SIGN_IDENTITY:-Apple Development}"
DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-}"

# Проверка обязательных параметров
if [ -z "$DEVELOPMENT_TEAM" ]; then
    echo -e "${RED}Ошибка: DEVELOPMENT_TEAM не установлен${NC}"
    echo ""
    echo "Установите переменную окружения или создайте файл .env:"
    echo "  echo 'DEVELOPMENT_TEAM=YOUR_TEAM_ID' > .env"
    echo ""
    echo "Или передайте как аргумент:"
    echo "  DEVELOPMENT_TEAM=YOUR_TEAM_ID ./build.sh"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Safari IP Monitor - Build Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Шаг 1: Очистка предыдущей сборки
echo -e "${YELLOW}[1/6]${NC} Очистка предыдущей сборки..."
rm -rf "$BUILD_DIR"
echo -e "${GREEN}  ✓ Очищено${NC}"

# Шаг 2: Удаление старого приложения
echo -e "${YELLOW}[2/6]${NC} Удаление старого приложения..."
if [ -d "$INSTALL_DIR/$APP_NAME" ]; then
    # Завершаем приложение если запущено
    pkill -x "Safari IP Monitor" 2>/dev/null || true
    sleep 1
    rm -rf "$INSTALL_DIR/$APP_NAME"
    echo -e "${GREEN}  ✓ Старое приложение удалено${NC}"
else
    echo -e "${GREEN}  ✓ Старое приложение не найдено${NC}"
fi

# Шаг 3: Отмена регистрации расширения
echo -e "${YELLOW}[3/6]${NC} Отмена регистрации расширения..."
pluginkit -r "$INSTALL_DIR/$APP_NAME/Contents/PlugIns/Safari IP Monitor Extension.appex" 2>/dev/null || true
echo -e "${GREEN}  ✓ Расширение отменено${NC}"

# Шаг 4: Сборка проекта
echo -e "${YELLOW}[4/6]${NC} Сборка проекта..."
cd "$PROJECT_DIR"

xcodebuild \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    build \
    CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY" \
    DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" \
    SYMROOT="$BUILD_DIR" \
    2>&1 | while IFS= read -r line; do
        if [[ "$line" == *"error:"* ]]; then
            echo -e "${RED}  ✗ $line${NC}"
        elif [[ "$line" == *"warning:"* ]]; then
            echo -e "${YELLOW}  ⚠ $line${NC}"
        elif [[ "$line" == "** BUILD SUCCEEDED **" ]]; then
            echo -e "${GREEN}  ✓ Сборка успешна!${NC}"
        elif [[ "$line" == "** BUILD FAILED **" ]]; then
            echo -e "${RED}  ✗ Сборка провалена!${NC}"
            exit 1
        fi
    done

# Проверка результата сборки
if [ ! -d "$BUILD_DIR/$CONFIGURATION/$APP_NAME" ]; then
    echo -e "${RED}  ✗ Сборка не найдена: $BUILD_DIR/$CONFIGURATION/$APP_NAME${NC}"
    exit 1
fi

# Шаг 5: Установка приложения
echo -e "${YELLOW}[5/6]${NC} Установка в $INSTALL_DIR..."
cp -R "$BUILD_DIR/$CONFIGURATION/$APP_NAME" "$INSTALL_DIR/"
echo -e "${GREEN}  ✓ Приложение установлено${NC}"

# Регистрация расширения
pluginkit -a "$INSTALL_DIR/$APP_NAME/Contents/PlugIns/Safari IP Monitor Extension.appex" 2>/dev/null || true
echo -e "${GREEN}  ✓ Расширение зарегистрировано${NC}"

# Шаг 6: Очистка временных файлов
echo -e "${YELLOW}[6/6]${NC} Очистка временных файлов..."
rm -rf "$BUILD_DIR"
echo -e "${GREEN}  ✓ Очищено${NC}"

# Проверка подписи
echo ""
echo -e "${BLUE}Проверка подписи...${NC}"
if codesign -v "$INSTALL_DIR/$APP_NAME" 2>/dev/null; then
    echo -e "${GREEN}  ✓ Подпись валидна${NC}"
else
    echo -e "${YELLOW}  ⚠ Подпись не проверена (требуется Allow Unsigned Extensions)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Готово!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Следующие шаги:"
echo -e "  1. Запустить приложение: ${YELLOW}open \"$INSTALL_DIR/$APP_NAME\"${NC}"
echo -e "  2. Включить расширение в Safari → Settings → Extensions"
echo -e "  3. Убедиться что включено: ${YELLOW}Develop → Allow Unsigned Extensions${NC}"
echo ""

# Опционально: запуск приложения
read -p "Запустить приложение сейчас? [Y/n] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo -e "${BLUE}Запуск приложения...${NC}"
    open "$INSTALL_DIR/$APP_NAME"
    sleep 2
    open -a Safari
    echo -e "${GREEN}  ✓ Приложение и Safari запущены${NC}"
fi
