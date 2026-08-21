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

La importación limitada del catálogo/configuración de prefijos heredado se documenta en la sección
[Migración limitada de prefijos](DEPLOYMENT.md#migración-limitada-de-prefijos) de la guía de despliegue.

## Releases

Las versiones se publican mediante etiquetas `vX.Y.Z`. El flujo de CI valida PHP y React antes de aceptar cambios.

Para habilitar la consulta de releases y el botón de actualización en la interfaz administrativa, configure en producción:

```dotenv
SMAF_ADMIN_EMAIL=correo-del-administrador
GITHUB_REPOSITORY=juramirezcr/smaf2
GITHUB_TOKEN=token-de-github-con-permisos-Contents:Read-y-Actions:Read-and-write
```

El botón "Actualizar" de `/admin/releases` dispara el workflow `deploy.yml` mediante la API de
GitHub (no navega a GitHub) y muestra en la misma página el estado de la ejecución. El token
necesita permiso de **Actions: Read and write** además de `Contents: Read` para poder iniciar el
workflow y consultar su estado. El token no se expone a React, no se almacena en la base de datos
y no debe añadirse a Git.
