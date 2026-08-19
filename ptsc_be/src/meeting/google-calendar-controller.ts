/**
 * Google Calendar Controller - Clean version (aligned with new service)
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth-sso/jwt.guard';
import { Public } from 'src/oauth/decorator/public.decorator';
import { GoogleCalendarService } from './google-calendar-service';
import { BackgroundGoogleCalendarSyncService } from './background-google-calendar-sync.service';
import { ApiOperation } from '@nestjs/swagger';


@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(
    private googleService: GoogleCalendarService,
    private backgroundSyncService: BackgroundGoogleCalendarSyncService,
  ) { }

  /**
   * GET /google-calendar/auth-url
   * Generate Google OAuth URL
   */

  @UseGuards(JwtAuthGuard)
  @Get('auth-url')
  @ApiOperation({ summary: 'Lấy url đăng nhập Google Calendar' })
  async getAuthUrl(@Req() req) {
    const userId = req.user.id || req.user.userId || req.user._id;
    const url = this.googleService.generateAuthUrl(userId);
    return { url };
  }
  /**
   * GET /google-calendar/oauth2callback/calendar
   * Google OAuth callback
   */

  @Public()
  @Get('oauth2callback/calendar')
  @ApiOperation({ summary: 'Xử lý callback OAuth từ Google Calendar' })
  async callback(@Query('code') code: string, @Query('state') userId: string, @Res() res: Response) {
    console.log(`[Google Callback] Received Code: ${code ? 'YES' : 'NO'}, UserId(State): ${userId}`);

    if (!code) {
      console.error('[Google Callback] No code received from Google');
      return res.redirect(`${process.env.REDIRECT_URI_FE}/calendar-sync?status=error`);
    }

    if (!userId) {
      console.error('[Google Callback] No userId(state) received. Cannot save tokens!');
      return res.redirect(`${process.env.REDIRECT_URI_FE}/calendar-sync?status=error&message=missing_state`);
    }

    try {
      const { tokens, email } = await this.googleService.getTokensFromCode(code);
      console.log(`[Google Callback] Tokens retrieved for email: ${email}`);

      await this.googleService.saveGoogleTokens(userId, {
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token || '',
        email: email || '',
      });
      console.log(`[Google Callback] Tokens saved successfully for user: ${userId}`);

      // Kích hoạt đồng bộ hóa toàn bộ lịch họp hiện tại của người dùng này lên Google Calendar
      await this.backgroundSyncService.triggerInitialSyncForUser(userId);

      // Redirect về FE sau khi thành công
      return res.redirect(`${process.env.REDIRECT_URI_FE}/calendar-sync?status=success`);
    } catch (error) {
      console.error('Callback error:', error);
      return res.redirect(`${process.env.REDIRECT_URI_FE}/calendar-sync?status=error&message=${error.message}`);
    }
  }

  /**
   * POST /google-calendar/sync-user
   * Trigger initial sync for the current logged-in user
   */
  @UseGuards(JwtAuthGuard)
  @Post('sync-user')
  @ApiOperation({ summary: 'Đồng bộ lại toàn bộ lịch họp của người dùng hiện tại lên Google Calendar' })
  async syncCurrentUser(@Req() req) {
    const userId = req.user.id || req.user.userId || req.user._id;
    console.log(`[Google Sync Current User] Force sync requested by user: ${userId}`);
    await this.backgroundSyncService.triggerInitialSyncForUser(userId);
    return { success: true, message: 'Đã đưa yêu cầu đồng bộ hóa vào hàng đợi xử lý' };
  }

  /**
   * POST /google-calendar/sync-user/:userId
   * Trigger initial sync for a specific user ID
   */
  @UseGuards(JwtAuthGuard)
  @Post('sync-user/:userId')
  @ApiOperation({ summary: 'Đồng bộ lại toàn bộ lịch họp của một người dùng cụ thể lên Google Calendar' })
  async syncUserById(@Param('userId') userId: string) {
    console.log(`[Google Sync User By ID] Force sync requested for user ID: ${userId}`);
    await this.backgroundSyncService.triggerInitialSyncForUser(userId);
    return { success: true, message: `Đã đưa yêu cầu đồng bộ hóa của người dùng ${userId} vào hàng đợi xử lý` };
  }

  /**
   * DELETE /google-calendar/clear-events
   * Clear all Google Calendar events for the current logged-in user
   */
  @UseGuards(JwtAuthGuard)
  @Delete('clear-events')
  @ApiOperation({ summary: 'Xóa toàn bộ lịch họp đã đồng bộ của người dùng hiện tại trên Google Calendar' })
  async clearCurrentUserEvents(@Req() req) {
    const userId = req.user.id || req.user.userId || req.user._id;
    console.log(`[Google Clear Events] Clear all events requested by user: ${userId}`);
    await this.backgroundSyncService.clearAllSyncedEventsForUser(userId);
    return { success: true, message: 'Đã đưa yêu cầu xóa toàn bộ lịch họp lên Google Calendar vào hàng đợi xử lý' };
  }

  /**
   * DELETE /google-calendar/clear-events/:userId
   * Clear all Google Calendar events for a specific user ID
   */
  @UseGuards(JwtAuthGuard)
  @Delete('clear-events/:userId')
  @ApiOperation({ summary: 'Xóa toàn bộ lịch họp đã đồng bộ của một người dùng cụ thể trên Google Calendar' })
  async clearUserEventsById(@Param('userId') userId: string) {
    console.log(`[Google Clear Events By ID] Clear all events requested for user ID: ${userId}`);
    await this.backgroundSyncService.clearAllSyncedEventsForUser(userId);
    return { success: true, message: `Đã đưa yêu cầu xóa toàn bộ lịch họp lên Google Calendar của người dùng ${userId} vào hàng đợi xử lý` };
  }
}