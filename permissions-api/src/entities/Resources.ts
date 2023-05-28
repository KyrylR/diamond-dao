import { BigInt } from "@graphprotocol/graph-ts";

import { Resource } from "../../generated/schema";

export function getResource(id: string): Resource {
  if (entityExists(id)) {
    const entity = Resource.load(id);
    return changetype<Resource>(entity);
  } else {
    throw new Error("Resource doesn't exist");
  }
}

export function createResource(id: string, resource: string): Resource {
  let entity: Resource;

  if (!entityExists(id)) {
    entity = new Resource(id);

    entity.name = resource;
    entity.allowedPermissions = new Array<string>();
    entity.disallowedPermission = new Array<string>();

    return entity;
  } else {
    throw new Error("Resource already exists");
  }
}

export function getOrCreateResource(role: string, resource: string): Resource {
  const id = role + "-" + resource;

  if (entityExists(id)) {
    return changetype<Resource>(Resource.load(id));
  } else {
    return createResource(id, resource);
  }
}

export function entityExists(id: string): bool {
  return Resource.load(id) != null;
}
