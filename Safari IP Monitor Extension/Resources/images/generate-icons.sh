#!/bin/bash

# Скрипт для генерации PNG иконок из SVG
# Использует rsvg-convert (librsvg) для максимально чёткого рендеринга

# Разные SVG для разных целей
SAFARI_SVG="icon-safari.svg"  # Минималистичный стиль для расширения
MACOS_SVG="icon-macos.svg"    # Современный macOS стиль для приложения

# Размеры для Safari Extension
EXTENSION_SIZES=(16 32 48 96 128)
# Размеры для macOS App
MACOS_SIZES=(16 32 64 128 256 512 1024)

echo "Генерация PNG иконок из SVG с помощью rsvg-convert..."

# Проверяем наличие SVG файлов
if [ ! -f "$SAFARI_SVG" ]; then
    echo "Ошибка: $SAFARI_SVG не найден"
    exit 1
fi

if [ ! -f "$MACOS_SVG" ]; then
    echo "Ошибка: $MACOS_SVG не найден"
    exit 1
fi

# Проверяем наличие rsvg-convert
if ! command -v rsvg-convert &> /dev/null; then
    echo "Ошибка: rsvg-convert не установлен"
    echo "Установите librsvg: brew install librsvg"
    exit 1
fi

# Генерируем PNG для Safari Extension
echo ""
echo "📦 Генерация иконок для Safari Extension..."
for size in "${EXTENSION_SIZES[@]}"; do
    echo "Создание icon-${size}.png..."
    
    # rsvg-convert даёт более чёткие границы
    rsvg-convert "$SAFARI_SVG" \
        --format=png \
        --output="icon-${size}.png" \
        --width=$size \
        --height=$size \
        --keep-aspect-ratio
    
    if [ -f "icon-${size}.png" ]; then
        echo "✓ icon-${size}.png создана"
    else
        echo "✗ Не удалось создать icon-${size}.png"
    fi
done

# Генерируем PNG для macOS приложения
echo ""
echo "🖥️  Генерация иконок для macOS приложения..."
APPICON_DIR="../../../Safari IP Monitor/Assets.xcassets/AppIcon.appiconset"

# Функция для экспорта с максимальным качеством
export_icon() {
    local size=$1
    local filename=$2
    
    rsvg-convert "$MACOS_SVG" \
        --format=png \
        --output="$APPICON_DIR/$filename" \
        --width=$size \
        --height=$size \
        --keep-aspect-ratio
    
    echo "✓ $filename (${size}x${size})"
}

# 16x16 @1x
export_icon 16 "icon_16x16.png"

# 16x16 @2x = 32x32
export_icon 32 "icon_16x16@2x.png"

# 32x32 @1x
export_icon 32 "icon_32x32.png"

# 32x32 @2x = 64x64
export_icon 64 "icon_32x32@2x.png"

# 128x128 @1x
export_icon 128 "icon_128x128.png"

# 128x128 @2x = 256x256
export_icon 256 "icon_128x128@2x.png"

# 256x256 @1x
export_icon 256 "icon_256x256.png"

# 256x256 @2x = 512x512
export_icon 512 "icon_256x256@2x.png"

# 512x512 @1x
export_icon 512 "icon_512x512.png"

# 512x512 @2x = 1024x1024
export_icon 1024 "icon_512x512@2x.png"

echo ""
echo "✓ Готово! Все иконки сгенерированы."
