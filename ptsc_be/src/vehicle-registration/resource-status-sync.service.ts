import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListCarEntity, CarStatus } from 'src/list-cars/entities/list-car.entity';
import { ListDriverEntity, DriverStatus } from 'src/list-drivers/entities/list-driver.entity';
import { VehicleRegistrationEntity, VehicleState } from 'src/vehicle-registration/entities/vehicle-registration.entity';

@Injectable()
export class ResourceStatusSyncService {
  private readonly logger = new Logger(ResourceStatusSyncService.name);

  constructor(
    @InjectRepository(ListCarEntity, 'mssqlConnection')
    private readonly listCarRepo: Repository<ListCarEntity>,
    @InjectRepository(ListDriverEntity, 'mssqlConnection')
    private readonly listDriverRepo: Repository<ListDriverEntity>,
    @InjectRepository(VehicleRegistrationEntity, 'mssqlConnection')
    private readonly registrationRepo: Repository<VehicleRegistrationEntity>,
  ) {}

  /**
   * Đồng bộ toàn bộ trạng thái xe và tài xế dựa trên các yêu cầu đang hoạt động
   */
  async syncAll() {
    try {
      // 1. Fetch all active vehicle registrations
      const activeRegistrations = await this.registrationRepo.query(`
        SELECT vehicle_state AS vehicleState, driver_ids AS driverIds, car_ids AS carIds, coordination_information AS coordinationInformation
        FROM vehicle_registrations WITH (NOLOCK)
        WHERE status = 1
      `);

      const bookedDriverIds = new Set<string>();
      const usingDriverIds = new Set<string>();
      const bookedCarIds = new Set<string>();
      const usingCarIds = new Set<string>();

      for (const vr of activeRegistrations) {
        const state = vr.vehicleState;
        if (state !== VehicleState.DA_PHAN_CONG && state !== VehicleState.TRONG_TIEN_TRINH) {
          continue;
        }

        const isTrongTienTrinh = state === VehicleState.TRONG_TIEN_TRINH;

        // Parse driver IDs
        if (vr.driverIds) {
          try {
            const parsed = JSON.parse(vr.driverIds);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            for (const dId of list) {
              if (dId) {
                bookedDriverIds.add(String(dId));
                if (isTrongTienTrinh) {
                  usingDriverIds.add(String(dId));
                }
              }
            }
          } catch {
            // handle comma-separated fallback or single ID
            const list = vr.driverIds.split(',').map(s => s.trim()).filter(Boolean);
            for (const dId of list) {
              bookedDriverIds.add(dId);
              if (isTrongTienTrinh) {
                usingDriverIds.add(dId);
              }
            }
          }
        }

        // Parse car IDs
        if (vr.carIds) {
          try {
            const parsed = JSON.parse(vr.carIds);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            for (const cId of list) {
              if (cId) {
                bookedCarIds.add(String(cId));
                if (isTrongTienTrinh) {
                  usingCarIds.add(String(cId));
                }
              }
            }
          } catch {
            const list = vr.carIds.split(',').map(s => s.trim()).filter(Boolean);
            for (const cId of list) {
              bookedCarIds.add(cId);
              if (isTrongTienTrinh) {
                usingCarIds.add(cId);
              }
            }
          }
        }

        // Parse coordination information
        if (vr.coordinationInformation) {
          try {
            const coordination = JSON.parse(vr.coordinationInformation);
            if (Array.isArray(coordination)) {
              for (const item of coordination) {
                if (item.driverId) {
                  bookedDriverIds.add(String(item.driverId));
                  if (isTrongTienTrinh) {
                    usingDriverIds.add(String(item.driverId));
                  }
                }
                if (item.carId) {
                  bookedCarIds.add(String(item.carId));
                  if (isTrongTienTrinh) {
                    usingCarIds.add(String(item.carId));
                  }
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // 2. Sync Drivers
      // Query current state of active drivers
      const currentDrivers = await this.listDriverRepo.query(`
        SELECT driver_id AS driverId, status_driver AS statusDriver, booking_available AS bookingAvailable
        FROM list_drivers WITH (NOLOCK)
        WHERE status = 1
      `);

      for (const d of currentDrivers) {
        const dId = String(d.driverId);
        let targetStatus = DriverStatus.SAN_SANG;
        let targetBookingAvailable = 1;

        if (usingDriverIds.has(dId)) {
          targetStatus = DriverStatus.DANG_SU_DUNG;
        }
        if (bookedDriverIds.has(dId)) {
          targetBookingAvailable = 0;
        }

        // Only update if there is a difference
        if (d.statusDriver !== targetStatus || Number(d.bookingAvailable) !== targetBookingAvailable) {
          await this.listDriverRepo.query(`
            UPDATE list_drivers
            SET status_driver = @0, booking_available = @1
            WHERE driver_id = @2 AND status = 1
          `, [targetStatus, targetBookingAvailable, dId]);
        }
      }

      // 3. Sync Cars
      // Query current state of active cars
      const currentCars = await this.listCarRepo.query(`
        SELECT id, status_car AS statusCar, booking_available AS bookingAvailable, maintenance
        FROM list_cars WITH (NOLOCK)
        WHERE status = 1
      `);

      for (const c of currentCars) {
        const cId = String(c.id);
        let targetStatus = c.maintenance === 'co' ? CarStatus.BAO_DUONG : CarStatus.SAN_SANG;
        let targetBookingAvailable = 1;

        if (usingCarIds.has(cId)) {
          targetStatus = CarStatus.DANG_SU_DUNG;
        }
        if (bookedCarIds.has(cId)) {
          targetBookingAvailable = 0;
        }

        // Only update if there is a difference
        if (c.statusCar !== targetStatus || Number(c.bookingAvailable) !== targetBookingAvailable) {
          await this.listCarRepo.query(`
            UPDATE list_cars
            SET status_car = @0, booking_available = @1
            WHERE id = @2 AND status = 1
          `, [targetStatus, targetBookingAvailable, cId]);
        }
      }

    } catch (error) {
      this.logger.error('Lỗi khi đồng bộ trạng thái tài nguyên: ' + error.message);
    }
  }

  /**
   * Đồng bộ cho một nhóm ID cụ thể (Dùng khi cập nhật real-time)
   */
  async syncResources(carIds: string[], driverIds: string[]) {
    if (!carIds.length && !driverIds.length) return;
    // Để đơn giản và chính xác tuyệt đối, ta chạy syncAll (rất nhanh với SQL Update)
    // Hoặc có thể tối ưu thêm bằng cách thêm WHERE ld.driver_id IN (...)
    await this.syncAll();
  }
}
