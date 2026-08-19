import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/users/entities/user.entity';
import { HrmSyncEmployeeDto } from './dto/hrm-sync.dto';

export interface NormalizedEmployeeData {
  name: string;
  emailUser: string | null;
  phoneNumberUser: string | null;
  position: string | null;
  codeND: string;
  birthday: Date | null;
  gender: string | null;
  identificationCard: string | null;
  leader: string | null;
  organizationCode: string | null;
  status: number;
}

@Injectable()
export class HrmCompareService {
  normalize(payload: HrmSyncEmployeeDto): NormalizedEmployeeData {
    return {
      name: (payload.name || '').trim(),
      emailUser: this.toNullableString(payload.emailUser),
      phoneNumberUser: this.toNullableString(payload.phoneNumberUser),
      position: this.toNullableString(payload.position),
      codeND: (payload.codeND || '').trim(),
      birthday: this.toDateOrNull(payload.birthday),
      gender: this.toNullableString(payload.gender),
      identificationCard: this.toNullableString(payload.identificationCard),
      leader: this.toNullableString(payload.leader),
      organizationCode: this.toNullableString(payload.department),
      status: 1,
    };
  }

  hasChanged(user: UserEntity, incoming: NormalizedEmployeeData): boolean {
    return (
      (user.name || '') !== incoming.name ||
      (user.emailUser || null) !== incoming.emailUser ||
      (user.phoneNumberUser || null) !== incoming.phoneNumberUser ||
      (user.position || null) !== incoming.position ||
      (user.codeND || '') !== incoming.codeND ||
      (user.gender || null) !== incoming.gender ||
      (user.identificationCard || null) !== incoming.identificationCard ||
      (user.leader || null) !== incoming.leader ||
      (user.organizationCode || null) !== incoming.organizationCode ||
      this.toDateString(user.birthday) !== this.toDateString(incoming.birthday) ||
      user.status !== incoming.status
    );
  }

  private toNullableString(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private toDateOrNull(dateString?: string): Date | null {
    if (!dateString) return null;
    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toDateString(date: Date | null | undefined): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
}
