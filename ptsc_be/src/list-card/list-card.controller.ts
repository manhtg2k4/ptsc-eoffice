import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListCardService } from './list-card.service';
import { CreateListCardDto } from './dto/create-list-card.dto';
import { UpdateListCardDto } from './dto/update-list-card.dto';

@ApiTags('Danh sách Thẻ')
@Controller('list-card')
export class ListCardController {
  constructor(private readonly listCardService: ListCardService) {}

  @Post()
  create(@Body() createListCardDto: CreateListCardDto) {
    return this.listCardService.create(createListCardDto);
  }

  @Get()
  findAll() {
    return this.listCardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listCardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateListCardDto: UpdateListCardDto) {
    return this.listCardService.update(+id, updateListCardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.listCardService.remove(+id);
  }
}
