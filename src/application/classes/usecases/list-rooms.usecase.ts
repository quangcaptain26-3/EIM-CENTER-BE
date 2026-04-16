import { IRoomRepo } from '../../../domain/classes/repositories/class.repo.port';

export class ListRoomsUseCase {
  constructor(private readonly roomRepo: IRoomRepo) {}

  async execute() {
    return await this.roomRepo.findAll();
  }
}
