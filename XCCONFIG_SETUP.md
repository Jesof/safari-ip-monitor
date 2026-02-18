# Настройка .xcconfig для Safari IP Monitor

## Быстрая настройка через скрипт

Выполните команду в терминале (замените `YOUR_TEAM_ID` на ваш Team ID):

```bash
# Копируем шаблоны
cp .xcconfig.example Configurations/Debug.xcconfig
cp .xcconfig.example Configurations/Release.xcconfig

# Заменяем Team ID
sed -i '' 's/YOUR_TEAM_ID/7GFBS985A6/g' Configurations/Debug.xcconfig
sed -i '' 's/YOUR_TEAM_ID/7GFBS985A6/g' Configurations/Release.xcconfig
```

## Ручная настройка

1. **Скопируйте файлы конфигурации:**
   ```bash
   cp .xcconfig.example Configurations/Debug.xcconfig
   cp .xcconfig.example Configurations/Release.xcconfig
   ```

2. **Откройте файлы в текстовом редакторе:**
   - `Configurations/Debug.xcconfig`
   - `Configurations/Release.xcconfig`

3. **Замените `YOUR_TEAM_ID` на ваш Apple Developer Team ID:**
   ```
   DEVELOPMENT_TEAM = 7GFBS985A6;
   ```

   Где найти Team ID:
   - **Apple Developer Portal**: https://developer.apple.com/account → Membership
   - **Xcode**: Xcode → Settings → Accounts → Ваш аккаунт → Team ID

4. **Настройте Xcode проект:**
   - Откройте `Safari IP Monitor.xcodeproj` в Xcode
   - Выберите проект в навигаторе (слева)
   - Выберите target **"Safari IP Monitor"**
   - Перейдите на вкладку **"Build Settings"**
   - В поиске введите "xcconfig"
   - Найдите **"Base Configuration"** и установите:
     - Debug: `Configurations/Debug.xcconfig`
     - Release: `Configurations/Release.xcconfig`
   - Повторите для target **"Safari IP Monitor Extension"**

5. **Удалите хардкод Team ID из проекта:**
   - В том же разделе "Build Settings" найдите **"Development Team"**
   - Удалите значение для всех конфигураций (оставьте пустым или `${DEVELOPMENT_TEAM}`)
   - Теперь значение будет браться из `.xcconfig` файлов

## Проверка

После настройки попробуйте собрать проект:

```bash
# Через build.sh (использует .env)
./build.sh

# Или через Xcode
xcodebuild -scheme "Safari IP Monitor" -configuration Debug build
```

## Преимущества такого подхода

- ✅ Team ID не хранится в `project.pbxproj`
- ✅ Можно безопасно коммитить проект в Git
- ✅ Каждый разработчик использует свой Team ID
- ✅ Удобное управление конфигурациями для Debug/Release

## Структура файлов

```
Configurations/
├── Debug.xcconfig      # Настройки для Debug (игнорируется в Git)
├── Release.xcconfig    # Настройки для Release (игнорируется в Git)
└── Shared.xcconfig     # Общие настройки (коммитится в Git)
```

## Примечание

Файлы `Debug.xcconfig` и `Release.xcconfig` добавлены в `.gitignore`, чтобы предотвратить случайную отправку Team ID в репозиторий.
