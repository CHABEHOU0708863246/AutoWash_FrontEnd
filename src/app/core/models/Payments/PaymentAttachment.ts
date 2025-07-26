export class PaymentAttachment {
  fileUrl: string = '';
  fileName: string = '';
  fileType: string = '';

  constructor(init?: Partial<PaymentAttachment>) {
    Object.assign(this, init);
  }

  getFileExtension(): string {
    return this.fileName.split('.').pop()?.toLowerCase() || '';
  }

  isImage(): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    return imageExtensions.includes(this.getFileExtension());
  }

  isPdf(): boolean {
    return this.getFileExtension() === 'pdf';
  }
}
