import { Controller, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
    constructor(private readonly appService: AppService) {}
    @Post('authorize')
    async authorizePassword(@Body() requestData: { password: string }) {
        return this.appService.authorizePassword(requestData);
    }
    @Post('download')
    async downloadPayload(@Body() requestData: { transactionId: string, transactionDate: Date }) {
        return this.appService.downloadPayload(requestData);
    }
}
