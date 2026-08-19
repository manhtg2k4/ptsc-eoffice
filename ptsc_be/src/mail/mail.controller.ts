import { BadRequestException, Body, Controller, Logger, Post } from '@nestjs/common';
import { MailService } from './mail.service';

interface TestSendMailBody {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
}

@Controller('email')
export class MailController {
    private readonly logger = new Logger(MailController.name);

    constructor(private readonly mailService: MailService) { }

    // @Post('send_email')
    async send_email(@Body() body: TestSendMailBody) {
        if (!body?.to?.trim()) {
            throw new BadRequestException('Missing required body.to');
        }

        const to = body.to.trim();
        const subject = body.subject?.trim();
        const runtimeHost = process.env.HOSTNAME || 'unknown';
        const connectionResult = await this.mailService.testConnection();
        this.logger.log(
            `[MailController][send_email:connection] runtimeHost=${runtimeHost} to=${to} result=${JSON.stringify(connectionResult)}`,
        );

        const sendResult = await this.mailService.sendDiagnosticMail(
            to,
            subject,
            body.text,
            body.html,
        );
        this.logger.log(
            `[MailController][send_email:result] runtimeHost=${runtimeHost} to=${to} result=${JSON.stringify(sendResult)}`,
        );

        return {
            runtimeHost,
            connection: connectionResult,
            send: sendResult,
        };
    }
}