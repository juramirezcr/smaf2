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
