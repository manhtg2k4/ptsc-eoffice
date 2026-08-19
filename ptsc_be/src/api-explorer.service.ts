import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
// Định nghĩa bản đồ dịch tên cho các nhóm API
// Bạn có thể tùy chỉnh hoặc thêm các bản dịch khác tại đây
const nameMapping: Record<string, string> = {
  'users': 'Quản lý Người dùng',
  'user': 'Quản lý Người dùng (Cũ)',
  'system-info': 'Thông tin hệ thống',
  'profile-management': 'Quản lý Hồ sơ (Cũ)',
  'profile-managementv1_new': 'Quản lý Hồ sơ',
  'document-management': 'Quản lý Tài liệu (Cũ)',
  'documents': 'Quản lý Tài liệu',
  'role': 'Quản lý Vai trò (Cũ)',
  'role2': 'Quản lý Vai trò',
  'organization-unit': 'Quản lý Đơn vị tổ chức',
  'work-items': 'Luồng công việc',
  'comments': 'Quản lý Bình luận',
  'book-documents': 'Sổ văn bản',
  'bpmn': 'Quản lý Quy trình BPMN',
  'auth': 'Xác thực & Phân quyền',
  'oauth': 'Xác thực OAuth',
  'group-users': 'Quản lý Nhóm người dùng',
  'city-category': 'Danh mục Tỉnh/Thành phố',
  'district-category': 'Danh mục Quận/Huyện',
  'commune-categorie': 'Danh mục Phường/Xã',
  'fonds-catalog': 'Danh mục Phông/Catalogue',
  'api-config': 'Cấu hình API',
  'feature-management': 'Quản lý Tính năng',
  'info-citizen': 'Thông tin Công dân',
  'info-enterprise': 'Thông tin Doanh nghiệp',
  'dashboard': 'Bảng điều khiển',
  'report-management': 'Quản lý Báo cáo',
  'lookup-tool': 'Công cụ tra cứu',
  'warehouse': 'Quản lý Kho',
  'shelf-management': 'Quản lý Kệ/Giá',
  'box-management': 'Quản lý Hộp/Cặp',
  'demo': 'Chức năng Demo',
  'list-role': 'Danh sách Vai trò',
  'report-signers': 'Người ký tờ trình',
  'draft-signers': 'Người ký dự thảo',
  'incomingRecipient': 'Nơi nhận để biết',
  'SoVBden': 'Sổ VB đến',
  'topic': 'Chủ đề',
  'director': 'Người tham gia',
  'reviewerName': 'Người phê duyệt',
  'recalledByName': 'Người thu hồi',
  "sourceDocument": "Văn bản nguồn",
  "amenities": "Quản lý thiết bị",
  "directorTaskToDocument": "Người tham gia công việc từ VB",
  "titleCategory": "Danh mục Tiêu đề",
  "typeOfProcess": "Loại quy trình",
  // Thêm các bản dịch khác cho các controller của bạn ở đây
};
@Injectable()
export class ApiExplorerService implements OnModuleInit {
  private endpoints: { path: string; method: string }[] = [];

  constructor(
    private readonly reflector: Reflector,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) { }

  onModuleInit() {
    const controllers = this.discoveryService.getControllers();
    controllers.forEach((wrapper: InstanceWrapper) => {
      const { instance, metatype } = wrapper;
      // Đảm bảo instance và metatype (constructor của controller) tồn tại
      if (!instance || !metatype || !Object.getPrototypeOf(instance)) {
        return;
      }

      const controllerPath = this.reflector.get<string>(PATH_METADATA, metatype);

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (methodName: string) => {
          const methodPath = this.reflector.get<string>(PATH_METADATA, instance[methodName]);
          const method = this.reflector.get<number>(METHOD_METADATA, instance[methodName]);

          if (methodPath !== undefined && method !== undefined) {
            // Xây dựng đường dẫn hoàn chỉnh và dọn dẹp nó
            const fullPath = ['/api', controllerPath, methodPath]
              .filter(p => p) // Loại bỏ các phần tử null/undefined
              .join('/') // Nối các phần tử
              .replace(/\/+/g, '/'); // Thay thế nhiều dấu gạch chéo bằng một dấu
            this.endpoints.push({
              path: fullPath,
              method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'][method],
            });
          }
        },
      );
    });
  }

  getApiEndpoints() {
    // return this.endpoints
    //   .filter(endpoint => endpoint.method === 'GET') // Chỉ lấy các endpoint có phương thức GET
    //   .map(endpoint => {
    //   // Tách đường dẫn để lấy ra phần tử đầu tiên sau '/api/'
    //   // Ví dụ: '/api/users/:id' -> 'users'
    //   const pathSegments = endpoint.path.split('/');
    //   const apiSegment = pathSegments.length > 2 ? pathSegments[2] : null;

    //   // Kiểm tra apiSegment trước khi sử dụng làm index để tránh lỗi type 'null'
    //   const name = apiSegment ? (nameMapping[apiSegment] || apiSegment) : 'Chung';

    //   return { ...endpoint, name };
    // });
    // Trả về một danh sách API tĩnh theo yêu cầu.
    return [
      {
        path: '/api/users/all',
        method: 'GET',
        name: nameMapping['users'] || 'Quản lý Người dùng',
      },
      {
        path: '/api/organization-units',
        method: 'GET',
        name: nameMapping['organization-unit'] || 'Quản lý Đơn vị tổ chức',
      },
      {
        path: '/api/group-users',
        method: 'GET',
        name: nameMapping['group-users'] || 'Quản lý Nhóm người dùng',
      },
      {
        path: '/api/list-role',
        method: 'GET',
        name: nameMapping['list-role'] || 'Danh sách Vai trò',
      },

      {
        path: '/api/users/report-signers',
        method: 'GET',
        name: nameMapping['report-signers'] || 'Người ký tờ trình',
      },
      {
        path: '/api/users/draft-signers',
        method: 'GET',
        name: nameMapping['draft-signers'] || 'Người ký dự thảo',
      },
      {
        path: '/api/users/incomingRecipient',
        method: 'GET',
        name: nameMapping['incomingRecipient'] || 'Nơi nhận để biết',
      },
      {
        path: '/api/book-documents/list?type_document=IncommingDocument&scope=tct',
        method: 'GET',
        name: nameMapping['SoVBden'] || 'Sổ VB đến',
      },
      {
        path: '/api/users/by-task-role?typeTaskUser=director',
        method: 'GET',
        name: nameMapping['director'] || 'Người chủ trì',
      },
      {
        path: '/api/topic',
        method: 'GET',
        name: nameMapping['topic'] || 'Chủ đề',
      },
      {
        path: '/api/news/my-list/recalled',
        method: 'GET',
        name: nameMapping['reviewerName'] || 'Người phê duyệt',
      },
      {
        path: '/api/news/my-list/recalled',
        method: 'GET',
        name: nameMapping['recalledByName'] || 'Người thu hồi',
      },
      {
        path: '/api/incoming/list/for-task?type=waiting',
        method: 'GET',
        name: nameMapping['sourceDocument'] || 'Văn bản nguồn',
      },
      {
        path: '/api/amenities/list',
        method: 'GET',
        name: nameMapping['amenities'] || 'Quản lý thiết bị',
      },
      {
        path: '/api/users/by-task-role-form-doc?typeTaskUser=director',
        method: 'GET',
        name: nameMapping['directorTaskToDocument'] || 'Người tham gia công việc từ VB',
      },
      {
        path: '/api/crm-sources/code?code=LOAIDUAN',
        method: 'GET',
        name: nameMapping['titleCategory'] || 'Danh mục Tiêu đề',
      },
      {
        path: '/api/meeting-rooms/get-all',
        method: 'GET',
        name: nameMapping['meetingRooms'] || 'Danh mục Phòng họp',
      },
      {
        path: '/api/meetings/find-all',
        method: 'GET',
        name: nameMapping['meetings'] || 'Danh mục Lịch họp',
      },
      {
        path: '/api/bpmn-designs/process/OutGoingDocument',
        method: 'GET',
        name: nameMapping['OutGoingDocument'] || 'Quy trình văn bản đi',
      },
      {
        path: '/api/users/users-in-same-org',
        method: 'GET',
        name: 'Người dùng được ủy quyền',
      },
      {
        path: '/api/passports/filter-units',
        method: 'GET',
        name: 'Đơn vị (hộ chiếu)',
      },
      {
        path: '/api/passports/filter-departments',
        method: 'GET',
        name: 'Phòng (hộ chiếu)',
      },
      {
        path: '/api/vehicle-registration/driver-list-include-busy',
        method: 'GET',
        name: 'Tài xế',
      },
      {
        path: '/api/vehicle-registration/car-list-include-busy',
        method: 'GET',
        name: 'Xe',
      },
      {
        path: '/api/common-source/S002',
        method: 'GET',
        name: 'Danh mục Chức vụ',
      },

      {
        path: '/api/users/user-by-code',
        method: 'GET',
        name: 'Người dùng theo vai trò nhỏ hơn',
      },
      {
        path: '/api/passports/countries',
        method: 'GET',
        name: 'Danh mục quốc gia',
      },
    ];
  }
}
