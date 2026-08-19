export enum TaskUserRole {
  ASSIGNER = 'assigner', // người giao
  DIRECTOR = 'director', // người chủ trì
  SUPPORTER = 'supporter', // người phối hợp
  VIEWER = 'viewer', // người xem
}

export enum TaskUserType {
  INDIVIDUAL = 1, // cá nhân
  DEPARTMENT = 2, // phòng ban
}

export enum TaskRecurringStatus {
  PAUSED = 2,
  ACTIVE = 1,
  FINISHED = 0,
}

export enum TaskRoutingKey {
  TU_GIAO_VIEC = 'TU_GIAO_VIEC',
  LANH_DAO_GIAO_PHONG_BAN = 'LANH_DAO_GIAO_PHONG_BAN',
  LANH_DAO_GIAO_CA_NHAN = 'LANH_DAO_GIAO_CA_NHAN',
  TRUONG_PHONG_GIAO_VIEC = 'TRUONG_PHONG_GIAO_VIEC',
}

// Data mẫu danh sách quy trình
export interface WorkflowNode {
  id: string;
  name: string;
  children?: WorkflowNode[];
}
export interface Workflow {
  id: string;
  name: string;
  treeData: WorkflowNode[];
}

export const Workflows: Workflow[] = [
  {
    id: "1",
    name: "Quy trình triển khai công việc",
    treeData: [
      {
        id: "1.1",
        name: "Tiếp nhận yêu cầu"
      },
      {
        id: "1.2",
        name: "Phân tích yêu cầu",
        children: [
          { id: "1.2.1", name: "Họp với khách hàng" },
          { id: "1.2.2", name: "Tài liệu hóa yêu cầu" }
        ]
      },
      {
        id: "1.3",
        name: "Lập kế hoạch triển khai"
      }
    ]
  },
  {
    id: "2",
    name: "Quy trình phát triển phần mềm",
    treeData: [
      {
        id: "2.1",
        name: "Thiết kế hệ thống"
      },
      {
        id: "2.2",
        name: "Lập trình",
        children: [
          { id: "2.2.1", name: "Code backend" },
          { id: "2.2.2", name: "Code frontend" }
        ]
      },
      {
        id: "2.3",
        name: "Kiểm thử"
      },
      {
        id: "2.4",
        name: "Triển khai production"
      }
    ]
  },
  {
    id: "3",
    name: "Quy trình xử lý sự cố",
    treeData: [
      {
        id: "3.1",
        name: "Tiếp nhận sự cố"
      },
      {
        id: "3.2",
        name: "Phân loại mức độ"
      },
      {
        id: "3.3",
        name: "Xử lý sự cố",
        children: [
          { id: "3.3.1", name: "Xác định nguyên nhân" },
          { id: "3.3.2", name: "Khắc phục hệ thống" }
        ]
      },
      {
        id: "3.4",
        name: "Đóng sự cố"
      }
    ]
  }
];

export const RED_FLAG_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" d="M5.5 1.75C5.5 1.55109 5.42098 1.36032 5.28033 1.21967C5.13968 1.07902 4.94891 1 4.75 1C4.55109 1 4.36032 1.07902 4.21967 1.21967C4.07902 1.36032 4 1.55109 4 1.75V21.75C4 21.9489 4.07902 22.1397 4.21967 22.2803C4.36032 22.421 4.55109 22.5 4.75 22.5C4.94891 22.5 5.13968 22.421 5.28033 22.2803C5.42098 22.1397 5.5 21.9489 5.5 21.75V1.75Z" fill="#B70B13"/>
<path d="M12.349 1.70161L12.145 1.61961C10.5819 0.99587 8.8715 0.838861 7.221 1.16761L5.5 1.51161V11.5116L7.22 11.1676C8.87082 10.8387 10.5816 10.9957 12.145 11.6196C13.8386 12.2966 15.7025 12.423 17.472 11.9806L17.686 11.9276C17.9898 11.8518 18.2596 11.6765 18.4524 11.4297C18.6452 11.1829 18.75 10.8788 18.75 10.5656V3.19861C18.7499 3.01638 18.7084 2.83656 18.6284 2.67278C18.5485 2.50901 18.4324 2.36558 18.2887 2.2534C18.1451 2.14121 17.9779 2.0632 17.7996 2.0253C17.6214 1.98739 17.4368 1.99057 17.26 2.03461C15.6286 2.44218 13.9102 2.32631 12.349 1.70161Z" fill="#FF4A4A"/>
<path d="M7.26953 1.41309C8.8724 1.09382 10.5338 1.24594 12.0518 1.85156L12.2559 1.93359C13.8659 2.57782 15.6381 2.69753 17.3203 2.27734C17.4603 2.24248 17.6069 2.23952 17.748 2.26953C17.889 2.29956 18.0212 2.36152 18.1348 2.4502C18.2484 2.53893 18.3401 2.65271 18.4033 2.78223C18.4665 2.91174 18.4999 3.05413 18.5 3.19824V10.5654C18.5 10.8226 18.4141 11.0726 18.2559 11.2754C18.0974 11.4782 17.8747 11.6222 17.625 11.6846L17.4121 11.7383H17.4111C15.6929 12.1678 13.8829 12.045 12.2383 11.3877H12.2373C10.6291 10.7459 8.86908 10.5845 7.1709 10.9229L5.75 11.2061V1.71582L7.26953 1.41309Z" stroke="black" stroke-opacity="0.2" stroke-width="0.5"/>
</svg>`;

export const WHITE_FLAG_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" d="M6.5 1.75C6.5 1.55109 6.42098 1.36032 6.28033 1.21967C6.13968 1.07902 5.94891 1 5.75 1C5.55109 1 5.36032 1.07902 5.21967 1.21967C5.07902 1.36032 5 1.55109 5 1.75V21.75C5 21.9489 5.07902 22.1397 5.21967 22.2803C5.36032 22.421 5.55109 22.5 5.75 22.5C5.94891 22.5 6.13968 22.421 6.28033 22.2803C6.42098 22.1397 6.5 21.9489 6.5 21.75V1.75Z" fill="#4A5565"/>
<g opacity="0.5" filter="url(#filter0_d_1207_9524)">
<path d="M13.349 3.78999L13.145 3.70799C11.5819 3.08425 9.8715 2.92724 8.221 3.25599L6.5 3.59999V13.6L8.22 13.256C9.87082 12.927 11.5816 13.0841 13.145 13.708C14.8386 14.385 16.7025 14.5113 18.472 14.069L18.686 14.016C18.9898 13.9402 19.2596 13.7649 19.4524 13.5181C19.6452 13.2713 19.75 12.9672 19.75 12.654V5.28699C19.7499 5.10476 19.7084 4.92493 19.6284 4.76116C19.5485 4.59739 19.4324 4.45396 19.2887 4.34178C19.1451 4.22959 18.9779 4.15158 18.7996 4.11367C18.6214 4.07577 18.4368 4.07895 18.26 4.12299C16.6286 4.53056 14.9102 4.41469 13.349 3.78999Z" fill="white"/>
<path d="M8.26953 3.50146C9.8724 3.1822 11.5338 3.33432 13.0518 3.93994L13.2559 4.02197C14.8659 4.66619 16.6381 4.78591 18.3203 4.36572C18.4603 4.33086 18.6069 4.3279 18.748 4.35791C18.889 4.38794 19.0212 4.4499 19.1348 4.53857C19.2484 4.62731 19.3401 4.74109 19.4033 4.87061C19.4665 5.00012 19.4999 5.14251 19.5 5.28662V12.6538C19.5 12.911 19.4141 13.161 19.2559 13.3638C19.0974 13.5666 18.8747 13.7106 18.625 13.7729L18.4121 13.8267H18.4111C16.6929 14.2561 14.8829 14.1334 13.2383 13.4761H13.2373C11.6291 12.8343 9.86908 12.6728 8.1709 13.0112L6.75 13.2944V3.8042L8.26953 3.50146Z" stroke="black" stroke-opacity="0.3" stroke-width="0.5"/>
</g>
<defs>
<filter id="filter0_d_1207_9524" x="2.5" y="3.08838" width="21.25" height="19.2397" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1207_9524"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1207_9524" result="shape"/>
</filter>
</defs>
</svg>`;
