import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProduces } from '@nestjs/swagger';
import { Public } from '../oauth/decorator/public.decorator';

@ApiTags('WOPI')
@Controller()
export class CollaboraExternalController {
    @Public()
    @Get('hosting/discovery')
    @ApiOperation({
        summary: 'Lấy file cấu hình Discovery (XML) từ Document Server',
        description: 'Endpoint này do Document Server quản lý để thông báo các định dạng tệp hỗ trợ và URL tương ứng.',
    })
    @ApiProduces('application/xml')
    @ApiResponse({ status: 200, description: 'Trả về nội dung XML cấu hình.' })
    @Redirect('https://vpstc-document.lifetex.vn/hosting/discovery', 302)
    getDiscovery() {
        return { url: 'https://vpstc-document.lifetex.vn/hosting/discovery' };
    }

    @Public()
    @Get('loleaflet/dist/loleaflet.html')
    @ApiOperation({
        summary: 'Giao diện soạn thảo Document Online (loleaflet)',
        description: 'Trang HTML chính để nhúng trình soạn thảo tài liệu Document Online.',
    })
    @ApiResponse({ status: 200, description: 'Giao diện người dùng Document (HTML).' })
    @Redirect('https://vpstc-document.lifetex.vn/loleaflet/dist/loleaflet.html', 302)
    getLoleaflet() {
        return { url: 'https://vpstc-document.lifetex.vn/loleaflet/dist/loleaflet.html' };
    }

    @Public()
    @Get('browser')
    @ApiOperation({
        summary: 'Đường dẫn tài nguyên Browser của Document',
        description: 'Chứa các file JavaScript, CSS và assets cần thiết cho trình soạn thảo Document.',
    })
    @ApiResponse({ status: 200, description: 'Tài nguyên browser của Document.' })
    @Redirect('https://vpstc-document.lifetex.vn/browser', 302)
    getBrowser() {
        return { url: 'https://vpstc-document.lifetex.vn/browser' };
    }
}
