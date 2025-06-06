import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { WorkspaceService } from '../workspace.service';

@Injectable()
export class ParseWorkspaceSlugPipe implements PipeTransform {
  // inject any dependency
  constructor(private workspaceService: WorkspaceService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transform(slug: string, metadata: ArgumentMetadata) {
    //console.log('additional options', metadata.data);
    return await this.workspaceService.findWorkspaceBySlug(slug);
  }
}
