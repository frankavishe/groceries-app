import { IsUUID } from 'class-validator';

export class AssignOrderDto {
  @IsUUID()
  agent_id: string;
}
