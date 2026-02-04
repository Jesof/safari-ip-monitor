#!/bin/bash

# Скрипт для генерации PNG иконок из SVG
# Использует Inkscape для рендеринга SVG

SVG_FILE="icon.svg"
SIZES=(16 32 48 96 128)

echo "Генерация PNG иконок из SVG с помощью Inkscape..."

# Проверяем наличие SVG файла
if [ ! -f "$SVG_FILE" ]; then
    echo "Ошибка: $SVG_FILE не найден"
    exit 1
fi

# Проверяем наличие Inkscape
if ! command -v inkscape &> /dev/null; then
    echo "Ошибка: Inkscape не установлен"
    echo "Установите Inkscape: brew install inkscape"
    exit 1
fi

# Генерируем PNG для каждого размера
for size in "${SIZES[@]}"; do
    echo "Создание icon-${size}.png..."
    
    # Используем Inkscape для рендеринга SVG
    inkscape "$SVG_FILE" \
        --export-type=png \
        --export-filename="icon-${size}.png" \
        --export-width=$size \
        --export-height=$size \
        > /dev/null 2>&1
    
    if [ -f "icon-${size}.png" ]; then
        echo "✓ icon-${size}.png создана"
    else
        echo "✗ Не удалось создать icon-${size}.png"
    fi
done

echo ""
echo "✓ Готово! Все иконки сгенерированы."
