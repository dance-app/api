import {
  Material,
  MaterialVisibility,
  User,
  Workspace,
  DanceType,
} from '@prisma/client';

export class MaterialResponseDto {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  name: string;
  description?: string;
  videoUrls: string[];
  imageUrls: string[];
  visibility: MaterialVisibility;
  workspaceId?: number;
  parentMaterialId?: number;
  danceTypeId?: number;

  // Related entities
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  workspace?: Pick<Workspace, 'id' | 'name' | 'slug'>;
  parentMaterial?: Pick<Material, 'id' | 'name'>;
  childMaterials?: Pick<Material, 'id' | 'name'>[];
  danceType?: Pick<DanceType, 'id' | 'name' | 'category'>;

  constructor(
    material: Material & {
      createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
      workspace?: Pick<Workspace, 'id' | 'name' | 'slug'>;
      parentMaterial?: Pick<Material, 'id' | 'name'>;
      childMaterials?: Pick<Material, 'id' | 'name'>[];
      danceType?: Pick<DanceType, 'id' | 'name' | 'category'>;
    },
  ) {
    this.id = material.id;
    this.createdAt = material.createdAt;
    this.updatedAt = material.updatedAt;
    this.deletedAt = material.deletedAt;
    this.name = material.name;
    this.description = material.description;
    this.videoUrls = material.videoUrls;
    this.imageUrls = material.imageUrls;
    this.visibility = material.visibility;
    this.workspaceId = material.workspaceId;
    this.parentMaterialId = material.parentMaterialId;
    this.danceTypeId = material.danceTypeId;
    this.createdBy = material.createdBy;
    this.workspace = material.workspace;
    this.parentMaterial = material.parentMaterial;
    this.childMaterials = material.childMaterials;
    this.danceType = material.danceType;
  }
}
