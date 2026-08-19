// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { CamundaVariable, CamundaVariableSchema } from './cmd-variable.schema';
// import { CamundaVariableService } from './cmd-variable.service';
// import { ProcessVariablesController } from './cmd-variables.controller';
// import { HttpModule } from '@nestjs/axios';
// import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
// import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
// // import { administrativeProcedureCategory, administrativeProcedureCategorySchema } from 'src/administrative-procedure-category/administrative-procedure-category.schema'; // ✅ Commented - module deleted
// // import { ExploitationHistoryModule } from 'src/report-management/exploitation-history.module'; // ✅ Commented - module deleted
// // import { ProfileManagement, ProfileManagementSchema } from 'src/profile-management/profile-management.schema'; // ✅ Commented - module deleted
// // import { fondsCatalog, fondsCatalogSchema } from 'src/fonds-catalog/fonds-catalog.schema'; // ✅ Commented - module deleted
// // import { Citizen, CitizenSchema } from 'src/info-citizen/info-citizen.schema'; // ✅ Commented - module deleted
// // import { administrativeProcedureFieldCategory, administrativeProcedureFieldCategorySchema } from 'src/administrative-procedure-field-category/administrative-procedure-field-category.schema'; // ✅ Commented - module deleted
// import { fileManager, fileManagerSchema } from 'src/file-manager/file-manager.schema';
// // import { CommonCategory, CommonCategorySchema } from 'src/common-categories/common-categories.schema'; // ✅ Commented - module deleted
// // import { CollectionManagement, CollectionManagementSchema } from 'src/collection-management/collection-management.schema'; // ✅ Commented - module deleted
// import { User, UserSchema } from 'src/user/user.schema';
// import { OrganizationUnit, OrganizationSchema } from 'src/organization-unit/organization-unit.schema';
// // import { administrativeProcedureResultCategory, administrativeProcedureResultCategorySchema } from 'src/administrative-procedure-result-category/administrative-procedure-result-category.schema'; // ✅ Commented - module deleted
// import { Enterprise, EnterpriseSchema } from 'src/info-enterprise/info-enterprise.schema';
// import { RoomInWarehouse, RoomInWarehouseSchema } from 'src/roomInWarehouse/roomInWarehouse.schema';
// import { ShelfManagement, ShelfManagementSchema } from 'src/shelf-management/shelf-management.schema';
// import { BoxManagement, BoxManagementSchema } from 'src/box-management/box-management.schema';
// import { Warehouse, WarehouseSchema } from 'src/warehouse/warehouse.schema';
// // import { ExploitationHistoryModule } from 'src/exploitation-history/exploitation-history.module';
// import { ModelIntrospectModule } from '../model-introspect/model-introspect.module';
// import { Floor, FloorSchema } from 'src/shelf-management/floor.schema';
// import { Compartment, CompartmentSchema } from 'src/shelf-management/box.schema';
// import { TypeOrmModule } from '@nestjs/typeorm';

// @Module({
//   imports: [
//       MongooseModule.forFeature([
//         { name: CamundaVariable.name, schema: CamundaVariableSchema },
//         // { name: FeatureManagement.name, schema: FeatureManagementSchema },
//         // { name: BpmnDesignEntity.name, schema: BpmnDesignSchema },
//         // { name: administrativeProcedureCategory.name, schema: administrativeProcedureCategorySchema }, // ✅ Commented - module deleted
//         // { name: ProfileManagement.name, schema: ProfileManagementSchema }, // ✅ Commented - module deleted
//         // { name: fondsCatalog.name, schema: fondsCatalogSchema }, // ✅ Commented - module deleted
//         // { name: Citizen.name, schema: CitizenSchema }, // ✅ Commented - module deleted
//         // {name: administrativeProcedureFieldCategory.name, schema: administrativeProcedureFieldCategorySchema}, // ✅ Commented - module deleted
//         {name: fileManager.name, schema: fileManagerSchema},
//         // {name: CommonCategory.name, schema: CommonCategorySchema}, // ✅ Commented - module deleted
//         // {name: CollectionManagement.name, schema: CollectionManagementSchema}, // ✅ Commented - module deleted
//         {name: User.name, schema: UserSchema},
//         {name: OrganizationUnit.name, schema: OrganizationSchema},
//         // {name: administrativeProcedureResultCategory.name, schema: administrativeProcedureResultCategorySchema}, // ✅ Commented - module deleted
//         { name: Enterprise.name, schema: EnterpriseSchema },
//         { name: RoomInWarehouse.name, schema: RoomInWarehouseSchema },
//         { name: ShelfManagement.name, schema: ShelfManagementSchema },
//         { name: BoxManagement.name, schema: BoxManagementSchema },
//         { name: Warehouse.name, schema: WarehouseSchema },
//         { name: Floor.name, schema: FloorSchema },
//         { name: Compartment.name, schema: CompartmentSchema },
//       ]),
//       TypeOrmModule.forFeature(
//         [BpmnDesignEntity, FeatureManagementEntity],
//         'mssqlConnection',
//       ),
//       HttpModule,
//       // ExploitationHistoryModule, // ✅ Commented - module deleted
//       // ModelIntrospectModule // ✅ Commented - module deleted
//     ],
//   controllers: [ProcessVariablesController],
//   providers: [CamundaVariableService],
//   exports: [CamundaVariableService],
// })
// export class CamundaVariableModule {}

