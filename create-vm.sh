#!/usr/bin/env bash
set -euo pipefail

VM_NAME="${VM_NAME:-smaf2}"
VM_RAM_MB="${VM_RAM_MB:-4096}"
VM_VCPUS="${VM_VCPUS:-4}"
VM_DISK_GB="${VM_DISK_GB:-20}"
LIBVIRT_POOL="${LIBVIRT_POOL:-default}"
LIBVIRT_NETWORK="${LIBVIRT_NETWORK:-default}"
ISO_PATH="${ISO_PATH:?Defina ISO_PATH con la ruta absoluta de la ISO Ubuntu 24.04.}"

if [[ "${EUID}" -ne 0 ]]; then
    echo "Ejecute este script con sudo en el host KVM/libvirt."
    exit 1
fi

if ! command -v virsh >/dev/null 2>&1 || ! command -v virt-install >/dev/null 2>&1; then
    echo "Faltan virsh o virt-install. En Ubuntu instale: apt-get install -y libvirt-clients virtinst"
    exit 1
fi

if [[ ! -f "${ISO_PATH}" ]]; then
    echo "No existe la ISO: ${ISO_PATH}"
    exit 1
fi

if virsh dominfo "${VM_NAME}" >/dev/null 2>&1; then
    echo "Ya existe una VM llamada ${VM_NAME}; no se realizó ningún cambio."
    exit 1
fi

if ! virsh pool-info "${LIBVIRT_POOL}" >/dev/null 2>&1; then
    echo "No existe el pool de almacenamiento ${LIBVIRT_POOL}."
    exit 1
fi

if ! virsh net-info "${LIBVIRT_NETWORK}" >/dev/null 2>&1; then
    echo "No existe la red libvirt ${LIBVIRT_NETWORK}."
    exit 1
fi

virt-install \
    --connect qemu:///system \
    --name "${VM_NAME}" \
    --memory "${VM_RAM_MB}" \
    --vcpus "${VM_VCPUS}" \
    --cpu host-model \
    --disk "pool=${LIBVIRT_POOL},size=${VM_DISK_GB},format=qcow2,bus=virtio" \
    --disk "path=${ISO_PATH},device=cdrom,bus=ide,readonly=on" \
    --network "network=${LIBVIRT_NETWORK},model=virtio" \
    --graphics vnc,listen=127.0.0.1 \
    --video virtio \
    --boot cdrom,hd \
    --noautoconsole

echo "VM ${VM_NAME} creada y encendida."
echo "Abra Cockpit > Máquinas virtuales > ${VM_NAME} para completar la instalación de Ubuntu."
