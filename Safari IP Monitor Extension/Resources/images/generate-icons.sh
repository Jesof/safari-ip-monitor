#!/bin/bash

# Скрипт для генерации PNG иконок из SVG
# Использует qlmanage (встроенный в macOS) для рендеринга SVG

SVG_FILE="icon.svg"
SIZES=(16 32 48 96 128)

echo "Генерация PNG иконок из SVG..."

# Проверяем наличие SVG файла
if [ ! -f "$SVG_FILE" ]; then
    echo "Ошибка: $SVG_FILE не найден"
    exit 1
fi

# Генерируем PNG для каждого размера
for size in "${SIZES[@]}"; do
    echo "Создание icon-${size}.png..."
    
    # Используем qlmanage для рендеринга SVG
    qlmanage -t -s $size -o . "$SVG_FILE" > /dev/null 2>&1
    
    # Переименовываем результат
    if [ -f "icon.svg.png" ]; then
        mv "icon.svg.png" "icon-${size}.png"
        echo "✓ icon-${size}.png создана"
    else
        echo "✗ Не удалось создать icon-${size}.png"
    fi
done

echo ""
echo "Готово! Если иконки не созданы, используйте онлайн конвертер:"
echo "https://cloudconvert.com/svg-to-png"
echo ""
echo "Или создайте их в Xcode (File > New > Image Set)"
