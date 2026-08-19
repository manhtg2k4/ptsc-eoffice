/**
 * Authority Documents Module - Entry Point
 * 
 * Export tất cả các thành phần cần thiết để sử dụng trong các module khác
 */

// Module
export { AuthorityDocumentsModule } from './authority-documents.module';

// Entity
export { AuthorityDocumentEntity } from './entities/authority-document.entity';

// Guards
export { AuthorityGuard } from './guards/authority.guard';

// Decorators
export { CheckAuthority, CHECK_AUTHORITY_KEY } from './decorators/check-authority.decorator';
export {
  AuthorizedUser,
  OriginalUser,
  EffectiveUser,
  AuthorityInfo,
} from './decorators/authorized-user.decorator';

// Constants
export { AuthorityStages, AuthorityStage } from './constants/authority-stages';

