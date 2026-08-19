// import { Module } from '@nestjs/common';
// import { OrganizationUnitController } from './organization-unit.controller';
// import {
//   OrganizationUnit,
//   OrganizationSchema,
// } from './organization-unit.schema';
// import { OrganizationUnitService } from './organization-unit.service';
// import { MongooseModule } from '@nestjs/mongoose';
// import {
//   EntityRoleGroup,
//   EntityRoleGroupSchema,
// } from 'src/entity-rolegroup/entity-rolegroup.schema';
// import { RoleGroupModule } from 'src/role-group/role-group.module';
// import { EntityRolegroupModule } from 'src/entity-rolegroup/entity-rolegroup.module';
// import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
// import { DocumentsModule } from 'src/documents/documents.module';

// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: OrganizationUnit.name, schema: OrganizationSchema },
//       { name: EntityRoleGroup.name, schema: EntityRoleGroupSchema },
//     ]),
//     RoleGroupModule,
//     EntityRolegroupModule,
//     SystemLogSqlModule, // Thêm vào đây
//     DocumentsModule, // Thêm vào đây để dùng UserLogHelper
//   ],
//   controllers: [OrganizationUnitController],
//   providers: [OrganizationUnitService],
//   exports: [OrganizationUnitService],
// })
// export class OrganizationUnitModule { }
