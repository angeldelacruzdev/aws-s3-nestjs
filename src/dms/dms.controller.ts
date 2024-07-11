import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { DmsService } from './dms.service';
import { FilesInterceptor } from '@nestjs/platform-express';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('dms')
export class DmsController {
  constructor(private readonly dmsService: DmsService) {}

  @Post('/file')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFile(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
          new MaxFileSizeValidator({
            maxSize: MAX_FILE_SIZE, // 10MB
            message: 'File is too large. Max file size is 10MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    @UploadedFiles()
    files: Array<Express.Multer.File>,
    @Body('isPublic') isPublic: string,
  ) {
    const isPublicBool = isPublic === 'true' ? true : false;

    const resultImage = await this.dmsService.processImages(files);

    console.log(resultImage, isPublicBool);

    return;
  }

  @Get(':key')
  async getFileUrl(@Param('key') key: string) {
    return this.dmsService.getFileUrl(key);
  }

  @Get('/signed-url/:key')
  async getSingedUrl(@Param('key') key: string) {
    return this.dmsService.getPresignedSignedUrl(key);
  }

  @Delete(':key')
  async deleteFile(@Param('key') key: string) {
    return this.dmsService.deleteFile(key);
  }
}
