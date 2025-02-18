---
title: Containerization
status: Completed
category: Technology
---
## Containerization

### What it is

Containerization is the process of bundling an application and its dependencies into a [container image](https://github.com/cncf/glossary/blob/main/definitions/container-image.md). The container build process requires adherence to the [Open Container Initiative](https://opencontainers.org) (OCI) standard. As long as the output is a container image that adheres to this standard, which containerization tool is used doesn't matter.

### The problem it addresses 

Before containers became prevalent, organizations relied on virtual machines (VMs) to orchestrate multiple applications on a single [bare-metal machine](https://github.com/cncf/glossary/blob/main/definitions/bare_metal_machine.md). VMs are significantly larger than containers and require a hypervisor to run. Due to the storage, backup, and transfer of these larger VM templates, creating the VM templates is also slow. Additionally, VMs can suffer from configuration drift which violates the principle of [immutability](https://github.com/cncf/glossary/blob/main/definitions/immutable_infrastructure.md).

### How it helps

Container images are lightweight (unlike traditional VMs) and the containerization process requires a file with a list of dependencies. This file can be version controlled and the build process automated, allowing an organization to focus on other priorities while the automated processes take care of the build. A container image is stored by a unique identifier that is tied to its exact content and configuration. As containers are scheduled and rescheduled, they are always reset to their initial state which eliminates configuration drift.
