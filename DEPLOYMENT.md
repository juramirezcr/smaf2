# Despliegue de SMAF 2

La aplicación se instala aislada del SMAF existente. Requiere Ubuntu 24.04, acceso `sudo` y salida a Internet.

## Creación de la VM

Ejecute en el host KVM/libvirt, no dentro de una VM:

```bash
ISO_PATH=/var/lib/libvirt/images/ubuntu-24.04-live-server-amd64.iso sudo ./create-vm.sh
```

El script crea `smaf2` con 4 vCPU, 4 GB de RAM, 20 GB de disco y la red `default` de libvirt. Finalice la instalación de Ubuntu desde la consola de Cockpit.

## Instalación de la aplicación

1. Copie el directorio `smaf-v2` a la nueva VM.
2. Ejecute `chmod +x install.sh && ./install.sh`.
3. Cree el primer usuario con `docker compose exec app php artisan tinker` y use el flujo de registro o active temporalmente el registro durante la puesta en marcha.

El instalador crea las contraseñas de MySQL y la clave de Laravel en `.env`; nunca copie las credenciales de la aplicación anterior.

## Publicación en `/smaf2/`

Mantenga `APP_URL=https://rhitcr.com/smaf2` en `.env` y publique el puerto local `8082` mediante el Nginx del servidor que termina TLS:

```nginx
location /smaf2/ {
    proxy_pass http://127.0.0.1:8082/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
```

Después de modificar `.env`, ejecute `docker compose exec app php artisan config:clear` y reinicie con `docker compose up -d`.

## Operación

Los servicios `queue` y `scheduler` procesan archivos y tareas sin bloquear la interfaz. Consulte su estado con `docker compose ps` y los eventos con `docker compose logs -f queue`.

### Actualización manual desde GitHub Actions

El administrador puede abrir **Actualizaciones** y seleccionar **Actualizar desde GitHub Actions**. Antes de usarlo, configure en el repositorio los siguientes secretos de Actions:

| Secreto | Valor |
| --- | --- |
| `SSH_HOST` | Dirección o nombre DNS de la VM |
| `SSH_USER` | Usuario de la VM que pertenece al grupo `docker` |
| `SSH_PRIVATE_KEY` | Clave privada ED25519 exclusiva para el despliegue |
| `SSH_KNOWN_HOSTS` | Salida de `ssh-keyscan -H <host>` revisada desde un canal confiable |
| `SMAF_DEPLOY_PATH` | Ruta absoluta del clon, por ejemplo `/home/smaf/smaf-v2` |

Agregue la clave pública correspondiente a `~/.ssh/authorized_keys` del usuario de despliegue en la VM. El workflow descarga la revisión elegida, reconstruye los contenedores y ejecuta las migraciones con `--force`; no modifica `.env` ni los volúmenes de MySQL, Redis o almacenamiento.

## Migración limitada de prefijos

`smaf:import-legacy-prefixes` lee un volcado MySQL **en streaming** y sólo interpreta los
`INSERT` de las tablas heredadas `prefijos` y `destinos_conf`. No ejecuta el SQL, no se conecta
a la base de datos anterior y no importa llamadas, usuarios, credenciales ni secretos. El comando
no muestra valores del volcado.

Requisitos:

- SMAF 2 debe estar desplegado y migrado (`docker compose ps` debe mostrar `app` y `db` sanos).
- Debe conocer el ID del usuario destino de SMAF 2 y el `usuario_id` del sistema heredado.
- Se necesita espacio disponible para el volcado dentro del volumen `app-storage`; el archivo de
  2.1 GB no se carga completo en memoria.
- Transfiera el volcado a la VM **sólo** si va a ejecutar esta importación. No lo añada al repositorio,
  a una imagen Docker, ni a copias de seguridad de código.

En la VM, desde el directorio de `smaf-v2`, copie el archivo al contenedor. Reemplace
`/ruta/segura/rhitcr_smaf.sql` por la ruta local temporal que recibió mediante una transferencia
segura:

```bash
docker compose exec app mkdir -p /var/www/html/storage/app/legacy-import
docker compose cp /ruta/segura/rhitcr_smaf.sql app:/var/www/html/storage/app/legacy-import/rhitcr_smaf.sql
```

Primero ejecute la simulación (no escribe nada). `--user` es el usuario actual de SMAF 2;
`--legacy-user` limita las filas de configuración al usuario heredado indicado. Si se omite
`--legacy-user`, se usa el mismo número de `--user`.

```bash
docker compose exec app php artisan smaf:import-legacy-prefixes \
  /var/www/html/storage/app/legacy-import/rhitcr_smaf.sql \
  --user=42 --legacy-user=7
```

Revise únicamente el resumen de conteos. Para persistir exactamente la misma importación, repita
el comando con `--apply`:

```bash
docker compose exec app php artisan smaf:import-legacy-prefixes \
  /var/www/html/storage/app/legacy-import/rhitcr_smaf.sql \
  --user=42 --legacy-user=7 --apply
```

Las reglas se identifican por usuario destino, alcance `prefix` y prefijo, por lo que repetir
`--apply` no crea duplicados. Las filas de `destinos_conf` tienen prioridad sobre los valores de
catálogo de `prefijos`. Las acciones heredadas `N`, `B`, `I` se convierten respectivamente en
`notify`, `block`, `ignore`; sólo el estado heredado activo (`A`) queda habilitado. Prefijos o
límites inválidos se omiten de forma conservadora. Cuando se usa `--apply`, las escrituras se
confirman como una sola transacción o se revierten por completo.

Después de comprobar el resultado, elimine el archivo de la VM y del volumen del contenedor:

```bash
docker compose exec app rm -f /var/www/html/storage/app/legacy-import/rhitcr_smaf.sql
```

## Migración de clientes y subusuarios

`smaf:import-legacy-clients` importa cada fila de `usuarios` como un cliente y cada fila de
`sub_usuarios` como una cuenta de ese cliente. La partición, el usuario API y la clave API quedan
asociados al cliente; las claves API se cifran al guardarse y las contraseñas de subusuarios se
convierten a hashes. El comando no imprime secretos.

Los usuarios importados inician sesión con su campo legado `usuario` y contraseña. Se permiten
correos repetidos en clientes distintos. Los nombres de usuario deben ser únicos en SMAF 2; ante un
conflicto, la importación se detiene y revierte completamente.

Copie el volcado de forma temporal como en la sección anterior y ejecútelo primero sin `--apply`:

```bash
docker compose exec app php artisan smaf:import-legacy-clients \
  /var/www/html/storage/app/legacy-import/rhitcr_smaf.sql
```

Después de revisar el resumen de conteos, aplique la importación:

```bash
docker compose exec app php artisan smaf:import-legacy-clients \
  /var/www/html/storage/app/legacy-import/rhitcr_smaf.sql --apply
```
