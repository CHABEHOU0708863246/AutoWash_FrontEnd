export class PaginatedRequest {
  pageNumber: number = 1;
  pageSize: number = 10;

  constructor(init?: Partial<PaginatedRequest>) {
    Object.assign(this, init);
  }
}
