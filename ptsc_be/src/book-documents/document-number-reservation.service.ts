import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  DocumentNumberReservationEntity,
  ReservationStatus,
} from './entities/document-number-reservation.entity';
import { ReservationSubscriberEntity } from './entities/reservation-subscriber.entity';
import { BookDocumentEntity } from './entities/book-document.entity';
import { UserEntity } from '../users/entities/user.entity';
import {
  CreateReservationDto,
  UpdateReservationDto,
  FilterReservationDto,
} from './dto/document-number-reservation.dto';

import { OutgoingDocumentEntity } from '../outgoing-documents/entities/outgoing-document.entity';

@Injectable()
export class DocumentNumberReservationService {
  constructor(
    @InjectRepository(DocumentNumberReservationEntity, 'mssqlConnection')
    private readonly reservationRepo: Repository<DocumentNumberReservationEntity>,
    @InjectRepository(ReservationSubscriberEntity, 'mssqlConnection')
    private readonly subscriberRepo: Repository<ReservationSubscriberEntity>,
    @InjectRepository(BookDocumentEntity, 'mssqlConnection')
    private readonly bookDocumentRepo: Repository<BookDocumentEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(OutgoingDocumentEntity, 'mssqlConnection')
    private readonly outgoingDocRepo: Repository<OutgoingDocumentEntity>,
  ) {}

  /**
   * Tạo mới đơn giữ số văn bản
   */
  async createReservation(
    createDto: CreateReservationDto,
    currentUserId?: string,
  ): Promise<DocumentNumberReservationEntity> {
    const { bookDocumentId, reservedNumber, note, subscriberUserIds } = createDto;

    // 1. Kiểm tra sổ văn bản có tồn tại không
    const bookDocument = await this.bookDocumentRepo.findOne({
      where: { book_document_id: bookDocumentId },
    });
    if (!bookDocument) {
      throw new NotFoundException('Sổ văn bản không tồn tại');
    }

    const bookCount = bookDocument.count ? Number(bookDocument.count) : 0;

    // 2. Tự động tính hoặc kiểm tra số giữ
    let finalReservedNumber = reservedNumber;

    if (reservedNumber) {
      // Khi người dùng tự nhập số giữ
      // a. Kiểm tra trong danh sách đơn giữ số
      const existingReservation = await this.reservationRepo.findOne({
        where: {
          bookDocumentId,
          reservedNumber,
          status: In([ReservationStatus.RESERVED, ReservationStatus.USED]),
        },
      });

      if (existingReservation) {
        throw new ConflictException(
          `Số ${reservedNumber} trong sổ "${bookDocument.name}" đã được giữ hoặc đã sử dụng`,
        );
      }

      // b. Kiểm tra trong danh sách văn bản đi thực tế đã cấp phát (outgoing_documents)
      const existingOutgoing = await this.outgoingDocRepo.findOne({
        where: [
          { bookDocumentId, toBook: reservedNumber },
          { bookDocumentId, releaseNo: String(reservedNumber) },
        ],
      });

      if (existingOutgoing) {
        throw new ConflictException(
          `Số ${reservedNumber} trong sổ "${bookDocument.name}" đã được sử dụng cấp phát cho văn bản đi khác`,
        );
      }

      // c. Kiểm tra với số đếm nhỏ hơn hiện tại của sổ (số đếm hiện tại là số dự định cấp phát tiếp theo)
      if (reservedNumber < bookCount) {
        throw new ConflictException(
          `Số ${reservedNumber} trong sổ "${bookDocument.name}" đã được sử dụng (số đếm hiện tại của sổ là ${bookCount})`,
        );
      }
    } else {
      // Tự động tính số giữ nếu không truyền vào (bắt đầu từ bookCount)
      const maxRes = await this.reservationRepo.findOne({
        where: { bookDocumentId },
        order: { reservedNumber: 'DESC' },
      });
      const maxReserved = maxRes ? maxRes.reservedNumber : 0;
      finalReservedNumber = Math.max(maxReserved, bookCount);

      let isConflict = true;
      while (isConflict) {
        const existingReservation = await this.reservationRepo.findOne({
          where: {
            bookDocumentId,
            reservedNumber: finalReservedNumber,
            status: In([ReservationStatus.RESERVED, ReservationStatus.USED]),
          },
        });

        const existingOutgoing = await this.outgoingDocRepo.findOne({
          where: [
            { bookDocumentId, toBook: finalReservedNumber },
            { bookDocumentId, releaseNo: String(finalReservedNumber) },
          ],
        });

        if (existingReservation || existingOutgoing) {
          finalReservedNumber++;
        } else {
          isConflict = false;
        }
      }
    }

    // 3. Chuẩn bị danh sách user giữ số
    const targetUserIds = new Set<string>();
    if (subscriberUserIds && subscriberUserIds.length > 0) {
      subscriberUserIds.forEach((uid) => targetUserIds.add(uid));
    }
    if (currentUserId && targetUserIds.size === 0) {
      targetUserIds.add(currentUserId);
    }

    const subscribers: Partial<ReservationSubscriberEntity>[] = [];
    if (targetUserIds.size > 0) {
      const userList = Array.from(targetUserIds);
      const existingUsers = await this.userRepo.find({
        where: { id: In(userList) },
      });
      const validUserIds = new Set(existingUsers.map((u) => u.id));

      userList.forEach((uid) => {
        if (validUserIds.has(uid)) {
          subscribers.push({ userId: uid });
        }
      });
    }

    // 4. Tạo bản ghi reservation
    const newReservation = this.reservationRepo.create({
      bookDocumentId,
      reservedNumber: finalReservedNumber,
      note,
      status: ReservationStatus.RESERVED,
      subscribers: subscribers as ReservationSubscriberEntity[],
    });

    const saved = await this.reservationRepo.save(newReservation);

    return this.findReservationById(saved.id);
  }

  /**
   * Lấy danh sách số giữ có phân trang và bộ lọc
   */
  async findAllReservations(filterDto: FilterReservationDto) {
    const { bookDocumentId, status, search, page = 1, limit = 20 } = filterDto;

    const query = this.reservationRepo
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.bookDocument', 'bookDocument')
      .leftJoinAndSelect('reservation.subscribers', 'subscribers')
      .leftJoinAndSelect('subscribers.user', 'user');

    if (bookDocumentId) {
      query.andWhere('reservation.bookDocumentId = :bookDocumentId', {
        bookDocumentId,
      });
    }

    if (status) {
      query.andWhere('reservation.status = :status', { status });
    }

    if (search) {
      const searchNum = parseInt(search, 10);
      const searchStr = `%${search}%`;
      if (!isNaN(searchNum)) {
        query.andWhere(
          '(reservation.reservedNumber = :searchNum OR reservation.note LIKE :searchStr OR bookDocument.name LIKE :searchStr OR bookDocument.to_book_code LIKE :searchStr OR user.fullName LIKE :searchStr OR user.name LIKE :searchStr OR user.username LIKE :searchStr)',
          { searchNum, searchStr },
        );
      } else {
        query.andWhere(
          '(reservation.note LIKE :searchStr OR bookDocument.name LIKE :searchStr OR bookDocument.to_book_code LIKE :searchStr OR user.fullName LIKE :searchStr OR user.name LIKE :searchStr OR user.username LIKE :searchStr)',
          { searchStr },
        );
      }
    }

    query
      .orderBy('reservation.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Hàm nội bộ: Tìm chi tiết đơn giữ số theo ID
   */
  async findReservationById(
    id: string,
  ): Promise<DocumentNumberReservationEntity> {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: ['bookDocument', 'subscribers', 'subscribers.user'],
    });

    if (!reservation) {
      throw new NotFoundException('Không tìm thấy thông tin giữ số');
    }

    return reservation;
  }

  /**
   * Cập nhật thông tin đơn giữ số (ghi chú, danh sách user giữ, trạng thái)
   */
  async updateReservation(
    id: string,
    updateDto: UpdateReservationDto,
  ): Promise<DocumentNumberReservationEntity> {
    await this.findReservationById(id);

    const updateFields: Partial<DocumentNumberReservationEntity> = {};

    if (updateDto.note !== undefined) {
      updateFields.note = updateDto.note;
    }

    if (updateDto.status !== undefined) {
      updateFields.status = updateDto.status;
    }

    if (Object.keys(updateFields).length > 0) {
      await this.reservationRepo.update(id, updateFields);
    }

    if (updateDto.subscriberUserIds !== undefined) {
      // Xóa danh sách subscriber cũ
      await this.subscriberRepo.delete({ reservationId: id });

      // Thêm danh sách subscriber mới nếu có
      if (updateDto.subscriberUserIds.length > 0) {
        const uniqueUserIds = Array.from(new Set(updateDto.subscriberUserIds));
        const existingUsers = await this.userRepo.find({
          where: { id: In(uniqueUserIds) },
        });
        const validUserIds = existingUsers.map((u) => u.id);

        const newSubscribers = validUserIds.map((uid) =>
          this.subscriberRepo.create({
            reservationId: id,
            userId: uid,
          }),
        );
        await this.subscriberRepo.save(newSubscribers);
      }
    }

    return this.findReservationById(id);
  }

  /**
   * Đánh dấu số đã sử dụng (status = USED)
   */
  async markAsUsed(id: string): Promise<DocumentNumberReservationEntity> {
    const reservation = await this.findReservationById(id);

    if (reservation.status === ReservationStatus.USED) {
      throw new BadRequestException('Số văn bản này đã được đánh dấu sử dụng');
    }

    reservation.status = ReservationStatus.USED;
    await this.reservationRepo.save(reservation);

    return this.findReservationById(id);
  }
}
