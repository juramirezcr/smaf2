# SMAF 2

Sistema de Monitoreo Anti-Fraude para la ingesta de CDR, análisis de reglas y alertas operativas.

## Componentes

- Laravel y React/TypeScript.
- MySQL para datos operativos y Redis para servicios de soporte.
- Procesamiento asíncrono de archivos CDR.
- Docker Compose para despliegue reproducible en Ubuntu 24.04.

## Desarrollo

```bash
composer install
npm ci
cp .env.example .env
php artisan key:generate
php artisan migrate
npm run dev
```

## Despliegue

Consulte [DEPLOYMENT.md](DEPLOYMENT.md). Las credenciales, tokens, volcados SQL y configuraciones de producción no se versionan.

## Releases

Las versiones se publican mediante etiquetas `vX.Y.Z`. El flujo de CI valida PHP y React antes de aceptar cambios.
