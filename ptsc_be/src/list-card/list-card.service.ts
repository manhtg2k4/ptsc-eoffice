import { Injectable } from '@nestjs/common';
import { CreateListCardDto } from './dto/create-list-card.dto';
import { UpdateListCardDto } from './dto/update-list-card.dto';

@Injectable()
export class ListCardService {
  create(createListCardDto: CreateListCardDto) {
    return 'This action adds a new listCard';
  }

  findAll() {
    return `This action returns all listCard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} listCard`;
  }

  update(id: number, updateListCardDto: UpdateListCardDto) {
    return `This action updates a #${id} listCard`;
  }

  remove(id: number) {
    return `This action removes a #${id} listCard`;
  }
}
