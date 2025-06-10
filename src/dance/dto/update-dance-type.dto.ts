import { PartialType } from '@nestjs/mapped-types';

import { CreateDanceTypeDto } from './create-dance-type.dto';

export class UpdateDanceTypeDto extends PartialType(CreateDanceTypeDto) {}
