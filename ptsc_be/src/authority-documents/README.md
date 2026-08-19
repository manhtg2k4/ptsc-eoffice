# Authority Documents Module

Module để quản lý ủy quyền cho các API/stage cụ thể.

## Cấu trúc

- **Entity**: `AuthorityDocumentEntity` - Mapping với bảng `authority_documents`
- **Guard**: `AuthorityGuard` - Check ủy quyền trước khi thực thi API
- **Decorators**: 
  - `@CheckAuthority(stage)` - Đánh dấu API cần check ủy quyền
  - `@AuthorizedUser()` - Lấy user ID của người ủy quyền (author)
  - `@OriginalUser()` - Lấy user ID hiện tại (người được ủy quyền)
  - `@EffectiveUser()` - Lấy user ID cuối cùng (author nếu có, không thì current user)
  - `@AuthorityInfo()` - Lấy toàn bộ thông tin ủy quyền

## Cách sử dụng

### 1. Import Module

```typescript
// app.module.ts
import { AuthorityDocumentsModule } from './authority-documents/authority-documents.module';

@Module({
  imports: [
    // ... other imports
    AuthorityDocumentsModule,
  ],
})
export class AppModule {}
```

### 2. Sử dụng trong Controller

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthorityGuard } from './authority-documents/guards/authority.guard';
import { CheckAuthority } from './authority-documents/decorators/check-authority.decorator';
import { 
  AuthorizedUser, 
  OriginalUser, 
  EffectiveUser 
} from './authority-documents/decorators/authorized-user.decorator';

@Controller('documents')
@UseGuards(AuthorityGuard) // Apply guard cho toàn bộ controller
export class DocumentsController {
  
  // API check ủy quyền cho stage 'document_approval'
  @Post('approve')
  @CheckAuthority('document_approval')
  async approveDocument(
    @AuthorizedUser() authorizedUserId: string | null, // User ủy quyền (author)
    @OriginalUser() currentUserId: string,             // User hiện tại
    @EffectiveUser() effectiveUserId: string,          // User cuối cùng (author hoặc current)
  ) {
    // Logic xử lý với quyền của authorizedUserId nếu có
    const userId = effectiveUserId; // Dùng author nếu có ủy quyền, không thì dùng current user
    
    console.log('Current user:', currentUserId);
    console.log('Authorized by:', authorizedUserId || 'No authorization');
    console.log('Effective user:', effectiveUserId);
    
    // Thực hiện logic với quyền của effectiveUserId
    return { success: true, userId };
  }

  // API không check ủy quyền
  @Post('create')
  async createDocument() {
    // Logic bình thường, không check ủy quyền
    return { success: true };
  }

  // API check ủy quyền cho stage khác
  @Post('review')
  @CheckAuthority('document_review')
  async reviewDocument(@EffectiveUser() userId: string) {
    // Chỉ cần effective user
    return { success: true, reviewedBy: userId };
  }
}
```

### 3. Cách Guard hoạt động

1. **Có Decorator `@CheckAuthority(stage)`:**
   - Guard sẽ query bảng `authority_documents`
   - Tìm bản ghi:
     - `authorized = currentUserId` (người được ủy quyền là user hiện tại)
     - `stage = requiredStage` (stage từ decorator)
     - `status = '1'` (active)
     - `start_date <= now <= end_date` (trong thời gian hiệu lực)
   - Nếu tìm thấy:
     - `request.authorizedUser` = `author` (người ủy quyền)
     - `request.originalUser` = `currentUserId`
     - `request.authorityDocument` = toàn bộ thông tin
   - Nếu không tìm thấy:
     - `request.authorizedUser` = `null`
     - `request.originalUser` = `currentUserId`
     - API vẫn chạy với quyền của user hiện tại

2. **Không có Decorator:**
   - Guard bỏ qua, không check ủy quyền

### 4. Ví dụ với Service

```typescript
@Injectable()
export class DocumentsService {
  async approveDocument(userId: string, documentId: string) {
    // userId ở đây là effectiveUserId từ controller
    // Có thể là author (nếu có ủy quyền) hoặc current user
    
    const document = await this.findDocument(documentId);
    
    // Check quyền của userId
    const hasPermission = await this.checkPermission(userId, 'approve');
    
    if (!hasPermission) {
      throw new ForbiddenException('Không có quyền phê duyệt');
    }
    
    // Thực hiện phê duyệt với quyền của userId
    document.approvedBy = userId;
    document.status = 'approved';
    
    return await this.save(document);
  }
}
```

## Stages (API được ủy quyền)

Bạn có thể định nghĩa các stage cố định:

```typescript
// constants/authority-stages.ts
export const AuthorityStages = {
  DOCUMENT_APPROVAL: 'document_approval',
  DOCUMENT_REVIEW: 'document_review',
  BUDGET_APPROVAL: 'budget_approval',
  USER_MANAGEMENT: 'user_management',
  // ... thêm các stage khác
} as const;

// Sử dụng
@CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
```

## Database Schema

```sql
-- Status values:
-- 1: Active (đang hiệu lực)
-- 3: Deleted (đã xóa)

-- Example data:
INSERT INTO authority_documents (author, authorized, stage, status, start_date, end_date)
VALUES 
  ('user123', 'user456', 'document_approval', '1', '2025-01-01', '2025-12-31'),
  ('user789', 'user456', 'document_review', '1', '2025-01-01', '2025-06-30');
```

## Testing

```typescript
// Mock data for testing
const mockAuthority = {
  id: 1,
  author: 'boss123',
  authorized: 'employee456',
  stage: 'document_approval',
  status: '1',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
};

// Test case: Có ủy quyền
it('should return author user when authority exists', async () => {
  // employee456 được boss123 ủy quyền
  // => API sẽ chạy với quyền của boss123
});

// Test case: Không có ủy quyền
it('should return current user when no authority exists', async () => {
  // employee456 không được ủy quyền
  // => API chạy với quyền của employee456
});
```

