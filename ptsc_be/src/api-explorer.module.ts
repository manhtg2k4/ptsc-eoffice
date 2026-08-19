import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { AppService } from './app.service';
import { ApiExplorerService } from './api-explorer.service';
import { ApiExplorerController } from './api-explorer.controller';
// import { CrmsourceModule } from './crmsource/crmsource.module';
import { DocumentLibraryModule } from './document-library/document-library.module';
import { NewsModule } from './news/news.module';
import { TopicModule } from './topic/topic.module';
import { AlbumImagesModule } from './album-images/album-images.module';
import { NewsCalendarModule } from './news-calendar/news-calendar.module';
import { MediaGaleryModule } from './media-galery/media-galery.module';
import { ProjectModule } from './project/project.module';
import { VehicleRegistrationModule } from './vehicle-registration/vehicle-registration.module';
import { ListCardModule } from './list-card/list-card.module';
import { FeedbackSuggestionsModule } from './feedback-suggestions/feedback-suggestions.module';
import { ListCarsModule } from './list-cars/list-cars.module';
import { ListDriversModule } from './list-drivers/list-drivers.module';
import { DriverHealthChecksModule } from './driver-health-checks/driver-health-checks.module';
import { DashboardPageModule } from './dashboard-page/dashboard-page.module';
import { DashboardConfigModule } from './dashboard-config/dashboard-config.module';

@Module({
  imports: [DiscoveryModule, DocumentLibraryModule, NewsModule, TopicModule, AlbumImagesModule, NewsCalendarModule, MediaGaleryModule, ProjectModule,VehicleRegistrationModule, ListCardModule, FeedbackSuggestionsModule, ListCarsModule, ListDriversModule, DriverHealthChecksModule, DashboardPageModule, DashboardConfigModule],
  controllers: [ApiExplorerController],
  providers: [AppService, ApiExplorerService],
})
export class ApiExplorerModule { }